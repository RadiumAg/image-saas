import { OpenRouter } from '@/server/open-router';
import { createTRPCClient, httpBatchLink } from '@trpc/client';

const apiClient = createTRPCClient<OpenRouter>({
  links: [
    httpBatchLink({
      url: 'http://localhost:3000/api/trpc',
    }),
  ],
});

export { apiClient };
export type { OpenRouter };
