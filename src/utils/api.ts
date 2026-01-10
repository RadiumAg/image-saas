import { AppRouter } from '@/server/trpc-middlewares/router';
import { httpBatchLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';

const trpcClientReact = createTRPCReact<AppRouter>({});

const trpcPureClient = trpcClientReact.createClient({
  links: [
    httpBatchLink({
      url: `${process.env.NEXT_PUBLIC_API_URL!}/api/trpc`,
    }),
  ],
});

export { trpcClientReact, trpcPureClient };
export type { AppRouter };
