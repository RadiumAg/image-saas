'use client';

import React, { useState, useCallback } from 'react';
import type { Area, Point } from 'react-easy-crop';
import Cropper from 'react-easy-crop';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { trpcClientReact } from '@/utils/api';
import { toast } from 'sonner';
import copy from 'copy-to-clipboard';

interface ImageCropDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  imageUrl: string;
  fileId: string;
  appId: string;
  fileName: string;
}

const ImageCropDialog: React.FC<ImageCropDialogProps> = ({
  open,
  onOpenChange,
  imageUrl,
  fileId,
  appId,
  fileName,
}) => {
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isCropping, setIsCropping] = useState(false);
  const [shareLink, setShareLink] = useState<string | null>(null);

  const saveFileMutation = trpcClientReact.file.saveFile.useMutation();
  const createPresignedUrlMutation =
    trpcClientReact.file.createPresignedUrl.useMutation();

  const onCropComplete = useCallback(
    (croppedArea: Area, croppedAreaPixels: Area) => {
      setCroppedAreaPixels(croppedAreaPixels);
    },
    []
  );

  const getCroppedImg = async (
    imageSrc: string,
    pixelCrop: Area,
    rotation = 0
  ): Promise<Blob> => {
    const image = await createImage(imageSrc);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    if (!ctx) {
      throw new Error('No 2d context');
    }

    const maxSize = Math.max(image.width, image.height);
    const safeArea = 2 * ((maxSize / 2) * Math.sqrt(2));

    canvas.width = safeArea;
    canvas.height = safeArea;

    ctx.translate(safeArea / 2, safeArea / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-safeArea / 2, -safeArea / 2);

    ctx.drawImage(
      image,
      safeArea / 2 - image.width * 0.5,
      safeArea / 2 - image.height * 0.5
    );

    const data = ctx.getImageData(0, 0, safeArea, safeArea);

    canvas.width = pixelCrop.width;
    canvas.height = pixelCrop.height;

    ctx.putImageData(
      data,
      Math.round(0 - safeArea / 2 + image.width * 0.5 - pixelCrop.x),
      Math.round(0 - safeArea / 2 + image.height * 0.5 - pixelCrop.y)
    );

    return new Promise(resolve => {
      canvas.toBlob(
        blob => {
          if (blob) {
            resolve(blob);
          }
        },
        'image/jpeg',
        0.95
      );
    });
  };

  const createImage = (url: string): Promise<HTMLImageElement> =>
    new Promise((resolve, reject) => {
      const image = new Image();
      image.addEventListener('load', () => resolve(image));
      image.addEventListener('error', error => reject(error));
      image.setAttribute('crossOrigin', 'anonymous');
      image.src = url;
    });

  const handleCropAndUpload = async () => {
    if (!croppedAreaPixels) {
      toast.error('请先选择裁剪区域');
      return;
    }

    setIsCropping(true);

    try {
      // 获取裁剪后的图片
      const croppedBlob = await getCroppedImg(imageUrl, croppedAreaPixels);

      // 创建裁剪后的文件名
      const croppedFileName = `cropped_${Date.now()}_${fileName}`;

      // 获取预签名 URL
      const { url: uploadUrl, method } =
        await createPresignedUrlMutation.mutateAsync({
          filename: croppedFileName,
          contentType: 'image/jpeg',
          size: croppedBlob.size,
          appId,
        });

      // 上传裁剪后的图片
      const uploadResponse = await fetch(uploadUrl, {
        method,
        body: croppedBlob,
        headers: {
          'Content-Type': 'image/jpeg',
        },
      });

      if (!uploadResponse.ok) {
        throw new Error('上传失败');
      }

      // 保存文件信息到数据库
      const savedFile = await saveFileMutation.mutateAsync({
        name: croppedFileName,
        path: uploadUrl.split('?')[0],
        type: 'image/jpeg',
        appId,
      });

      // 生成分享链接
      const shareUrl = `${window.location.origin}/share/${savedFile.id}`;
      setShareLink(shareUrl);

      toast.success('裁剪并上传成功！');
    } catch (error) {
      console.error('裁剪上传失败:', error);
      toast.error('裁剪上传失败，请重试');
    } finally {
      setIsCropping(false);
    }
  };

  const handleCopyLink = () => {
    if (shareLink) {
      copy(shareLink);
      toast.success('链接已复制到剪贴板');
    }
  };

  const handleClose = () => {
    setShareLink(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-4xl h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>裁剪图片</DialogTitle>
        </DialogHeader>

        {!shareLink ? (
          <div className="flex-1 flex flex-col gap-4">
            {/* 裁剪区域 */}
            <div className="flex-1 relative bg-black rounded-lg overflow-hidden">
              <Cropper
                image={imageUrl}
                crop={crop}
                zoom={zoom}
                aspect={undefined}
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
                objectFit="contain"
              />
            </div>

            {/* 缩放控制 */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>缩放</span>
                <span>{Math.round(zoom * 100)}%</span>
              </div>
              <Slider
                value={[zoom]}
                min={1}
                max={3}
                step={0.1}
                onValueChange={(value: number[]) => setZoom(value[0])}
              />
            </div>

            {/* 操作按钮 */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                className="flex-1"
              >
                取消
              </Button>
              <Button
                onClick={handleCropAndUpload}
                disabled={isCropping}
                className="flex-1"
              >
                {isCropping ? '处理中...' : '裁剪并上传'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center gap-6">
            <div className="text-center space-y-2">
              <h3 className="text-xl font-semibold">裁剪成功！</h3>
              <p className="text-muted-foreground">
                图片已上传，您可以分享以下链接
              </p>
            </div>

            <div className="w-full max-w-md space-y-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={shareLink}
                  readOnly
                  className="flex-1 px-3 py-2 border rounded-md bg-muted text-sm"
                />
                <Button onClick={handleCopyLink}>复制</Button>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShareLink(null)}
                  className="flex-1"
                >
                  继续裁剪
                </Button>
                <Button onClick={handleClose} className="flex-1">
                  完成
                </Button>
              </div>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default ImageCropDialog;
