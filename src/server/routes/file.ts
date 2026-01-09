import { z } from 'zod';
import { v4 as uuidV4 } from 'uuid';
import {
  PutObjectCommand,
  PutObjectCommandInput,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { protectedProcedure, router } from '../trpc-middlewares/trpc';
import { db } from '../db/db';
import { files, files_tags } from '../db/schema';
import { v4 as uuid } from 'uuid';
import { and, asc, desc, eq, gt, inArray, isNull, lt, sql } from 'drizzle-orm';
import { filesCanOrderByColumn } from '../db/validate-schema';
import { TRPCError } from '@trpc/server';

const filesOrderByColumnSchema = z
  .object({
    field: filesCanOrderByColumn.keyof(),
    order: z.enum(['asc', 'desc']),
  })
  .optional();

export type FilesOrderByColumn = z.infer<typeof filesOrderByColumnSchema>;

const fileRoutes = router({
  createPresignedUrl: protectedProcedure
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
      if (!app) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'App 不存在',
        });
      }
      if (!app.storage) {
        throw new TRPCError({
          code: 'BAD_REQUEST',
          message: '该 App 尚未配置存储空间，请先配置存储空间',
        });
      }

      if (app.userId !== ctx.session.user.id) {
        throw new TRPCError({ code: 'FORBIDDEN' });
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
      const { session } = ctx;

      const url = new URL(input.path);

      const photo = await db
        .insert(files)
        .values({
          ...input,
          id: uuid(),
          path: url.pathname,
          url: url.toString(),
          userId: session?.user?.id,
          contentType: input.type,
        })
        .returning();

      return photo[0];
    }),

  listFiles: protectedProcedure
    .input(z.object({ appId: z.string() }))
    .query(async ({ ctx, input }) => {
      const result = await db.query.files.findMany({
        orderBy: [desc(files.createdAt)],
        where: (files, { eq }) =>
          and(
            eq(files.userId, ctx.session.user.id),
            eq(files.appId, input.appId)
          ),
      });

      return result;
    }),

  infinityQueryFiles: protectedProcedure
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
    .query(async (ctx) => {
      const {
        cursor,
        limit,
        orderBy = { field: 'createdAt', order: 'desc' },
      } = ctx.input;

      const appFilter = eq(files.appId, ctx.input.appId);
      const deletedFilter = isNull(files.deleteAt);
      const userFilter = eq(files.userId, ctx.ctx.session.user.id);

      const statement = db
        .select()
        .from(files)
        .limit(limit)
        .where(
          cursor
            ? and(
                sql`("files"."created_at", "files"."id") < (${new Date(
                  cursor.createAt
                ).toISOString()}, ${cursor.id})`,
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
    .input(
      z.object({
        id: z.string(),
        appId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const deleteAt = new Date();
      const expirationDate = new Date(
        deleteAt.getTime() + 7 * 24 * 60 * 60 * 1000
      ); // 7天后

      return db
        .update(files)
        .set({
          deleteAt,
          deletedAtExpiration: expirationDate,
        })
        .where(
          and(
            eq(files.id, input.id),
            eq(files.userId, ctx.session.user.id),
            eq(files.appId, input.appId)
          )
        );
    }),

  batchDeleteFiles: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()),
        appId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const deleteAt = new Date();
      const expirationDate = new Date(
        deleteAt.getTime() + 7 * 24 * 60 * 60 * 1000
      ); // 7天后

      const result = await db
        .update(files)
        .set({
          deleteAt,
          deletedAtExpiration: expirationDate,
        })
        .where(
          and(
            eq(files.userId, ctx.session.user.id),
            eq(files.appId, input.appId),
            inArray(files.id, input.ids)
          )
        )
        .returning();

      return { success: true, count: result.length };
    }),

  restoreFile: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        appId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return db
        .update(files)
        .set({
          deleteAt: null,
          deletedAtExpiration: null,
        })
        .where(
          and(
            eq(files.id, input.id),
            eq(files.userId, ctx.session.user.id),
            eq(files.appId, input.appId)
          )
        );
    }),

  batchRestoreFiles: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()),
        appId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await db
        .update(files)
        .set({
          deleteAt: null,
          deletedAtExpiration: null,
        })
        .where(
          and(
            eq(files.userId, ctx.session.user.id),
            eq(files.appId, input.appId),
            inArray(files.id, input.ids)
          )
        )
        .returning();

      return { success: true, count: result.length };
    }),

  getDeletedFiles: protectedProcedure
    .input(
      z.object({
        cursor: z
          .object({
            id: z.string(),
            deleteAt: z.string(),
          })
          .optional(),
        limit: z.number().default(20),
        appId: z.string(),
      })
    )
    .query(async (ctx) => {
      const { cursor, limit, appId } = ctx.input;

      const deletedFilter = sql`${files.deleteAt} IS NOT NULL`;
      const userFilter = eq(files.userId, ctx.ctx.session.user.id);
      const appFilter = eq(files.appId, appId);

      const baseWhere = and(deletedFilter, userFilter, appFilter);

      const statement = db
        .select()
        .from(files)
        .limit(limit)
        .where(
          cursor
            ? and(
                baseWhere,
                sql`("files"."deleted_at", "files"."id") < (${new Date(
                  cursor.deleteAt
                ).toISOString()}, ${cursor.id})`
              )
            : baseWhere
        )
        .orderBy(desc(files.deleteAt));

      const result = await statement;

      return {
        items: result,
        nextCursor:
          result.length > 0
            ? {
                id: result[result.length - 1].id,
                deleteAt: result[result.length - 1].deleteAt!.toISOString(),
              }
            : null,
      };
    }),

  infinityQueryFilesByTag: protectedProcedure
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
        tagId: z.string(),
      })
    )
    .query(async (ctx) => {
      const {
        cursor,
        limit,
        orderBy = { field: 'createdAt', order: 'desc' },
      } = ctx.input;

      const tagFilter = eq(files_tags.tagId, ctx.input.tagId);
      const deletedFilter = isNull(files.deleteAt);
      const userFilter = eq(files.userId, ctx.ctx.session.user.id);
      const appFilter = eq(files.appId, ctx.input.appId);

      const statement = db
        .select({
          id: files.id,
          name: files.name,
          type: files.type,
          createdAt: files.createdAt,
          deleteAt: files.deleteAt,
          path: files.path,
          url: files.url,
          userId: files.userId,
          contentType: files.contentType,
          appId: files.appId,
        })
        .from(files_tags)
        .innerJoin(files, eq(files_tags.fileId, files.id))
        .limit(limit)
        .where(
          cursor
            ? and(
                tagFilter,
                deletedFilter,
                userFilter,
                appFilter,
                sql`("files"."created_at", "files"."id") < (${new Date(
                  cursor.createAt
                ).toISOString()}, ${cursor.id})`
              )
            : and(tagFilter, deletedFilter, userFilter, appFilter)
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
  permanentlyDeleteFile: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        appId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // 检查文件是否属于当前用户和同一应用
      const file = await db.query.files.findFirst({
        where: and(
          eq(files.id, input.id),
          eq(files.userId, ctx.session.user.id),
          eq(files.appId, input.appId)
        ),
      });

      if (!file) {
        throw new TRPCError({
          code: 'NOT_FOUND',
          message: 'File not found',
        });
      }

      // 先删除 S3 中的文件
      // TODO: 实现 S3 文件删除

      // 再从数据库中永久删除
      await db.delete(files).where(eq(files.id, input.id));

      return { success: true };
    }),

  batchPermanentlyDeleteFiles: protectedProcedure
    .input(
      z.object({
        ids: z.array(z.string()),
        appId: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: 批量删除 S3 中的文件

      // 从数据库中永久删除
      const result = await db
        .delete(files)
        .where(
          and(
            eq(files.userId, ctx.session.user.id),
            eq(files.appId, input.appId),
            inArray(files.id, input.ids)
          )
        )
        .returning();

      return { success: true, count: result.length };
    }),
});

export { fileRoutes };
