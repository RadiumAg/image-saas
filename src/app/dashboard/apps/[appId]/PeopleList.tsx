'use client';
import { trpcClientReact } from '@/utils/api';
import React from 'react';

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

  console.log('[DEBUG] files', infinityQueryData);

  return <div></div>;
};

export default PeopleList;
