import { trpcClientReact } from '@/utils/api';
import React from 'react';

const PeopleList: React.FC = () => {
  const files = trpcClientReact.tags.infinityQueryFiles();
};

export default PeopleList;
