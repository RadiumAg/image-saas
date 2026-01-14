'use client';

import React, { useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { S3StorageConfiguration } from '@/server/db/schema';
import { trpcClientReact } from '@/utils/api';
import { SubmitHandler, useForm } from 'react-hook-form';

interface StorageData {
  id: number;
  name: string;
  configuration: S3StorageConfiguration;
}

interface EditStorageDialogProps {
  storage: StorageData | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

type FormData = S3StorageConfiguration & { name: string };

export function EditStorageDialog({
  storage,
  open,
  onOpenChange,
  onSuccess,
}: EditStorageDialogProps) {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FormData>();

  const utils = trpcClientReact.useUtils();
  const { mutate, isPending } =
    trpcClientReact.storages.updateStorage.useMutation({
      onSuccess: () => {
        utils.storages.listStorages.refetch();
        onSuccess?.();
        onOpenChange(false);
        reset();
      },
    });

  const onSubmit: SubmitHandler<FormData> = (data) => {
    if (!storage) return;

    mutate({
      id: storage.id,
      ...data,
    });
  };

  // 当弹窗打开且有存储数据时，重置表单为当前值
  useEffect(() => {
    if (open && storage) {
      reset({
        name: storage.name,
        ...storage.configuration,
      });
    }
  }, [open, storage, reset]);

  if (!storage) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>编辑存储配置</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="name">名称</Label>
            <Input
              id="name"
              {...register('name', { required: '名称不能为空' })}
            />
            {errors.name && (
              <span className="text-red-500 text-sm">
                {errors.name.message}
              </span>
            )}
          </div>

          <div>
            <Label htmlFor="bucket">Bucket</Label>
            <Input
              id="bucket"
              {...register('bucket', { required: 'Bucket不能为空' })}
            />
            {errors.bucket && (
              <span className="text-red-500 text-sm">
                {errors.bucket.message}
              </span>
            )}
          </div>

          <div>
            <Label htmlFor="region">Region</Label>
            <Input
              id="region"
              {...register('region', { required: 'Region不能为空' })}
            />
            {errors.region && (
              <span className="text-red-500 text-sm">
                {errors.region.message}
              </span>
            )}
          </div>

          <div>
            <Label htmlFor="accessKeyId">Access Key ID</Label>
            <Input
              id="accessKeyId"
              {...register('accessKeyId', {
                required: 'Access Key ID不能为空',
              })}
            />
            {errors.accessKeyId && (
              <span className="text-red-500 text-sm">
                {errors.accessKeyId.message}
              </span>
            )}
          </div>

          <div>
            <Label htmlFor="secretAccessKey">Secret Access Key</Label>
            <Input
              id="secretAccessKey"
              type="password"
              {...register('secretAccessKey', {
                required: 'Secret Access Key不能为空',
              })}
            />
            {errors.secretAccessKey && (
              <span className="text-red-500 text-sm">
                {errors.secretAccessKey.message}
              </span>
            )}
          </div>

          <div>
            <Label htmlFor="apiEndPoint">API Endpoint (可选)</Label>
            <Input id="apiEndPoint" {...register('apiEndPoint')} />
            {errors.apiEndPoint && (
              <span className="text-red-500 text-sm">
                {errors.apiEndPoint.message}
              </span>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isPending || isSubmitting}
            >
              取消
            </Button>
            <Button type="submit" disabled={isPending || isSubmitting}>
              {isPending ? '保存中...' : '保存'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export default EditStorageDialog;
