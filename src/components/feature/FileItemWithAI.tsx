import React, { useState } from 'react';
import { RemoteFileItem } from './FileItem';
import { Tag } from '@/components/ui/Tag';
import { AIRecognitionButton } from './AIRecognitionButton';
import { api } from '@/utils/api';
import { toast } from '@/components/ui/Sonner';

interface FileItemWithAIProps {
  id: string;
  name: string;
  contentType: string;
  url?: string;
  tags?: Array<{ id: string; name: string; color: string }>;
  onTagsChange?: (tags: Array<{ id: string; name: string; color: string }>) => void;
}

export function FileItemWithAI({
  id,
  name,
  contentType,
  url,
  tags = [],
  onTagsChange,
}: FileItemWithAIProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  
  const utils = api.useUtils();

  const handleTagsRecognized = async (recognizedTags: any[]) => {
    setIsUpdating(true);
    
    try {
      // 重新获取文件标签
      await utils.tags.getFileTags.invalidate({ fileId: id });
      
      // 调用父组件的回调
      const updatedTags = await utils.tags.getFileTags.fetch({ fileId: id });
      onTagsChange?.(updatedTags);
      
    } catch (error) {
      console.error('更新标签失败:', error);
      toast.error('更新标签失败');
    } finally {
      setIsUpdating(false);
    }
  };

  const isImage = contentType.startsWith('image');
  const imageUrl = url || `/image/${id}`;

  return (
    <div className="border rounded-lg overflow-hidden bg-white">
      {/* 图片预览 */}
      <div className="aspect-square relative">
        <RemoteFileItem
          id={id}
          name={name}
          contentType={contentType}
        />
      </div>

      {/* 文件信息和操作 */}
      <div className="p-4 space-y-3">
        {/* 文件名 */}
        <div className="text-sm font-medium text-gray-900 truncate" title={name}>
          {name}
        </div>

        {/* 标签显示 */}
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Tag
                key={tag.id}
                id={tag.id}
                name={tag.name}
                color={tag.color}
                size="sm"
                removable={false}
              />
            ))}
          </div>
        )}

        {/* AI识别按钮 */}
        {isImage && (
          <div className="pt-2 border-t">
            <AIRecognitionButton
              fileId={id}
              imageUrl={imageUrl}
              onTagsRecognized={handleTagsRecognized}
              disabled={isUpdating}
            />
          </div>
        )}

        {/* 加载状态 */}
        {isUpdating && (
          <div className="text-xs text-gray-500 text-center">
            正在更新标签...
          </div>
        )}
      </div>
    </div>
  );
}