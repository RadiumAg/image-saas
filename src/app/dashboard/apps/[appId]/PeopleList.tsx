'use client';
import { Avatar } from '@/components/ui/Avatar';
import { trpcClientReact } from '@/utils/api';
import { AvatarImage } from '@radix-ui/react-avatar';
import React, { useMemo } from 'react';

type PeopleList = {
  appId: string;
};

const PeopleList: React.FC<PeopleList> = (props) => {
  const { appId } = props;
  const query = {
    limit: 10,
    appId,
    tagId: '4720f7b3-a99c-4ef9-b695-0f781fb7b912',
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

  console.log('[DEBUG] files', infinityQueryData?.pages);

  const avatarArrayEle = useMemo(() => {
    return infinityQueryData?.pages.map((page) => {
      const { items } = page;
      return items.map((item) => {
        return (
          <Avatar className="w-50 h-50">
            <AvatarImage className="object-cover" src={item.url} />
          </Avatar>
        );
      });
    });
  }, [infinityQueryData?.pages]);

  return <div className="container mx-auto mt-10">{avatarArrayEle}</div>;
};

export default PeopleList;
