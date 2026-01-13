import z from 'zod';
import { db } from '../db/db';
import { protectedProcedure, router } from '../trpc-middlewares/trpc';
import { storageConfiguration } from '../db/schema';
import { eq, and, isNull } from 'drizzle-orm';

export const storageRouter = router({
  listStorages: protectedProcedure.query(async ({ ctx }) => {
    return db.query.storageConfiguration.findMany({
      where: (storage, { eq, and, isNull }) =>
        and(eq(storage.userId, ctx.session.user.id), isNull(storage.deleteAt)),
    });
  }),

  createStorage: protectedProcedure
    .input(
      z.object({
        name: z.string().min(3).max(50),
        bucket: z.string(),
        region: z.string(),
        accessKeyId: z.string(),
        secretAccessKey: z.string(),
        apiEndPoint: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { name, ...configuration } = input;

      const result = await db
        .insert(storageConfiguration)
        .values({
          name,
          configuration,
          userId: ctx.session.user.id,
        })
        .returning();

      return result[0];
    }),

  updateStorage: protectedProcedure
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(3).max(50),
        bucket: z.string(),
        region: z.string(),
        accessKeyId: z.string(),
        secretAccessKey: z.string(),
        apiEndPoint: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, name, ...configuration } = input;

      const result = await db
        .update(storageConfiguration)
        .set({
          name,
          configuration,
        })
        .where(
          and(
            eq(storageConfiguration.id, id),
            eq(storageConfiguration.userId, ctx.session.user.id),
            isNull(storageConfiguration.deleteAt)
          )
        )
        .returning();

      return result[0];
    }),
});
