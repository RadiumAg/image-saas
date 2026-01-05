import { useUppyState } from '@/hooks/use-uppy-state';
import { AppRouter, trpcClientReact, trpcPureClient } from '@/utils/api';
import Uppy from '@uppy/core';
import Image from 'next/image';
import React from 'react';
import { RemoteFileItem, RemoteFileItemWithTags } from './FileItem';
import { inferRouterOutputs } from '@trpc/server';
import { Button } from '../ui/Button';
import { ScrollArea } from '../ui/ScrollArea';
import { FilesOrderByColumn } from '@/server/routes/file';
import { DeleteFileAction, CopyUrl, PreView } from './FileItemAction';
import { cn } from '@/lib/utils';
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
}

type FileResult = inferRouterOutputs<AppRouter>['file']['infinityQueryFiles'];

const FileList: React.FC<FileListProps> = (props) => {
  const { uppy, appId, orderBy } = props;
  const query = {
    limit: 10,
    appId,
    ...orderBy,
  };

  const {
    data: infinityQueryData,
    isPending,
    fetchNextPage,
  } = trpcClientReact.file.infinityQueryFiles.useInfiniteQuery(query, {
    getNextPageParam: (resp) => resp.nextCursor,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    refetchOnReconnect: false,
  });

  const fileList =
    infinityQueryData?.pages.reduce<FileResult['items']>((result, page) => {
      return [...result, ...page.items];
    }, []) || [];

  // 按时间分组数据
  const groupedFiles = useMemo(() => {
    if (!infinityQueryData?.pages) return [];

    const allItems = infinityQueryData.pages.flatMap((page) => page.items);

    const groups: Record<string, typeof allItems> = {};

    allItems.forEach((item) => {
      const date = new Date(item.createdAt);
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
    setOpenGroups((prev) => ({
      ...prev,
      [key]: prev[key] === undefined ? true : !prev[key],
    }));
  };

  const utils = trpcClientReact.useUtils();

  const handleFileDelete = (id: string) => {
    utils.file.infinityQueryFiles.setInfiniteData(query, (prev) => {
      if (!prev) return prev;

      return {
        ...prev,
        pages: prev.pages.map((page, index) => {
          if (index === 0) {
            return {
              ...page,
              items: page.items.filter((file) => file.id !== id),
            };
          }
          return page;
        }),
        pageParams: prev.pageParams,
      };
    });
  };

  const uppyFiles = useUppyState(uppy, (s) => s.files);
  const [uploadingFilesIds, setUploadingFilesIds] = React.useState<string[]>(
    []
  );
  const bottomRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (bottomRef.current) {
      const observer = new IntersectionObserver(
        (e) => {
          if (e[0].intersectionRatio > 0.1) fetchNextPage();
        },
        { threshold: 0.1 }
      );

      observer.observe(bottomRef.current);

      return () => {
        if (bottomRef.current) observer.unobserve(bottomRef.current);
        observer.disconnect();
      };
    }
  }, [fetchNextPage]);

  React.useEffect(() => {
    const handler = (file: any, resp: any) => {
      if (file) {
        trpcPureClient.file.saveFile
          .mutate({
            name: file.data instanceof File ? file.data.name : 'test',
            path: resp.uploadURL ?? '',
            type: file.data.type,
            appId,
          })
          .then(async (resp) => {
            // 只对图片文件进行识别
            if (file.data.type && file.data.type.startsWith('image')) {
              try {
                await trpcPureClient.tags.recognizeImageTags.mutate({
                  fileId: resp.id,
                });
              } catch (error) {
                console.error('AI识别失败:', error);
              }
            }

            utils.file.infinityQueryFiles.setInfiniteData(query, (prev) => {
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

    const uploadProgressHandler = (_: any, resp: any) => {
      setUploadingFilesIds((currentFiles) => [
        ...currentFiles,
        ...resp.map((file: any) => file.id),
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
  }, [query]);

  const fileListEle = groupedFiles.map((group) => {
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
              openGroups[group.key] ? 'rotate-180' : ''
            }`}
          />
        </CollapsibleTrigger>
        <CollapsibleContent className="mt-4">
          <div className="flex flex-wrap gap-4">
            {isToday &&
              uploadingFilesIds.length > 0 &&
              uploadingFilesIds.map((fileId) => {
                const file = uppyFiles[fileId];
                const isImage = file.data.type.startsWith('image');
                const url = URL.createObjectURL(file.data);

                return (
                  <div
                    key={fileId}
                    className="flex justify-center items-center border border-red-500"
                  >
                    {isImage ? (
                      <img
                        className="w-56 h-56 object-cover"
                        src={url}
                        alt="file"
                      />
                    ) : (
                      <Image
                        width={100}
                        height={100}
                        className="w-full"
                        src="/file.png"
                        alt="unknow file type"
                      />
                    )}
                  </div>
                );
              })}
            {group.items.map((file) => (
              <RemoteFileItemWithTags
                className="w-56 h-56"
                key={file.id}
                id={file.id}
                name={file.name}
                contentType={file.contentType}
                tags={file.tags}
              >
                {(props) => {
                  const { setPreview } = props;

                  return (
                    <div className="absolute inset-0 bg-background/80 justify-center items-center flex opacity-0 hover:opacity-100 transition-opacity duration-200">
                      <CopyUrl
                        url={`${window.location.host}/image/${file.id}`}
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
                    </div>
                  );
                }}
              </RemoteFileItemWithTags>
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
      {isPending && <div className="text-center">Loading...</div>}
      <div className={cn('relative container')}>{fileListEle}</div>

      <div className="space-y-4">
        {groupedFiles.length === 0 && !isPending && (
          <div className="text-center text-muted-foreground py-8">暂无图片</div>
        )}
      </div>

      <div ref={bottomRef} className="flex justify-center p-8">
        <Button
          variant="ghost"
          onClick={() => {
            fetchNextPage();
          }}
        >
          Load Next Page
        </Button>
      </div>
    </ScrollArea>
  );
};

export default FileList;
