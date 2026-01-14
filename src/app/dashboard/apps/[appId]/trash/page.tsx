'use client';
import { trpcClientReact } from '@/utils/api';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2, RotateCcw, Download, AlertCircle, Info } from 'lucide-react';
import { useState, useMemo, FC, use } from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { RemoteFileItemWithTags } from '@/components/feature/file-item';
import InfiniteScroll from '@/components/feature/infinite-scroll';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const TrashPage: FC<PageProps<'/dashboard/apps/[appId]/trash'>> = props => {
  const { appId } = use(props.params);

  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    default: true,
  });

  // 确认对话框状态
  const [confirmDialog, setConfirmDialog] = useState<{
    open: boolean;
    type:
      | 'restore'
      | 'permanentlyDelete'
      | 'batchRestore'
      | 'batchPermanentlyDelete';
    id?: string;
  }>({
    open: false,
    type: 'restore',
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
    getNextPageParam: resp => resp.nextCursor,
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

  const isOperating =
    restoreFileMutation.isPending ||
    batchRestoreFilesMutation.isPending ||
    permanentlyDeleteFileMutation.isPending ||
    batchPermanentlyDeleteFilesMutation.isPending;

  const toggleSelect = (id: string) => {
    setSelectedFiles(prev => {
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
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      ids.forEach(id => {
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
    setOpenGroups(prev => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleRestore = (id: string) => {
    setConfirmDialog({
      open: true,
      type: 'restore',
      id,
    });
  };

  const handleBatchRestore = () => {
    if (selectedFiles.size === 0) return;

    setConfirmDialog({
      open: true,
      type: 'batchRestore',
    });
  };

  const handlePermanentlyDelete = (id: string) => {
    setConfirmDialog({
      open: true,
      type: 'permanentlyDelete',
      id,
    });
  };

  const handleBatchPermanentlyDelete = () => {
    if (selectedFiles.size === 0) return;

    setConfirmDialog({
      open: true,
      type: 'batchPermanentlyDelete',
    });
  };

  const handleConfirm = () => {
    setConfirmDialog({ open: false, type: 'restore' });

    switch (confirmDialog.type) {
      case 'restore':
        if (confirmDialog.id) {
          restoreFileMutation.mutate(
            { id: confirmDialog.id, appId },
            {
              onSuccess: () => {
                utils.file.getDeletedFiles.setInfiniteData(query, prev => {
                  if (!prev) return prev;

                  return {
                    ...prev,
                    pages: prev.pages.map(page => ({
                      ...page,
                      items: page.items.filter(
                        file => file.id !== confirmDialog.id
                      ),
                    })),
                    pageParams: prev.pageParams,
                  };
                });

                setSelectedFiles(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(confirmDialog.id!);
                  return newSet;
                });
              },
            }
          );
        }
        break;

      case 'batchRestore':
        const restoreIds = Array.from(selectedFiles);
        batchRestoreFilesMutation.mutate(
          { ids: restoreIds, appId },
          {
            onSuccess: () => {
              utils.file.getDeletedFiles.setInfiniteData(query, prev => {
                if (!prev) return prev;

                return {
                  ...prev,
                  pages: prev.pages.map(page => ({
                    ...page,
                    items: page.items.filter(
                      file => !restoreIds.includes(file.id)
                    ),
                  })),
                  pageParams: prev.pageParams,
                };
              });
            },
          }
        );
        break;

      case 'permanentlyDelete':
        if (confirmDialog.id) {
          permanentlyDeleteFileMutation.mutate(
            { id: confirmDialog.id, appId },
            {
              onSuccess: () => {
                utils.file.getDeletedFiles.setInfiniteData(query, prev => {
                  if (!prev) return prev;

                  return {
                    ...prev,
                    pages: prev.pages.map(page => ({
                      ...page,
                      items: page.items.filter(
                        file => file.id !== confirmDialog.id
                      ),
                    })),
                    pageParams: prev.pageParams,
                  };
                });

                setSelectedFiles(prev => {
                  const newSet = new Set(prev);
                  newSet.delete(confirmDialog.id!);
                  return newSet;
                });
              },
            }
          );
        }
        break;

      case 'batchPermanentlyDelete':
        const deleteIds = Array.from(selectedFiles);
        batchPermanentlyDeleteFilesMutation.mutate(
          { ids: deleteIds, appId },
          {
            onSuccess: () => {
              utils.file.getDeletedFiles.setInfiniteData(query, prev => {
                if (!prev) return prev;

                return {
                  ...prev,
                  pages: prev.pages.map(page => ({
                    ...page,
                    items: page.items.filter(
                      file => !deleteIds.includes(file.id)
                    ),
                  })),
                  pageParams: prev.pageParams,
                };
              });
            },
          }
        );
        break;
    }
  };

  // 按时间分组数据
  const groupedData = useMemo(() => {
    if (!infinityQueryData?.pages) return [];

    const allItems = infinityQueryData?.pages.flatMap(page => page.items);

    const groups: Record<string, typeof allItems> = {};

    allItems.forEach(item => {
      const date = new Date(item.deleteAt!);
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
    const allItems = infinityQueryData?.pages.flatMap(page => page.items);
    return (
      allItems.length > 0 && allItems.every(item => selectedFiles.has(item.id))
    );
  }, [infinityQueryData?.pages, selectedFiles]);

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedFiles(new Set());
    } else {
      const allIds =
        infinityQueryData?.pages.flatMap(page =>
          page.items.map(item => item.id)
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
            disabled={selectedFiles.size === 0 || isOperating}
            onClick={handleBatchRestore}
          >
            {batchRestoreFilesMutation.isPending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
            ) : (
              <RotateCcw className="h-4 w-4" />
            )}
            恢复选中
          </Button>

          <Button
            variant="ghost"
            size="sm"
            disabled={selectedFiles.size === 0 || isOperating}
            onClick={handleBatchPermanentlyDelete}
            className="text-destructive"
          >
            {batchPermanentlyDeleteFilesMutation.isPending ? (
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
            ) : (
              <Trash2 className="h-4 w-4" />
            )}
            永久删除
          </Button>
        </div>
      </div>

      <ScrollArea className="h-[calc(100%-60px)]">
        <div className="container mx-auto mt-4">
          {/* 提示信息 */}
          <Alert className="mb-4">
            <Info className="h-4 w-4" />
            <AlertTitle>提示</AlertTitle>
            <AlertDescription>
              回收站中的文件会在删除 7
              天后自动永久删除，请及时恢复需要保留的文件。
            </AlertDescription>
          </Alert>

          {/* 全选/取消全选 */}
          {groupedData.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <Checkbox
                checked={allSelected}
                onCheckedChange={toggleSelectAll}
              />
              <span className="text-sm text-muted-foreground">
                全选 ({selectedFiles.size}/
                {infinityQueryData?.pages.flatMap(page => page.items).length ||
                  0}
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
              {groupedData.map(group => (
                <Collapsible
                  key={group.key}
                  open={openGroups[group.key] ?? true}
                  onOpenChange={() => toggleGroup(group.key)}
                >
                  <CollapsibleTrigger className="flex items-center justify-between w-full px-4 py-3 bg-muted hover:bg-muted/80 rounded-lg cursor-pointer transition-colors">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={group.items.every(item =>
                          selectedFiles.has(item.id)
                        )}
                        onCheckedChange={checked => {
                          batchToggleSelect(
                            group.items.map(item => item.id),
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
                      {group.items.map(item => (
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
                          >
                            {props => {
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
                                    disabled={
                                      isOperating &&
                                      permanentlyDeleteFileMutation.variables
                                        ?.id !== item.id
                                    }
                                  >
                                    {permanentlyDeleteFileMutation.isPending &&
                                    permanentlyDeleteFileMutation.variables
                                      ?.id === item.id ? (
                                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>

                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRestore(item.id)}
                                    disabled={
                                      isOperating &&
                                      restoreFileMutation.variables?.id !==
                                        item.id
                                    }
                                  >
                                    {restoreFileMutation.isPending &&
                                    restoreFileMutation.variables?.id ===
                                      item.id ? (
                                      <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
                                    ) : (
                                      <RotateCcw className="h-4 w-4" />
                                    )}
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

      {/* 确认对话框 */}
      <AlertDialog
        open={confirmDialog.open}
        onOpenChange={open => setConfirmDialog(prev => ({ ...prev, open }))}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              {confirmDialog.type.includes('permanentlyDelete')
                ? '永久删除确认'
                : '恢复确认'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDialog.type === 'restore' && '确定要恢复这个文件吗？'}
              {confirmDialog.type === 'permanentlyDelete' &&
                '此操作不可撤销，确定要永久删除这个文件吗？'}
              {confirmDialog.type === 'batchRestore' &&
                `确定要恢复选中的 ${selectedFiles.size} 个文件吗？`}
              {confirmDialog.type === 'batchPermanentlyDelete' &&
                `此操作不可撤销，确定要永久删除选中的 ${selectedFiles.size} 个文件吗？`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isOperating}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirm}
              disabled={isOperating}
              className={
                confirmDialog.type.includes('permanentlyDelete')
                  ? 'bg-destructive hover:bg-destructive/90'
                  : ''
              }
            >
              {isOperating ? '处理中...' : '确认'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TrashPage;
