'use client';
import { Button } from '@/components/ui/button';
import Dropzone from '@/components/feature/dropzone';
import { UploadButton } from '@/components/feature/upload-button';
import { cn } from '@/lib/utils';
import { trpcClientReact, trpcPureClient } from '@/utils/api';
import AWS3 from '@uppy/aws-s3';
import { Uppy } from '@uppy/core';
import { useMemo, use, useState, ReactNode } from 'react';
import { usePasteFile } from '@/hooks/user-paste-file';
import UploadPreview from '@/components/feature/upload-preview';
import FileList from '@/components/feature/file-list';
import { FilesOrderByColumn } from '@/server/routes/file';
import { Settings, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TabsContent } from '@radix-ui/react-tabs';
import TagFileList from './tag-file-list';
import SearchBar, { SearchFilters } from '@/components/feature/search-bar';

export default function AppPage(props: PageProps<'/dashboard/apps/[appId]'>) {
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
  const currentApp = apps?.find(app => app.id === appId);

  // 获取按分类分组的标签
  const { data: categoryTags = [] } =
    trpcClientReact.tags.getTagsByCategory.useQuery(
      { appId },
      {
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
      }
    );

  // 按 categoryType 分组标签（动态支持所有分类类型）
  const groupedTags = useMemo(() => {
    const groups: Record<string, typeof categoryTags> = {};
    categoryTags.forEach(tag => {
      if (!groups[tag.categoryType]) {
        groups[tag.categoryType] = [];
      }
      groups[tag.categoryType].push(tag);
    });
    return groups;
  }, [categoryTags]);

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

  const [orderBy, setOrderBy] = useState<
    Exclude<FilesOrderByColumn, undefined>
  >({
    field: 'createdAt',
    order: 'desc',
  });

  const [searchFilters, setSearchFilters] = useState<SearchFilters>({});

  let children: ReactNode;

  if (isPending) {
    children = (
      <div className="flex justify-center items-center py-20">
        <div className="flex items-center gap-3 text-muted-foreground">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-current border-t-transparent" />
          <span className="text-sm">加载中...</span>
        </div>
      </div>
    );
  } else if (currentApp == null) {
    children = (
      <div className="flex flex-col mt-10 p-6 border rounded-xl max-w-xs mx-auto items-center gap-3 bg-card shadow-sm">
        <p className="text-lg font-semibold">未找到应用</p>
        <p className="text-sm text-muted-foreground">请选择其他应用</p>
        <div className="flex flex-col gap-1 items-center w-full">
          {apps?.map(app => (
            <Button key={app.id} asChild variant="link" className="cursor-pointer">
              <Link href={`/dashboard/apps/${app.id}`}>{app.name}</Link>
            </Button>
          ))}
        </div>
      </div>
    );
  } else {
    children = (
      <div className="h-full">
        {/* 搜索栏 */}
        <div className="container mx-auto py-4">
          <SearchBar onSearch={setSearchFilters} />
        </div>

        <div className="container mx-auto flex justify-between items-center h-[60px]">
          <div className="flex items-center gap-2 ml-auto">
            <Button asChild variant="outline" size="icon" className="cursor-pointer transition-colors duration-200 hover:bg-destructive/10 hover:text-destructive hover:border-destructive/30">
              <Link href={`/dashboard/apps/${appId}/trash`}>
                <Trash2 className="h-4 w-4" />
              </Link>
            </Button>

            <UploadButton uppy={uppy} />

            <Button asChild variant="outline" className="cursor-pointer transition-colors duration-200">
              <Link href="/dashboard/apps/new">新建应用</Link>
            </Button>

            <Button asChild variant="outline" size="icon" className="cursor-pointer transition-colors duration-200">
              <Link href={`/dashboard/apps/${appId}/setting/storage`}>
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <div className="container mx-auto mb-5">
          <Tabs defaultValue="all">
            <TabsList>
              <TabsTrigger value="all">全部</TabsTrigger>
              {/* 动态生成所有分类类型的标签 */}
              {categoryTags.map(tag => (
                <TabsTrigger
                  key={tag.id}
                  value={`${tag.categoryType}-${tag.id}`}
                >
                  {tag.name} ({tag.count})
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all">
              <Dropzone
                uppy={uppy}
                className="mt-6 w-full h-[calc(100%-60px)]"
              >
                {draggling => {
                  return (
                    <div
                      className={cn(
                        'flex flex-wrap gap-4 relative h-full container mx-auto rounded-xl transition-all duration-200',
                        draggling && 'border-2 border-dashed border-primary/40 bg-primary/5'
                      )}
                    >
                      {draggling && (
                        <div className="absolute inset-0 bg-primary/5 backdrop-blur-sm z-10 flex flex-col justify-center items-center rounded-xl">
                          <svg
                            className="h-12 w-12 text-primary/60 mb-3"
                            xmlns="http://www.w3.org/2000/svg"
                            fill="none"
                            viewBox="0 0 24 24"
                            strokeWidth={1.5}
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5"
                            />
                          </svg>
                          <p className="text-lg font-medium text-primary/80">释放文件以上传</p>
                          <p className="text-sm text-muted-foreground mt-1">支持图片和文件</p>
                        </div>
                      )}

                      <FileList
                        appId={appId}
                        orderBy={orderBy}
                        uppy={uppy}
                        searchFilters={searchFilters}
                      />
                    </div>
                  );
                }}
              </Dropzone>
            </TabsContent>

            {/* 动态渲染所有分类标签的内容 */}
            {categoryTags.map(tag => (
              <TabsContent
                key={tag.id}
                value={`${tag.categoryType}-${tag.id}`}
              >
                <TagFileList
                  searchFilters={searchFilters}
                  uppy={uppy}
                  appId={appId}
                  tagId={tag.id}
                  variant={tag.categoryType === 'person' ? 'person' : 'default'}
                />
              </TabsContent>
            ))}
          </Tabs>
        </div>

        <UploadPreview uppy={uppy} />
      </div>
    );
  }

  return children;
}
