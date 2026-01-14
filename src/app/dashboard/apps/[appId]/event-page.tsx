'use client';
import { trpcClientReact, trpcPureClient } from '@/utils/api';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState, useMemo, useEffect } from 'react';
import InfiniteScroll from '@/components/feature/infinite-scroll';
import { RemoteFileItemWithTags } from '@/components/feature/file-item';
import {
  DeleteFileAction,
  CopyUrl,
  PreView,
} from '@/components/feature/file-item-action';
import Uppy, { Meta, UppyFile } from '@uppy/core';
import Dropzone from '@/components/feature/dropzone';
import { cn } from '@/lib/utils';
import { SearchFilters } from '@/components/feature/search-bar';

type Props = {
  appId: string;
  tagId?: string;
  uppy: Uppy;
  searchFilters: SearchFilters;
};

const EventPage: React.FC<Props> = props => {
  const { appId, tagId, uppy, searchFilters } = props;

  const query = useMemo(
    () => ({
      limit: 10,
      appId,
      tagId,
      search: searchFilters,
    }),
    [appId, tagId, searchFilters]
  );

  const {
    data: infinityQueryData,
    isPending,
    fetchNextPage,
  } = trpcClientReact.file.infinityQueryFilesByTag.useInfiniteQuery(query, {
    getNextPageParam: resp => resp.nextCursor,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
  });

  const utils = trpcClientReact.useUtils();

  // 上传成功后刷新数据
  useEffect(() => {
    const handler: (
      file: UppyFile<Meta, Record<string, never>> | undefined,
      response: {
        body?: Record<string, never> | undefined;
        status: number;
        bytesUploaded?: number;
        uploadURL?: string;
      }
    ) => void = (file, resp) => {
      if (file) {
        trpcPureClient.file.saveFile
          .mutate({
            name: file.data instanceof File ? file.data.name : 'test',
            path: resp.uploadURL ?? '',
            type: file.data.type,
            appId,
          })
          .then(async savedFile => {
            // 对图片文件进行识别
            if (file.data.type && file.data.type.startsWith('image')) {
              try {
                await trpcPureClient.tags.recognizeImageTags.mutate({
                  fileId: savedFile.id,
                });

                // AI识别成功后刷新tags
                utils.tags.getTagsByCategory.refetch({ appId });
              } catch (error) {
                console.error('AI识别失败:', error);
              }
            }

            // 直接更新缓存数据
            utils.file.infinityQueryFilesByTag.setInfiniteData(query, prev => {
              if (!prev) return prev;

              return {
                ...prev,
                pages: prev.pages.map((page, index) => {
                  if (index === 0) {
                    return {
                      ...page,
                      items: [savedFile, ...page.items],
                    };
                  }
                  return page;
                }),
                pageParams: prev.pageParams,
              };
            });
          });
      }
    };

    const completeHandler = () => {
      utils.file.infinityQueryFilesByTag.refetch(query);
    };

    uppy.on('upload-success', handler);
    uppy.on('complete', completeHandler);

    return () => {
      uppy.off('upload-success', handler);
      uppy.off('complete', completeHandler);
    };
  }, [uppy, utils, appId, query]);

  const handleFileDelete = (id: string) => {
    utils.file.infinityQueryFilesByTag.setInfiniteData(query, prev => {
      if (!prev) return prev;

      return {
        ...prev,
        pages: prev.pages.map(page => ({
          ...page,
          items: page.items.filter(file => file.id !== id),
        })),
        pageParams: prev.pageParams,
      };
    });
  };

  // 展开状态管理
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    default: true,
  });

  const toggleGroup = (key: string) => {
    setOpenGroups(prev => ({
      ...prev,
      [key]: prev[key] === undefined ? false : !prev[key],
    }));
  };

  // 按时间分组数据
  const groupedData = useMemo(() => {
    if (!infinityQueryData?.pages) return [];

    const allItems = infinityQueryData?.pages.flatMap(page => page.items);

    const groups: Record<string, typeof allItems> = {};

    allItems.forEach(item => {
      const date = new Date(item.createdAt!);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let key = '';

      if (date.toDateString() === today.toDateString()) {
        key = '今天';
      } else if (date.toDateString() === yesterday.toDateString()) {
        key = '昨天';
      } else if (date.getFullYear() === today.getFullYear()) {
        key = `${date.getMonth() + 1}月${date.getDate()}日`;
      } else {
        key = `${date.getFullYear()}年${
          date.getMonth() + 1
        }月${date.getDate()}日`;
      }

      if (!groups[key]) {
        groups[key] = [];
      }
      groups[key].push(item);
    });

    return Object.entries(groups).map(([key, items]) => ({
      key,
      items,
      count: items.length,
    }));
  }, [infinityQueryData?.pages]);

  // 如果没有 tagId，不渲染
  if (!tagId) {
    return <div className="container mx-auto mt-10">请选择一个标签</div>;
  }

  if (isPending) {
    return (
      <div className="container mx-auto mt-10 flex justify-center items-center">
        Loading...
      </div>
    );
  }

  if (groupedData.length === 0) {
    return (
      <div className="container mx-auto mt-10">
        <Dropzone uppy={uppy} className="w-full h-[calc(100vh-200px)]">
          {draggling => {
            return (
              <div
                className={cn(
                  'flex flex-wrap gap-4 relative h-full',
                  draggling && 'border border-dashed'
                )}
              >
                {draggling && (
                  <div className="absolute inset-0 bg-secondary/50 z-10 flex justify-center items-center">
                    Drop File Here To Upload
                  </div>
                )}
                <div className="w-full text-center text-muted-foreground py-20">
                  暂无图片
                </div>
              </div>
            );
          }}
        </Dropzone>
      </div>
    );
  }

  return (
    <div className="container mx-auto mt-10">
      <Dropzone uppy={uppy} className="w-full">
        {draggling => {
          return (
            <div
              className={cn('relative', draggling && 'border border-dashed')}
            >
              {draggling && (
                <div className="absolute inset-0 bg-secondary/50 z-10 flex justify-center items-center">
                  Drop File Here To Upload
                </div>
              )}
              <InfiniteScroll
                loadMore={() => fetchNextPage()}
                hasMore={
                  infinityQueryData?.pages?.[infinityQueryData.pages.length - 1]
                    ?.nextCursor !== undefined
                }
                isLoading={isPending}
              >
                <div className="space-y-6">
                  {groupedData.map(group => (
                    <Collapsible
                      key={group.key}
                      open={openGroups[group.key] ?? true}
                      onOpenChange={() => toggleGroup(group.key)}
                    >
                      <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 bg-muted hover:bg-muted/80 rounded-lg cursor-pointer transition-colors">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-lg">
                            {group.key}
                          </span>
                          <span className="text-sm text-muted-foreground">
                            ({group.count} 张)
                          </span>
                        </div>
                        <ChevronDown
                          className={`h-4 w-4 transition-transform ${
                            openGroups[group.key] ||
                            openGroups[group.key] === undefined
                              ? 'rotate-180'
                              : ''
                          }`}
                        />
                      </CollapsibleTrigger>
                      <CollapsibleContent className="mt-4">
                        <div className="flex flex-wrap gap-4">
                          {group.items.map(item => (
                            <RemoteFileItemWithTags
                              key={item.id}
                              id={item.id}
                              className="w-50 h-50"
                              name={item.name}
                              contentType={item.contentType}
                            >
                              {props => {
                                const { setPreview } = props;

                                return (
                                  <div className="absolute inset-0 bg-background/80 justify-center items-center flex opacity-0 hover:opacity-100 transition-opacity duration-200">
                                    <CopyUrl
                                      url={`${window.location.host}/image/${item.id}`}
                                    />

                                    <DeleteFileAction
                                      onDeleteSuccess={handleFileDelete}
                                      fileId={item.id}
                                      appId={appId}
                                    />

                                    <PreView
                                      onClick={() => {
                                        setPreview(true);
                                      }}
                                    />
                                  </div>
                                );
                              }}
                            </RemoteFileItemWithTags>
                          ))}
                        </div>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </InfiniteScroll>
            </div>
          );
        }}
      </Dropzone>
    </div>
  );
};

export default EventPage;
