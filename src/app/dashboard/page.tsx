'use client';
import { FC } from 'react';
import { Button } from '@/components/ui/button';
import { trpcClientReact, trpcPureClient } from '@/utils/api';
import AWS3 from '@uppy/aws-s3';
import { Uppy } from '@uppy/core';
import { useMemo, use, ReactNode, useEffect } from 'react';
import { usePasteFile } from '@/hooks/user-paste-file';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Skeleton } from '@/components/ui/skeleton';
import { LayoutGrid } from 'lucide-react';

const DashboardSkeleton: FC = () => {
  return (
    <div className="mx-auto mt-10 flex max-w-md flex-col gap-4 p-4">
      <Skeleton className="mx-auto h-6 w-40" />
      <div className="flex flex-col gap-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center gap-3 rounded-lg border bg-card p-4"
          >
            <Skeleton className="h-10 w-10 rounded-md" />
            <Skeleton className="h-4 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default function AppPage(props: PageProps<'/dashboard/apps/[appId]'>) {
  const router = useRouter();
  const { appId } = use(props.params);
  const { data: apps, isPending } = trpcClientReact.apps.listApps.useQuery(
    undefined,
    {
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }
  );

  const currentApp = apps?.find(app => app.id === appId);

  const uppy = useMemo(() => {
    const uppy = new Uppy();

    uppy.use(AWS3, {
      shouldUseMultipart: false,
      getUploadParameters: file => {
        return trpcPureClient.file.createPresignedUrl.mutate({
          filename: file.data instanceof File ? file.data.name : '',
          contentType: file.data.type || '',
          size: file.size || 0,
          appId,
        });
      },
    });

    return uppy;
  }, [appId]);

  usePasteFile({
    onFilePaste(files) {
      uppy.addFiles(
        files.map(file => {
          return { data: file, name: file.name };
        })
      );
    },
  });

  useEffect(() => {
    if (!isPending && (!apps || apps.length === 0)) {
      router.push('/dashboard/apps/new');
    }
  }, [isPending, apps, router]);

  let children: ReactNode;

  if (isPending || !apps || apps.length === 0) {
    return <DashboardSkeleton />;
  }

  if (currentApp == null) {
    children = (
      <div className="mx-auto mt-10 flex max-w-sm flex-col items-center gap-4 rounded-lg border bg-card p-6">
        <h2 className="text-lg font-semibold tracking-tight">Select an App</h2>
        <div className="flex w-full flex-col gap-2">
          {apps?.map(app => (
            <Button
              key={app.id}
              asChild
              variant="outline"
              className="w-full cursor-pointer justify-start gap-2 transition-colors duration-200"
            >
              <Link href={`/dashboard/apps/${app.id}`}>
                <LayoutGrid className="h-4 w-4 text-primary" />
                {app.name}
              </Link>
            </Button>
          ))}
        </div>
      </div>
    );
  }

  return children;
}
