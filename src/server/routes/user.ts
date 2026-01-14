import { db } from '../db/db';
import { protectedProcedure, router } from '../trpc-middlewares/trpc';

export const planRouter = router({
  getPlan: protectedProcedure.query(async ({ ctx }) => {
    const result = await db.query.users.findFirst({
      where: (users, { eq, and }) => {
        return and(eq(users.id, ctx.session.user.id));
      },
      columns: { plan: true },
    });

    return result;
  }),
});
