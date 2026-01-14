import { apiKeysRouter } from '../routes/api-keys';
import { appsRouter } from '../routes/app';
import { fileRoutes } from '../routes/file';
import { storageRouter } from '../routes/storages';
import { tagsRouter } from '../routes/tags';
import { planRouter } from '../routes/user';
import { router } from './trpc';

const appRouter = router({
  file: fileRoutes,
  apps: appsRouter,
  tags: tagsRouter,
  storages: storageRouter,
  apiKeys: apiKeysRouter,
  plan: planRouter,
});

export { appRouter };
export type AppRouter = typeof appRouter;
