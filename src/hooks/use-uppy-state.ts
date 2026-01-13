import Uppy, { Body } from '@uppy/core';
import { useMemo, useSyncExternalStore } from 'react';

const useUppyState = <T, TMeta extends Body>(
  uppy: Uppy<TMeta>,
  selector: (state: ReturnType<Uppy<TMeta>['getState']>) => T
) => {
  const store = uppy.store;
  const getSnapshot = () => selector(store.getState());

  const subscribe = useMemo(() => store.subscribe.bind(store), [store]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};

export { useUppyState };
