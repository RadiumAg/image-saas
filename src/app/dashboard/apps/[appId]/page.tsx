'use client';
import { Button } from '@/components/ui/Button';
import Dropzone from '@/components/feature/Dropzone';
import { UploadButton } from '@/components/feature/UploadButton';
import { cn } from '@/lib/utils';
import { trpcClientReact, trpcPureClient } from '@/utils/api';
import AWS3 from '@uppy/aws-s3';
import { Uppy } from '@uppy/core';
import { useMemo, use, useState, ReactNode, ReactElement } from 'react';
import { usePasteFile } from '@/hooks/user-paste-file';
import UploadPreview from '@/components/feature/UploadPreview';
import FileList from '@/components/feature/FileList';
import { FilesOrderByColumn } from '@/server/routes/file';
import { MoveUp, MoveDown, Settings, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/Tabs';
import { TabsContent } from '@radix-ui/react-tabs';
import PeopleList from './PeopleList';
import EventPage from './EventPage';
import LocationPage from './LocationPage';

type CategoryType = 'person' | 'location' | 'event';

interface CategoryTag {
  id: string;
  name: string;
  categoryType: CategoryType;
  count: number;
}

interface AppPageProps {
  params: Promise<{ appId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default function AppPage(props: AppPageProps) {
  const params = use(props.params);
  const { appId } = params;
  const { data: apps, isPending } = trpcClientReact.apps.listApps.useQuery(
    undefined,
    {
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
    }
  );
  const currentApp = apps?.find((app) => app.id === appId);

  // 获取按分类分组的标签
  const { data: categoryTags = [], isLoading: tagsLoading } =
    trpcClientReact.tags.getTagsByCategory.useQuery(
      { appId },
      {
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
      }
    );

  // 按分类类型分组标签
  const groupedTags = useMemo(() => {
    const groups = {
      person: categoryTags.filter((tag) => tag.categoryType === 'person'),
      location: categoryTags.filter((tag) => tag.categoryType === 'location'),
      event: categoryTags.filter((tag) => tag.categoryType === 'event'),
    };
    return groups;
  }, [categoryTags]);

  const uppy = useMemo(() => {
    const uppy = new Uppy();

    uppy.use(AWS3, {
      shouldUseMultipart: false,
      getUploadParameters: (file) => {
        return trpcPureClient.file.createPresignedUrl.mutate({
          filename: file.data instanceof File ? file.data.name : '',
          contentType: file.data.type || '',
          size: file.size || 0,
          appId,
        });
      },
    });

    return uppy;
  }, []);

  usePasteFile({
    onFilePaste(files) {
      uppy.addFiles(
        files.map((file) => {
          return { data: file, name: file.name };
        })
      );
    },
  });

  const [orderBy, setOrderBy] = useState<
    Exclude<FilesOrderByColumn, undefined>
  >({
    field: 'createdAt',
    order: 'desc',
  });

  let children: ReactNode;

  if (isPending) {
    children = (
      <div className="flex justify-center items-center">Loading...</div>
    );
  } else if (currentApp == null) {
    children = (
      <div className="flex flex-col mt-10 p-4 border rounded-md max-w-48 mx-auto items-center">
        <p className="text-lg">App not found</p>
        <p className="text-sm">Chose another one</p>
        <div className="flex flex-col agp-4 items-center">
          {apps?.map((app) => (
            <Button key={app.id} asChild variant="link">
              <Link href={`/dashboard/apps/${app.id}`}>{app.name}</Link>
            </Button>
          ))}
        </div>
      </div>
    );
  } else {
    children = (
      <div className="h-full">
        <div className="container mx-auto flex justify-between items-center h-[60px]">
          {/* <Button
            onClick={() => {
              setOrderBy((current) => ({
                ...current,
                order: current.order === 'desc' ? 'asc' : 'desc',
              }));
            }}
          >
            Created At {orderBy.order === 'desc' ? <MoveUp /> : <MoveDown />}
          </Button> */}

          <div className="flex items-center gap-2 ml-auto">
            <Button asChild variant="outline">
              <Link href={`/dashboard/apps/${appId}/trash`}>
                <Trash2 className="h-4 w-4" />
              </Link>
            </Button>

            <UploadButton uppy={uppy}></UploadButton>

            <Button asChild>
              <Link href="/dashboard/apps/new">new app</Link>
            </Button>

            <Button asChild>
              <Link href={`/dashboard/apps/${appId}/setting/storage`}>
                <Settings />
              </Link>
            </Button>
          </div>
        </div>

        <div className="container mx-auto mb-5">
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">全部</TabsTrigger>
              {/* 动态生成人物分类的标签 */}
              {groupedTags.person.map((tag) => (
                <TabsTrigger key={tag.id} value={`person-${tag.id}`}>
                  {tag.name} ({tag.count})
                </TabsTrigger>
              ))}
              {/* 动态生成地点分类的标签 */}
              {groupedTags.location.map((tag) => (
                <TabsTrigger key={tag.id} value={`location-${tag.id}`}>
                  {tag.name} ({tag.count})
                </TabsTrigger>
              ))}
              {/* 动态生成事务分类的标签 */}
              {groupedTags.event.map((tag) => (
                <TabsTrigger key={tag.id} value={`event-${tag.id}`}>
                  {tag.name} ({tag.count})
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all">
              <Dropzone
                uppy={uppy}
                className="mt-10 w-full h-[calc(100%-60px)]"
              >
                {(draggling) => {
                  return (
                    <div
                      className={cn(
                        'flex flex-wrap gap-4 relative h-full container mx-auto',
                        draggling && 'border border-dashed'
                      )}
                    >
                      {draggling && (
                        <div className="absolute inset-0 bg-secondary/50 z-10 flex justify-center items-center">
                          Drop File Here To Upload
                        </div>
                      )}

                      <FileList appId={appId} orderBy={orderBy} uppy={uppy} />
                    </div>
                  );
                }}
              </Dropzone>
            </TabsContent>

            {categoryTags.map((tag) => {
              let component: ReactElement | null = null;

              switch (tag.categoryType) {
                case 'person':
                  component = <PeopleList appId={appId} tagId={tag.id} />;
                  break;

                case 'event':
                  component = <EventPage appId={appId} tagId={tag.id} />;
                  break;

                case 'location':
                  component = <LocationPage appId={appId} tagId={tag.id} />;
                  break;
              }

              return (
                <TabsContent
                  key={tag.id}
                  value={`${tag.categoryType}-${tag.id}`}
                >
                  {component}
                </TabsContent>
              );
            })}
          </Tabs>
        </div>

        <UploadPreview uppy={uppy} />
      </div>
    );
  }

  return children;
}
