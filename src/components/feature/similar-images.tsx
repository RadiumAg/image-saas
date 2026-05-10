'use client';

import { trpcClientReact } from '@/utils/api';
import Image from 'next/image';
import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ChevronDown, ChevronUp, Image as ImageIcon } from 'lucide-react';

interface SimilarImagesProps {
  fileId: string;
  appId: string;
}

interface SimilarImage {
  fileId: string;
  fileName: string;
  filePath: string;
  fileUrl: string;
  createdAt: string | null;
  similarity: number;
}

export function SimilarImages({ fileId, appId }: SimilarImagesProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const { data: similarImages, isLoading } =
    trpcClientReact.tags.getSimilarImages.useQuery(
      {
        fileId,
        appId,
        limit: 10,
        threshold: 0.5, // 使用AI特征提取，阈倿0.5
      },
      {
        refetchOnWindowFocus: false,
        staleTime: 60000, // 1分钟缓存
      }
    );

  // 如果没有相似图片，不显示
  if (!isLoading && (!similarImages || similarImages.length === 0)) {
    return null;
  }

  return (
    <div className="mb-4 bg-muted/30 rounded-lg overflow-hidden">
      {/* 标题栏 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium text-muted-foreground">
            相似图片推荐
            {similarImages && similarImages.length > 0 && (
              <span className="ml-1">({similarImages.length})</span>
            )}
          </span>
        </div>
        {isExpanded ? (
          <ChevronUp className="h-4 w-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="h-4 w-4 text-muted-foreground" />
        )}
      </button>

      {/* 图片列表 */}
      {isExpanded && (
        <div className="px-4 pb-4">
          {isLoading ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {[1, 2, 3, 4, 5].map(i => (
                <Skeleton key={i} className="h-20 w-20 flex-shrink-0" />
              ))}
            </div>
          ) : similarImages && similarImages.length > 0 ? (
            <div className="flex gap-3 overflow-x-auto pb-2">
              {similarImages.map((image: SimilarImage) => (
                <SimilarImageCard key={image.fileId} image={image} />
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">
              暂无相似图片
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface SimilarImageCardProps {
  image: {
    fileId: string;
    fileName: string;
    filePath: string;
    fileUrl: string;
    similarity: number;
  };
}

function SimilarImageCard({ image }: SimilarImageCardProps) {
  return (
    <div className="relative flex-shrink-0 group cursor-pointer">
      <div className="relative w-20 h-20 rounded-lg overflow-hidden border border-border">
        <Image
          src={`/api/image/${image.fileId}?_width=160&_height=160`}
          alt={image.fileName}
          fill
          className="object-cover group-hover:opacity-80 transition-opacity"
          sizes="80px"
        />
        {/* 相似度标签 */}
        <div className="absolute top-1 right-1 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
          {(image.similarity * 100).toFixed(0)}%
        </div>
      </div>
      {/* 文件名 */}
      <p className="mt-1 text-xs text-muted-foreground truncate max-w-20">
        {image.fileName}
      </p>
    </div>
  );
}
