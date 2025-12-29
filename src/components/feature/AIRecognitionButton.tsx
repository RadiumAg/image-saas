'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Sonner';
import { Loader2, Wand2 } from 'lucide-react';
import { api } from '@/utils/api';

interface AIRecognitionButtonProps {
  fileId: string;
  imageUrl?: string;
  onTagsRecognized?: (tags: any[]) => void;
  disabled?: boolean;
}

export function AIRecognitionButton({ 
  fileId, 
  imageUrl, 
  onTagsRecognized,
  disabled = false 
}: AIRecognitionButtonProps) {
  const [isRecognizing, setIsRecognizing] = useState(false);

  const recognizeTagsMutation = api.tags.recognizeImageTags.useMutation({
    onSuccess: (data) => {
      if (data.success && data.tags.length > 0) {
        toast.success(`成功识别了 ${data.tags.length} 个标签`);
        onTagsRecognized?.(data.tags);
      } else {
        toast.info(data.message || '未能识别出有效标签');
      }
    },
    onError: (error) => {
      toast.error(error.message || 'AI识别失败，请稍后重试');
    },
    onSettled: () => {
      setIsRecognizing(false);
    },
  });

  const handleRecognize = async () => {
    if (disabled || isRecognizing) return;

    setIsRecognizing(true);
    recognizeTagsMutation.mutate({ fileId, imageUrl });
  };

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleRecognize}
      disabled={disabled || isRecognizing}
      className="flex items-center gap-2"
    >
      {isRecognizing ? (
        <>
          <Loader2 className="h-4 w-4 animate-spin" />
          AI识别中...
        </>
      ) : (
        <>
          <Wand2 className="h-4 w-4" />
          AI识别标签
        </>
      )}
    </Button>
  );
}