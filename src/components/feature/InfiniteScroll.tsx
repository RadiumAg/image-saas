'use client';
import { useEffect, useRef, ReactNode } from 'react';

type InfiniteScrollProps = {
  children: ReactNode;
  loadMore: () => void;
  hasMore: boolean;
  isLoading: boolean;
  threshold?: number;
};

const InfiniteScroll: React.FC<InfiniteScrollProps> = (props) => {
  const { children, loadMore, hasMore, isLoading, threshold = 100 } = props;
  const sentinelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
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
      {hasMore && (
        <div ref={sentinelRef} className="flex justify-center items-center py-8">
          {isLoading && <div className="text-muted-foreground">加载中...</div>}
        </div>
      )}
    </div>
  );
};

export default InfiniteScroll;
