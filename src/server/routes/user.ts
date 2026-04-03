import { db } from '../db/db';
import { protectedProcedure, router } from '../trpc-middlewares/trpc';

export const planRouter = router({
  getPlan: protectedProcedure.query(async ({ ctx }) => {
    // 从 users 表获取用户的 plan
    const user = await db.query.users.findFirst({
      where: (users, { eq, and }) => {
        return and(eq(users.id, ctx.session.user.id));
      },
    });

    if (!user || !user.plan) {
      return '';
    }

    return user.plan;
  }),
});
