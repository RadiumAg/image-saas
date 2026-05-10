/* eslint-disable @next/next/no-img-element */
import { trpcClientReact } from '@/utils/api';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Sparkles } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import Image from 'next/image'
interface SimilarImage {
  fileId: string;
  fileName: string;
  filePath: string;
  fileUrl: string;
  createdAt: string | null;
  similarity: number;
}

interface SimilarImagesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileId: string;
  appId: string;
}

export function SimilarImagesDialog({
  open,
  onOpenChange,
  fileId,
  appId,
}: SimilarImagesDialogProps) {
  const { data: similarImages, isLoading } =
    trpcClientReact.tags.getSimilarImages.useQuery(
      {
        fileId,
        appId,
        limit: 20,
        threshold: 0.5, // 使用AI特征提取，阈倿0.5
      },
      {
        enabled: open,
        refetchOnWindowFocus: false,
        staleTime: 60000,
      }
    );

  const handleImageClick = (imageFileId: string) => {
    // 这里可以跳转到图片详情页或在新标签页打开
    window.open(`/image/${imageFileId}`, '_blank');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            相似图片推荐
            {similarImages && similarImages.length > 0 && (
              <span className="text-sm font-normal text-muted-foreground">
                (找到 {similarImages.length} 张相似图片)
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto mt-4">
          {isLoading ? (
            <div className="grid grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-32 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ))}
            </div>
          ) : similarImages && similarImages.length > 0 ? (
            <div className="grid grid-cols-4 gap-4">
              {similarImages.map((image: SimilarImage) => (
                <SimilarImageCard
                  key={image.fileId}
                  image={image}
                  onClick={() => handleImageClick(image.fileId)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Sparkles className="h-12 w-12 mb-4 opacity-30" />
              <p className="text-lg font-medium mb-1">暂无相似图片</p>
              <p className="text-sm">上传更多图片后会为您推荐相似内容</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

interface SimilarImageCardProps {
  image: SimilarImage;
  onClick: () => void;
}

function SimilarImageCard({ image, onClick }: SimilarImageCardProps) {
  return (
    <div
      className="group cursor-pointer rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-all hover:shadow-lg"
      onClick={onClick}
    >
      <div className="relative aspect-square">
        <img
          src={`/image/${image.fileId}?_width=320&_height=320`}
          alt={image.fileName}
          className="w-full h-full object-cover group-hover:opacity-90 transition-opacity"
        />
        {/* 相似度标签 */}
        <div className="absolute top-2 right-2 bg-black/70 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full font-medium">
          {(image.similarity * 100).toFixed(0)}% 相似
        </div>
      </div>
      <div className="p-2 bg-background">
        <p
          className="text-xs text-muted-foreground truncate"
          title={image.fileName}
        >
          {image.fileName}
        </p>
      </div>
    </div>
  );
}
