import {
  AuthOptions,
  DefaultSession,
  DefaultUser,
  getServerSession as nextAuthGetServerSession,
} from 'next-auth';
import { db } from '@/server/db/db';
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
  profile(profile: any) {
    return {
      id: profile.id.toString(),
      name: profile.name || profile.login,
      email: profile.email,
      image: profile.avatar_url,
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
  profile(profile: any) {
    return {
      id: profile.id.toString(),
      name: profile.name || profile.username,
      email: profile.email,
      image: profile.avatar_url,
    };
  },
  style: { logo: '/gitlab.svg', bg: '#8f6a64', text: '#fff' },
  clientId: process.env.JIHULAB_ID!,
  clientSecret: process.env.JIHULAB_SECRET!,
};

declare module 'next-auth' {
  type Plan = 'free' | 'payed';
  interface Session extends DefaultSession {
    user: {
      id: string;
      plan: Plan;
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    plan: Plan;
  }
}

const authOption: AuthOptions = {
  adapter: DrizzleAdapter(db),
  callbacks: {
    async session(params) {
      const { session, user } = params;
      if (session.user && user) {
        session.user.id = user.id;
        session.user.plan = user.plan;
      }

      return session;
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

function getServerSession() {
  return nextAuthGetServerSession(authOption);
}

export { authOption, getServerSession };
