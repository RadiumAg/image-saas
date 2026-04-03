'use client';
import { useLockFn } from 'ahooks';
import React from 'react';

type InfiniteScrollProps = {
  children: React.ReactNode;
  hasMore: boolean;
  isLoading: boolean;
  threshold?: number;
  loadMore: () => Promise<any>;
};

const InfiniteScroll: React.FC<InfiniteScrollProps> = props => {
  const { children, hasMore, isLoading, threshold = 100, loadMore } = props;
  const sentinelRef = React.useRef<HTMLDivElement>(null);
  const loadMoreLock = React.useEffectEvent(useLockFn(loadMore));

  console.log('[DEBUG] hasMore', hasMore);

  React.useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      entries => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoading) {
          loadMoreLock();
        }
      },
      {
        rootMargin: `0px 0px ${threshold}px 0px`,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.unobserve(sentinel);
    };
  }, [hasMore, isLoading, threshold]);

  return (
    <div>
      {children}
      <div ref={sentinelRef} className="flex justify-center items-center py-8">
        <div className="text-muted-foreground">
          {hasMore ? '加载中...' : '没有更多了'}
        </div>
      </div>
    </div>
  );
};

export default InfiniteScroll;
