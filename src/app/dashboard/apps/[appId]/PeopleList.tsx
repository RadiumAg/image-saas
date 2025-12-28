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
    tagId: '0',
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
};

export default PeopleList;
