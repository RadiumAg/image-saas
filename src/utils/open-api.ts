import { OpenRouter } from '@/server/open-router';
import { createTRPCClient, httpBatchLink } from '@trpc/client';

const apiClient = createTRPCClient<OpenRouter>({
  links: [
    httpBatchLink({
      url: `${process.env.NEXT_PUBLIC_API_URL!}/api/trpc`,
    }),
  ],
});

export { apiClient };
export type { OpenRouter };
