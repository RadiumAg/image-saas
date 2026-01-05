'use client';
import { trpcClientReact } from '@/utils/api';
import { Button } from '@/components/ui/Button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/ScrollArea';
import { Trash2, RotateCcw, Download } from 'lucide-react';
import { useState, useMemo, FC, use } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { RemoteFileItemWithTags } from '@/components/feature/FileItem';
import InfiniteScroll from '@/components/feature/InfiniteScroll';

interface TrashPageProps {
  params: Promise<{ appId: string }>;
}

const TrashPage: FC<TrashPageProps> = (props) => {
  const { appId } = use(props.params);

  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    default: true,
  });

  const query = {
    limit: 20,
    appId,
  };

  const {
    data: infinityQueryData,
    isPending,
    fetchNextPage,
  } = trpcClientReact.file.getDeletedFiles.useInfiniteQuery(query, {
    getNextPageParam: (resp) => resp.nextCursor,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
  });

  const utils = trpcClientReact.useUtils();

  const restoreFileMutation = trpcClientReact.file.restoreFile.useMutation();
  const batchRestoreFilesMutation =
    trpcClientReact.file.batchRestoreFiles.useMutation();
  const permanentlyDeleteFileMutation =
    trpcClientReact.file.permanentlyDeleteFile.useMutation();
  const batchPermanentlyDeleteFilesMutation =
    trpcClientReact.file.batchPermanentlyDeleteFiles.useMutation();

  const toggleSelect = (id: string) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  const batchToggleSelect = (ids: string[], selected: boolean) => {
    setSelectedFiles((prev) => {
      const newSet = new Set(prev);
      ids.forEach((id) => {
        if (selected) {
          newSet.add(id);
        } else {
          newSet.delete(id);
        }
      });
      return newSet;
    });
  };

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleRestore = (id: string) => {
    restoreFileMutation.mutate(
      { id, appId },
      {
        onSuccess: () => {
          utils.file.getDeletedFiles.setInfiniteData(query, (prev) => {
            if (!prev) return prev;

            return {
              ...prev,
              pages: prev.pages.map((page) => ({
                ...page,
                items: page.items.filter((file) => file.id !== id),
              })),
              pageParams: prev.pageParams,
            };
          });

          setSelectedFiles((prev) => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
          });
        },
      }
    );
  };

  const handleBatchRestore = () => {
    if (selectedFiles.size === 0) return;

    batchRestoreFilesMutation.mutate(
      { ids: Array.from(selectedFiles), appId },
      {
        onSuccess: () => {
          const ids = Array.from(selectedFiles);
          utils.file.getDeletedFiles.setInfiniteData(query, (prev) => {
            if (!prev) return prev;

            return {
              ...prev,
              pages: prev.pages.map((page) => ({
                ...page,
                items: page.items.filter((file) => !ids.includes(file.id)),
              })),
              pageParams: prev.pageParams,
            };
          });
        },
      }
    );
  };

  const handlePermanentlyDelete = (id: string) => {
    permanentlyDeleteFileMutation.mutate(
      { id, appId },
      {
        onSuccess: () => {
          utils.file.getDeletedFiles.setInfiniteData(query, (prev) => {
            if (!prev) return prev;

            return {
              ...prev,
              pages: prev.pages.map((page) => ({
                ...page,
                items: page.items.filter((file) => file.id !== id),
              })),
              pageParams: prev.pageParams,
            };
          });

          setSelectedFiles((prev) => {
            const newSet = new Set(prev);
            newSet.delete(id);
            return newSet;
          });
        },
      }
    );
  };

  const handleBatchPermanentlyDelete = () => {
    if (selectedFiles.size === 0) return;

    batchPermanentlyDeleteFilesMutation.mutate(
      { ids: Array.from(selectedFiles), appId },
      {
        onSuccess: () => {
          const ids = Array.from(selectedFiles);
          utils.file.getDeletedFiles.setInfiniteData(query, (prev) => {
            if (!prev) return prev;

            return {
              ...prev,
              pages: prev.pages.map((page) => ({
                ...page,
                items: page.items.filter((file) => !ids.includes(file.id)),
              })),
              pageParams: prev.pageParams,
            };
          });
        },
      }
    );
  };

  // 按时间分组数据
  const groupedData = useMemo(() => {
    if (!infinityQueryData?.pages) return [];

    const allItems = infinityQueryData.pages.flatMap((page) => page.items);

    const groups: Record<string, typeof allItems> = {};

    allItems.forEach((item) => {
      const date = new Date(item.deleteAt);
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

  const allSelected = useMemo(() => {
    if (!infinityQueryData?.pages) return false;
    const allItems = infinityQueryData.pages.flatMap((page) => page.items);
    return (
      allItems.length > 0 &&
      allItems.every((item) => selectedFiles.has(item.id))
    );
  }, [infinityQueryData?.pages, selectedFiles]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedFiles(new Set());
    } else {
      const allIds =
        infinityQueryData?.pages.flatMap((page) =>
          page.items.map((item) => item.id)
        ) || [];
      setSelectedFiles(new Set(allIds));
    }
  };

  if (isPending) {
    return (
      <div className="container mx-auto mt-10 flex justify-center items-center h-96">
        <div className="text-center">
          <div
            className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"
            role="status"
          >
            <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
              Loading...
            </span>
          </div>
          <p className="mt-4 text-sm text-muted-foreground">加载中...</p>
        </div>
      </div>
    );
  }

  if (groupedData.length === 0) {
    return (
      <div className="container mx-auto mt-10 text-center text-muted-foreground">
        回收站为空
      </div>
    );
  }

  return (
    <div className="h-full">
      <div className="container mx-auto flex justify-between items-center h-[60px]">
        <div className="text-xl font-semibold">回收站</div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            disabled={selectedFiles.size === 0}
            onClick={handleBatchRestore}
          >
            <RotateCcw className="h-4 w-4" />
            恢复选中
          </Button>

          <Button
            variant="ghost"
            size="sm"
            disabled={selectedFiles.size === 0}
            onClick={handleBatchPermanentlyDelete}
            className="text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            永久删除
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100%-60px)]">
        <div className="container mx-auto mt-4">
          {/* 全选/取消全选 */}
          {groupedData.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                全选 ({selectedFiles.size}/
                {infinityQueryData?.pages.flatMap((page) => page.items)
                  .length || 0}
                )
              </span>
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
              {groupedData.map((group) => (
                <Collapsible
                  key={group.key}
                  open={openGroups[group.key] ?? true}
                  onOpenChange={() => toggleGroup(group.key)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 bg-muted hover:bg-muted/80 rounded-lg cursor-pointer transition-colors">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={group.items.every((item) =>
                          selectedFiles.has(item.id)
                        )}
                        onCheckedChange={(checked) => {
                          batchToggleSelect(
                            group.items.map((item) => item.id),
                            checked === true
                          );
                        }}
                      />
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
                      {group.items.map((item) => (
                        <div key={item.id} className="relative group">
                          <Checkbox
                            className="absolute top-2 left-2 z-10"
                            checked={selectedFiles.has(item.id)}
                            onCheckedChange={() => toggleSelect(item.id)}
                          />

                          <RemoteFileItemWithTags
                            id={item.id}
                            name={item.name}
                            className="w-56 h-56"
                            contentType={item.contentType}
                            tags={item.tags}
                          >
                            {(props) => {
                              const { setPreview } = props;

                              return (
                                <div className="absolute inset-0 bg-background/80 justify-center items-center flex opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() =>
                                      handlePermanentlyDelete(item.id)
                                    }
                                    className="text-destructive"
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRestore(item.id)}
                                  >
                                    <RotateCcw className="h-4 w-4" />
                                  </Button>
                                </div>
                              );
                            }}
                          </RemoteFileItemWithTags>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </Collapsible>
              ))}
            </div>
          </InfiniteScroll>
        </div>
      </ScrollArea>
    </div>
  );
};

export default TrashPage;
