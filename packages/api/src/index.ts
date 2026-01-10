import { OpenRouter } from './open-router-dts';
import { createTRPCProxyClient, httpBatchLink } from '@trpc/client';

const createApiClient = ({
  apiKey,
  signedToken,
  baseUrl = `${process.env.NEXT_PUBLIC_API_URL!}/api/open`,
}: {
  apiKey?: string;
  signedToken?: string;
  baseUrl?: string;
}) => {
  const headers: Record<string, string> = {};

  if (apiKey) {
    headers['api-key'] = apiKey;
  }

  if (signedToken) {
    headers['signed-token'] = signedToken;
  }

  return createTRPCProxyClient<OpenRouter>({
    links: [
      httpBatchLink({
        url: baseUrl,
        headers,
      }),
    ],
  });
};

export { createApiClient };
export type { OpenRouter };
