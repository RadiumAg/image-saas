'use client';

import React, { useState } from 'react';
import { api } from '@/utils/api';
import { FileItemWithAI } from '@/components/feature/FileItemWithAI';
import { Button } from '@/components/ui/Button';
import { toast } from '@/components/ui/Sonner';
import { Loader2 } from 'lucide-react';

export default function AITagsDemoPage() {
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  
  const { data: apps, isLoading: appsLoading } = api.apps.listApps.useQuery();
  
  const { data: files, isLoading: filesLoading, refetch: refetchFiles } = 
    api.files.listFiles.useQuery(
      { appId: selectedAppId },
      { enabled: !!selectedAppId }
    );

  const handleTagsChange = () => {
    // 重新获取文件列表以更新标签
    refetchFiles();
    toast.success('标签已更新');
  };

  if (appsLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          AI 图片标签识别演示
        </h1>
        <p className="text-gray-600">
          选择一个应用，然后点击"AI识别标签"按钮来为图片自动生成标签
        </p>
      </div>

      {/* 应用选择 */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          选择应用
        </label>
        <div className="flex gap-2 flex-wrap">
          {apps?.map((app) => (
            <Button
              key={app.id}
              variant={selectedAppId === app.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedAppId(app.id)}
            >
              {app.name}
            </Button>
          ))}
          {!apps || apps.length === 0 && (
            <p className="text-gray-500">暂无应用，请先创建一个应用</p>
          )}
        </div>
      </div>

      {/* 文件列表 */}
      {selectedAppId && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-800">
              文件列表
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetchFiles()}
              disabled={filesLoading}
            >
              {filesLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              刷新
            </Button>
          </div>

          {filesLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : files && files.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {files
                .filter((file) => file.contentType.startsWith('image')) // 只显示图片
                .map((file) => (
                  <FileItemWithAI
                    key={file.id}
                    id={file.id}
                    name={file.name}
                    contentType={file.contentType}
                    url={file.url}
                    tags={[]} // 这里可以传入已有的标签
                    onTagsChange={handleTagsChange}
                  />
                ))}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              该应用中暂无图片文件
            </div>
          )}
        </div>
      )}

      {!selectedAppId && (
        <div className="text-center py-12 text-gray-500">
          请选择一个应用来查看文件
        </div>
      )}
    </div>
  );
}