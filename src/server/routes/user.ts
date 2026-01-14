import { db } from '../db/db';
import { protectedProcedure, router } from '../trpc-middlewares/trpc';
import { plans } from '../db/schema';

export const planRouter = router({
  getPlan: protectedProcedure.query(async ({ ctx }) => {
    // 从 users 表获取用户的 plan
    const user = await db.query.users.findFirst({
      where: (users, { eq, and }) => {
        return and(eq(users.id, ctx.session.user.id));
      },
    });

    if (!user || !user.planId) {
      return { plan: null };
    }

    // 根据 planId 获取 plan 信息
    const plan = await db.query.plans.findFirst({
      where: (plans, { eq }) => eq(plans.id, user.planId),
    });

    return plan;
  }),
});
