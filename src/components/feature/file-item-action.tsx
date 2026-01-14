import React, { useState } from 'react';
import { trpcClientReact } from '@/utils/api';
import { Button } from '../ui/button';
import { Trash2, Eye, Copy, AlertCircle } from 'lucide-react';
import copy from 'copy-to-clipboard';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface FileItemActionProps {
  fileId: string;
  appId: string;
  onDeleteSuccess: (fileId: string) => void;
}

const DeleteFileAction: React.FC<FileItemActionProps> = (props) => {
  const { fileId, appId, onDeleteSuccess } = props;
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { mutate: deleteFile, isPending } =
    trpcClientReact.file.deleteFile.useMutation({
      onSuccess: () => {
        onDeleteSuccess(fileId);
        toast('Delete Success!');
      },
    });

  const handleRemoveFile = () => {
    deleteFile({ id: fileId, appId });
    setConfirmOpen(false);
  };

  return (
    <>
      <Button
        className="cursor-pointer"
        variant="ghost"
        onClick={() => setConfirmOpen(true)}
        disabled={isPending}
      >
        {isPending ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
        ) : (
          <Trash2 />
        )}
      </Button>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              删除文件确认
            </AlertDialogTitle>
            <AlertDialogDescription>
              确定要将此文件移动到回收站吗？文件将在 7 天后自动永久删除。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveFile}
              disabled={isPending}
              className="bg-destructive hover:bg-destructive/90"
            >
              {isPending ? '删除中...' : '确认删除'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

const CopyUrl: React.FC<{ url: string }> = (props) => {
  const { url } = props;
  return (
    <Button
      variant="ghost"
      onClick={() => {
        copy(url);
        toast('Url Copy Success');
      }}
    >
      <Copy />
    </Button>
  );
};

type PreviewProps = {
  onClick: () => void;
};

const PreView: React.FC<PreviewProps> = (props) => {
  const { onClick } = props;

  return (
    <Button className="cursor-pointer" variant="ghost" onClick={onClick}>
      <Eye />
    </Button>
  );
};

export { CopyUrl, PreView, DeleteFileAction };
