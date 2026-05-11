import { z } from 'zod';
import { v4 as uuidV4 } from 'uuid';
import {
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import {
  protectedProcedure,
  router,
  withAppProcedure,
} from '../trpc-middlewares/trpc';
import { db } from '../db/db';
import { files } from '../db/schema';
import { v4 as uuid } from 'uuid';
import { and, asc, desc, eq, isNull, sql } from 'drizzle-orm';
import { filesCanOrderByColumn } from '../db/validate-schema';
import { TRPCError } from '@trpc/server';
import { users } from '../db/schema';
import { PLAN_CONFIG, type PlanType } from './user';

const filesOrderByColumnSchema = z
  .object({
    field: filesCanOrderByColumn.keyof(),
    order: z.enum(['asc', 'desc']),
  })
  .optional();

export type FilesOrderByColumn = z.infer<typeof filesOrderByColumnSchema>;

const fileOpenRoutes = router({
  createPresignedUrl: withAppProcedure
    .input(
      z.object({
        filename: z.string(),
        contentType: z.string(),
        size: z.number(),
        appId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const date = new Date();
      const isoString = date.toISOString();
      const dateString = isoString.split('T')[0];
      const app = await db.query.apps.findFirst({
        where: (apps, { eq }) => eq(apps.id, input.appId),
        with: {
          storage: true,
        },
      });
      if (!app || !app.storage) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
        });
      }

      if (app.userId !== ctx.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
      }

      // 按需付费配额校验
      const planUser = await db.query.users.findFirst({
        where: (users, { eq }) => eq(users.id, ctx.user.id),
      });
      if (planUser) {
        const plan = (planUser.plan || 'free') as PlanType;
        const config = PLAN_CONFIG[plan];
        const currentCount = planUser.usageCount ?? 0;
        if (currentCount >= config.maxFiles) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `上传限制已达上限（${config.maxFiles}个文件）。请升级套餐以继续使用。`,
          });
        }
        const currentStorage = planUser.usageStorage ?? 0;
        if (currentStorage + input.size > config.maxStorage) {
          throw new TRPCError({
            code: 'FORBIDDEN',
            message: `存储空间不足。当前已用 ${(currentStorage / 1024 / 1024).toFixed(1)}MB，请升级套餐。`,
          });
        }
      }

      const storage = app.storage;

      const params: PutObjectCommandInput = {
        Bucket: storage.configuration.bucket,
        Key: `${dateString}/${input.filename}-${uuidV4()}`,
        ContentType: input.contentType,
        ContentLength: input.size,
      };

      const command = new PutObjectCommand(params);

      const s3Client = new S3Client({
        region: storage.configuration.region,
        endpoint: storage.configuration.apiEndPoint,
        credentials: {
          accessKeyId: storage.configuration.accessKeyId,
          secretAccessKey: storage.configuration.secretAccessKey,
        },
      });

      const url = await getSignedUrl(s3Client, command, {
        expiresIn: 60 * 2,
      });

      return {
        url,
        method: 'PUT' as const,
      };
    }),
  saveFile: protectedProcedure
    .input(
      z.object({
        name: z.string(),
        path: z.string(),
        type: z.string(),
        appId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const url = new URL(input.path);
      const photo = await db
        .insert(files)
        .values({
          ...input,
          id: uuid(),
          path: url.pathname,
          url: url.toString(),
          userId: ctx?.session?.user?.id,
          contentType: input.type,
        })
        .returning();

      // 上传成功后更新用户用量统计
      await db
        .update(users)
        .set({
          usageCount: sql`COALESCE(${users.usageCount}, 0) + 1`,
        })
        .where(eq(users.id, ctx.session.user.id));

      return photo[0];
    }),

  listFiles: withAppProcedure
    .input(z.object({ appId: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await db.query.files.findMany({
        orderBy: [desc(files.createdAt)],
        where: (files, { eq }) =>
          and(eq(files.userId, ctx.user.id), eq(files.appId, input.appId)),
      });

      return result;
    }),

  infinityQueryFiles: withAppProcedure
    .input(
      z.object({
        cursor: z
          .object({
            id: z.string(),
            createAt: z.string(),
          })
          .optional(),
        limit: z.number().default(10),
        orderBy: filesOrderByColumnSchema,
        appId: z.string(),
      })
    )
    .query(async ctx => {
      const {
        cursor,
        limit,
        orderBy = { field: 'createdAt', order: 'desc' },
      } = ctx.input;

      const appFilter = eq(files.appId, ctx.input.appId);
      const deletedFilter = isNull(files.deleteAt);
      const userFilter = eq(files.userId, ctx.ctx.user.id);

      const statement = db
        .select()
        .from(files)
        .limit(limit)
        .where(
          cursor
            ? and(
                sql`("files"."created_at", "files"."id") < (${new Date(cursor.createAt).toISOString()}, ${cursor.id})`,
                deletedFilter,
                userFilter,
                appFilter
              )
            : and(deletedFilter, userFilter, appFilter)
        );

      statement.orderBy(
        orderBy.order === 'asc'
          ? asc(files[orderBy.field])
          : desc(files[orderBy.field])
      );

      const result = await statement;

      return {
        items: result,
        nextCursor:
          result.length > 0
            ? {
                id: result[result.length - 1].id,
                createAt: result[result.length - 1].createdAt!,
              }
            : null,
      };
    }),

  deleteFile: protectedProcedure
    .input(z.string())
    .mutation(async ({ ctx, input }) => {
      return db
        .update(files)
        .set({ deleteAt: new Date() })
        .where(eq(files.id, input));
    }),
});

export { fileOpenRoutes };
