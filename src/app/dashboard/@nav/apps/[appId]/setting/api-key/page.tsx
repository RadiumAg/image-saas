'use client';
import { use } from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { trpcClientReact } from '@/utils/api';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default function AppDashboardNav(
  props: PageProps<'/dashboard/apps/[appId]/setting/api-key'>
) {
  const { appId } = use(props.params);
  const { data: apps, isPending } = trpcClientReact.apps.listApps.useQuery();
  const currentApp = apps?.find((app) => app.id === appId);

  return (
    <div className="flex justify-between items-center">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost">
            {isPending ? 'Loading...' : currentApp ? currentApp.name : '...'}
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent>
          {apps?.map((app) => {
            return (
              <DropdownMenuItem disabled={app.id === appId} key={app.id}>
                <Link className="w-full" href={`/dashboard/apps/${app.id}`}>
                  {app.name}
                </Link>
              </DropdownMenuItem>
            );
          })}
        </DropdownMenuContent>
      </DropdownMenu>

      <div>{`/ storage`}</div>
    </div>
  );
}
