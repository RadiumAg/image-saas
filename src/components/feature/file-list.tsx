import { useUppyState } from '@/hooks/use-uppy-state';
import { trpcClientReact, trpcPureClient } from '@/utils/api';
import Uppy, { Meta, UppyFile } from '@uppy/core';
import Image from 'next/image';
import React from 'react';
import { RemoteFileItemWithTags } from './file-item';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { FilesOrderByColumn } from '@/server/routes/file';
import {
  DeleteFileAction,
  CopyUrl,
  PreView,
  CropAction,
} from './file-item-action';
import { cn } from '@/lib/utils';
import { SearchFilters } from './search-bar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState, useMemo } from 'react';

interface FileListProps {
  uppy: Uppy;
  appId: string;
  orderBy: FilesOrderByColumn;
  searchFilters?: SearchFilters;
}

const FileList: React.FC<FileListProps> = props => {
  const { uppy, appId, orderBy, searchFilters } = props;

  const query = useMemo(
    () => ({
      limit: 10,
      appId,
      ...orderBy,
      search: searchFilters,
    }),
    [appId, orderBy, searchFilters]
  );

  const {
    data: infinityQueryData,
    isPending,
    fetchNextPage,
  } = trpcClientReact.file.infinityQueryFiles.useInfiniteQuery(query, {
    getNextPageParam: resp => resp.nextCursor,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  // 按时间分组数据
  const groupedFiles = useMemo(() => {
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

  const utils = trpcClientReact.useUtils();

  const handleFileDelete = (id: string) => {
    utils.file.infinityQueryFiles.setInfiniteData(query, prev => {
      if (!prev) return prev;

      return {
        ...prev,
        pages: prev.pages.map((page, index) => {
          if (index === 0) {
            return {
              ...page,
              items: page.items.filter(file => file.id !== id),
            };
          }
          return page;
        }),
        pageParams: prev.pageParams,
      };
    });
  };

  const uppyFiles = useUppyState(uppy, s => s.files);
  const [uploadingFilesIds, setUploadingFilesIds] = React.useState<string[]>(
    []
  );
  const bottomRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    const bottomElRef = bottomRef.current;

    if (bottomElRef) {
      const observer = new IntersectionObserver(
        e => {
          if (e[0].intersectionRatio > 0.1) fetchNextPage();
        },
        { threshold: 0.1 }
      );

      observer.observe(bottomElRef);

      return () => {
        if (bottomElRef) observer.unobserve(bottomElRef);
        observer.disconnect();
      };
    }
  }, [fetchNextPage]);

  React.useEffect(() => {
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
          .then(async resp => {
            // 对图片文件进行识别
            if (file.data.type && file.data.type.startsWith('image')) {
              try {
                await trpcPureClient.tags.recognizeImageTags.mutate({
                  fileId: resp.id,
                });

                // AI识别成功后刷新tags
                utils.tags.getTagsByCategory.refetch({ appId });
              } catch (error) {
                console.error('AI识别失败:', error);
              }
            }

            utils.file.infinityQueryFiles.setInfiniteData(query, prev => {
              if (!prev) return prev;

              return {
                ...prev,
                pages: prev.pages.map((page, index) => {
                  if (index === 0) {
                    return {
                      ...page,
                      items: [resp, ...page.items],
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

    const uploadProgressHandler: (
      uploadID: string,
      files: UppyFile<Meta, Record<string, never>>[]
    ) => void = (_, resp) => {
      setUploadingFilesIds(currentFiles => [
        ...currentFiles,
        ...resp.map(file => file.id),
      ]);
    };

    const completeHandler = () => {
      setUploadingFilesIds([]);
    };

    uppy.on('upload-success', handler);
    uppy.on('complete', completeHandler);
    uppy.on('upload', uploadProgressHandler);

    return () => {
      uppy.off('upload-success', handler);
      uppy.off('complete', completeHandler);
      uppy.off('upload', uploadProgressHandler);
    };
  }, [
    appId,
    query,
    uppy,
    utils.file.infinityQueryFiles,
    utils.tags.getTagsByCategory,
  ]);

  const fileListEle = groupedFiles.map(group => {
    const isToday = group.key === '今天';

    return (
      <Collapsible
        className="mb-5"
        key={group.key}
        open={openGroups[group.key] ?? true}
        onOpenChange={() => toggleGroup(group.key)}
      >
        <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 bg-muted hover:bg-muted/80 rounded-lg cursor-pointer transition-colors">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-lg">{group.key}</span>
            <span className="text-sm text-muted-foreground">
              ({group.count} 张)
            </span>
          </div>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${
              openGroups[group.key] === undefined || openGroups[group.key]
                ? 'rotate-180'
                : ''
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <div className="flex flex-wrap gap-4">
            {isToday &&
              uploadingFilesIds.length > 0 &&
              uploadingFilesIds.map(fileId => {
                const file = uppyFiles[fileId];
                const isImage = file.data.type.startsWith('image');
                const url = URL.createObjectURL(file.data);

                return (
                  <div
                    key={fileId}
                    className="flex justify-center items-center rounded-lg border-2 border-dashed border-primary/30 bg-muted/50 overflow-hidden"
                  >
                    {isImage ? (
                      <Image
                        width={100}
                        height={100}
                        src={url}
                        alt="file"
                        className="w-56 h-56"
                      />
                    ) : (
                      <Image
                        width={100}
                        height={100}
                        className="w-56 h-56"
                        src="/file.png"
                        alt="unknow file type"
                      />
                    )}
                  </div>
                );
              })}
            {group.items.map(file => (
              <div key={file.id} className="group relative w-56 cursor-pointer">
                <RemoteFileItemWithTags
                  className="w-56 h-56 rounded-lg overflow-hidden ring-1 ring-border transition-all duration-200 group-hover:ring-2 group-hover:ring-primary/40 group-hover:shadow-lg"
                  id={file.id}
                  name={file.name}
                  contentType={file.contentType}
                >
                  {props => {
                    const { setPreview } = props;

                    return (
                      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm justify-center items-center flex opacity-0 group-hover:opacity-100 transition-all duration-200">
                        <CopyUrl
                          url={`${window.location.protocol}//${window.location.host}/image/${file.id}`}
                        />

                        <DeleteFileAction
                          onDeleteSuccess={handleFileDelete}
                          fileId={file.id}
                          appId={appId}
                        />

                        <PreView
                          onClick={() => {
                            setPreview(true);
                          }}
                        />

                        {file.contentType.startsWith('image') && (
                          <CropAction
                            fileId={file.id}
                            fileName={file.name}
                            appId={appId}
                          />
                        )}
                      </div>
                    );
                  }}
                </RemoteFileItemWithTags>
                <div
                  className="mt-2 text-center text-xs text-muted-foreground truncate w-full px-2"
                  title={file.name}
                >
                  {file.name}
                </div>
              </div>
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  });

  return (
    <ScrollArea
      className="h-full w-full @container"
      onScrollEnd={() => {
        fetchNextPage();
      }}
    >
      {isPending && (
        <div className="container space-y-6 py-4">
          {[1, 2].map(groupIndex => (
            <div key={groupIndex} className="space-y-4">
              <div className="flex items-center gap-2 px-4 py-3">
                <div className="skeleton h-6 w-16 rounded-md" />
                <div className="skeleton h-4 w-10 rounded-md" />
              </div>
              <div className="flex flex-wrap gap-4">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div key={index} className="space-y-2">
                    <div className="skeleton h-56 w-56 rounded-lg" />
                    <div className="skeleton h-3 w-32 mx-auto rounded" />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className={cn('relative container')}>{fileListEle}</div>

      <div className="space-y-4">
        {groupedFiles.length === 0 && !isPending && (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <svg
              className="h-16 w-16 mb-4 opacity-30"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1}
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0 0 22.5 18.75V5.25A2.25 2.25 0 0 0 20.25 3H3.75A2.25 2.25 0 0 0 1.5 5.25v13.5A2.25 2.25 0 0 0 3.75 21Z"
              />
            </svg>
            <p className="text-lg font-medium mb-1">暂无图片</p>
            <p className="text-sm">拖拽、粘贴或点击上传按钮添加图片</p>
          </div>
        )}
      </div>

      <div ref={bottomRef} className="flex justify-center py-8">
        <Button
          variant="ghost"
          className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors duration-200"
          onClick={() => {
            fetchNextPage();
          }}
        >
          加载更多
        </Button>
      </div>
    </ScrollArea>
  );
};

export default FileList;
