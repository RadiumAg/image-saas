'use client';
import { trpcClientReact } from '@/utils/api';
import React from 'react';

const PeopleList: React.FC = () => {
  const files = trpcClientReact.file.infinityQueryFilesByTag.useInfiniteQuery(
    {}
  );
};

export default PeopleList;
