import { apiKeysRouter } from '../routes/api-keys';
import { appsRouter } from '../routes/app';
import { fileRoutes } from '../routes/file';
import { storageRouter } from '../routes/storages';
import { tagsRouter } from '../routes/tags';
import { router } from './trpc';

const appRouter = router({
  file: fileRoutes,
  apps: appsRouter,
  tags: tagsRouter,
  storages: storageRouter,
  apiKeys: apiKeysRouter,
});

export { appRouter };
export type AppRouter = typeof appRouter;
