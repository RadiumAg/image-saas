import { db } from '../db/db';
import { protectedProcedure, router } from '../trpc-middlewares/trpc';

/** 按需付费配额配置 */
export const PLAN_CONFIG = {
  free: {
    label: '免费版',
    maxFiles: 100,
    maxStorage: 1024 * 1024 * 1024, // 1GB (字节)
    features: ['基础上传', 'AI标签识别', '标签管理'],
  },
  payed: {
    label: '付费版',
    maxFiles: Infinity,
    maxStorage: Infinity,
    features: ['无限上传', 'AI标签识别', '标签管理', 'AI相似图片推荐', 'API访问'],
  },
} as const;

export type PlanType = keyof typeof PLAN_CONFIG;

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
  /** 获取套餐 + 用量统计 */
  getPlanWithUsage: protectedProcedure.query(async ({ ctx }) => {
    const user = await db.query.users.findFirst({
      where: (users, { eq }) => eq(users.id, ctx.session.user.id),
    });

    if (!user) {
      return null;
    }

    const plan = (user.plan || 'free') as PlanType;
    const config = PLAN_CONFIG[plan];

    return {
      plan,
      label: config.label,
      usageCount: user.usageCount ?? 0,
      usageStorage: user.usageStorage ?? 0,
      maxFiles: config.maxFiles,
      maxStorage: config.maxStorage,
      features: config.features,
    };
  }),
});
