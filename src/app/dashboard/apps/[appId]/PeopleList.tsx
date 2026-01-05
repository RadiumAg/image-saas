'use client';
import { Avatar } from '@/components/ui/Avatar';
import { trpcClientReact } from '@/utils/api';
import { AvatarImage } from '@radix-ui/react-avatar';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState, useMemo } from 'react';

type PeopleList = {
  appId: string;
  tagId?: string;
};

const PeopleList: React.FC<PeopleList> = (props) => {
  const { appId, tagId } = props;

  // 如果没有 tagId，不渲染
  if (!tagId) {
    return <div className="container mx-auto mt-10">请选择一个标签</div>;
  }

  const query = {
    limit: 10,
    appId,
    tagId,
  };

  const {
    data: infinityQueryData,
    isPending,
    fetchNextPage,
  } = trpcClientReact.file.infinityQueryFilesByTag.useInfiniteQuery(query, {
    getNextPageParam: (resp) => resp.nextCursor,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchOnReconnect: false,
  });

  // 展开状态管理
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    default: true,
  });

  const toggleGroup = (key: string) => {
    setOpenGroups((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  // 按时间分组数据
  const groupedData = useMemo(() => {
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

  if (isPending) {
    return (
      <div className="container mx-auto mt-10 flex justify-center items-center">
        Loading...
      </div>
    );
  }

  if (groupedData.length === 0) {
    return (
      <div className="container mx-auto mt-10 text-center text-muted-foreground">
        暂无图片
      </div>
    );
  }

  return (
    <div className="container mx-auto mt-10 space-y-6">
      {groupedData.map((group) => (
        <Collapsible
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
              {group.items.map((item) => (
                <Avatar key={item.id} className="w-32 h-32 flex flex-wrap">
                  <AvatarImage className="object-cover" src={item.url} />
                </Avatar>
              ))}
            </div>
          </CollapsibleContent>
        </Collapsible>
      ))}
    </div>
  );
};

export default PeopleList;
