'use client';
import { useEffect, useRef, ReactNode } from 'react';

type InfiniteScrollProps = {
  children: ReactNode;
  hasMore: boolean;
  isLoading: boolean;
  threshold?: number;
  loadMore: () => void;
};

const InfiniteScroll: React.FC<InfiniteScrollProps> = props => {
  const { children, hasMore, isLoading, threshold = 100, loadMore } = props;
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      entries => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoading) {
          loadMore();
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
  }, [loadMore, hasMore, isLoading, threshold]);

  return (
    <div>
      {children}
      <div ref={sentinelRef} className="flex justify-center items-center py-8">
        <div className="text-muted-foreground">
          {hasMore && isLoading ? '加载中...' : '没有更多了'}
        </div>
      </div>
    </div>
  );
};

export default InfiniteScroll;
