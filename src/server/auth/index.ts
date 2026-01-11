import {
  AuthOptions,
  DefaultSession,
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
  clientId: process.env.JIHULAB_ID!,
  clientSecret: process.env.JIHULAB_SECRET!,
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
  },
  providers: [
    GitHubProvider({
      clientId: process.env.GITHUB_ID!,
      clientSecret: process.env.GITHUB_SECRET!,
    }),
    JiHuLabProvider,
    GiteeProvider,
  ],
};

function getServerSession() {
  return nextAuthGetServerSession(authOption);
}

export { authOption, getServerSession };
