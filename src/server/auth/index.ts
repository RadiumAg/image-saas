import {
  AuthOptions,
  DefaultSession,
  getServerSession as nextAuthGetServerSession,
} from 'next-auth';
import { db } from '@/server/db/db';
import { users } from '@/server/db/schema';
import GitHubProvider from 'next-auth/providers/github';
import { DrizzleAdapter } from '@auth/drizzle-adapter';

// Gitee Provider
const GiteeProvider = {
  id: 'gitee',
  name: 'Gitee',
  type: 'oauth' as const,
  authorization: {
    url: 'https://gitee.com/oauth/authorize',
    params: { scope: undefined, state: undefined },
  },
  token: 'https://gitee.com/oauth/token',
  userinfo: 'https://gitee.com/api/v5/user',
  profile(profile: unknown) {
    const typedProfile = profile as {
      id: number | string;
      name?: string;
      login?: string;
      email?: string;
      avatar_url?: string;
    };
    return {
      id: typedProfile.id.toString(),
      name: typedProfile.name || typedProfile.login,
      email: typedProfile.email,
      image: typedProfile.avatar_url,
    };
  },
  style: {
    logo: 'https://th.bing.com/th/id/ODF.KCStyvubJszELPE98QcMBA?w=32&h=32&qlt=90&pcl=fffffc&o=6&pid=1.2',
    bg: 'red',
    text: '#fff',
  },
  clientId: process.env.GITEE_ID!,
  clientSecret: process.env.GITEE_SECRET!,
};

// JiHuLab Provider
const JiHuLabProvider = {
  id: 'jihulab',
  name: 'JiHuLab',
  type: 'oauth' as const,
  authorization: {
    url: 'https://jihulab.com/oauth/authorize',
    params: { grant_type: 'authorization_code' },
  },
  token: 'https://jihulab.com/oauth/token',
  userinfo: 'https://jihulab.com/api/v4/user',
  profile(profile: unknown) {
    const typedProfile = profile as {
      id: number | string;
      name?: string;
      username?: string;
      email?: string;
      avatar_url?: string;
    };
    return {
      id: typedProfile.id.toString(),
      name: typedProfile.name || typedProfile.username,
      email: typedProfile.email,
      image: typedProfile.avatar_url,
    };
  },
  style: { logo: '/gitlab.svg', bg: '#8f6a64', text: '#fff' },
  clientId: process.env.JIHULAB_ID!,
  clientSecret: process.env.JIHULAB_SECRET!,
};

// SKIP_LOGIN 模式下的默认管理员用户
const getAdminUser = async () => {
  if (process.env.SKIP_LOGIN !== 'true') {
    return null;
  }

  // 查找或创建默认 admin 用户
  const adminEmail = 'admin@example.com';
  const adminName = 'Admin';

  let user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.email, adminEmail),
  });

  // 如果用户不存在，则创建
  if (!user) {
    const result = await db
      .insert(users)
      .values({
        name: adminName,
        email: adminEmail,
        emailVerified: new Date(),
        plan: 'payed',
      })
      .returning();
    user = result[0];
  }

  if (!user) {
    throw new Error('Failed to create admin user');
  }

  return {
    id: user.id,
    name: user.name || adminName,
    email: user.email || adminEmail,
    image: null,
    plan: user.plan || 'payed',
  };
};

declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
    } & DefaultSession['user'];
  }
}

const authOption: AuthOptions = {
  adapter: DrizzleAdapter(db),
  callbacks: {
    async session(params) {
      const { session, user } = params;
      if (session.user && user) {
        session.user.id = user.id;
      }

      return session;
    },
    async signIn({ user }) {
      // 在 SKIP_LOGIN 模式下允许所有登录
      if (process.env.SKIP_LOGIN === 'true') {
        return true;
      }
      return true; // 默认允许登录
    },
  },
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    GiteeProvider,
    JiHuLabProvider,
  ],
};

// 扩展 getServerSession 以支持 SKIP_LOGIN 模式
async function getServerSession() {
  // 如果启用了 SKIP_LOGIN，返回默认管理员会话
  if (process.env.SKIP_LOGIN === 'true') {
    const adminUser = await getAdminUser();
    if (adminUser) {
      return {
        user: {
          id: adminUser.id,
          name: adminUser.name,
          email: adminUser.email,
          image: adminUser.image,
          plan: adminUser.plan,
        },
        expires: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30天过期
      };
    }
  }

  return nextAuthGetServerSession(authOption);
}

export { authOption, getServerSession };
