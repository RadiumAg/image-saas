'use client';
import { use, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { trpcClientReact } from '@/utils/api';
import { Plus, Edit } from 'lucide-react';
import Link from 'next/link';
import EditStorageDialog from '@/components/feature/EditStorageDialog';

export default function StoragePage(
  props: PageProps<'/dashboard/apps/[appId]/setting/storage'>
) {
  const { appId } = use(props.params);
  const utils = trpcClientReact.useUtils();
  const [editingStorage, setEditingStorage] = useState<any>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const { mutate } = trpcClientReact.apps.changeStorage.useMutation({
    onSuccess(data, variables) {
      utils.apps.listApps.setData(undefined, (prev) => {
        if (!prev) {
          return prev;
        }

        return prev.map((p) =>
          p.id === appId
            ? {
                ...p,
                storageId: variables.storageId,
              }
            : p
        );
      });
    },
  });
  const { data: storages } = trpcClientReact.storages.listStorages.useQuery();
  const { data: apps, isPending } = trpcClientReact.apps.listApps.useQuery();
  const currentApp = apps?.filter((app) => app.id === appId)[0];

  const handleEditStorage = (storage: any) => {
    setEditingStorage(storage);
    setIsEditDialogOpen(true);
  };

  const handleEditSuccess = () => {
    setEditingStorage(null);
    setIsEditDialogOpen(false);
  };

  return (
    <div className="pt-10">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl mb-6">Storage</h1>
        <Link href={`/dashboard/apps/${appId}/setting/storage/new`}>
          <Button>
            <Plus></Plus>
          </Button>
        </Link>
      </div>
      {storages?.map((storage) => {
        return (
          <div
            key={storage.id}
            className="border p-4 flex justify-between items-center m-4"
          >
            <div className="flex items-center gap-4">
              <span className="font-medium">{storage.name}</span>
              {storage.id === currentApp?.storageId && (
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
                  当前使用
                </span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleEditStorage(storage)}
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                className="cursor-pointer"
                disabled={storage.id === currentApp?.storageId}
                onClick={() => {
                  mutate({ appId, storageId: storage.id });
                }}
              >
                {storage.id === currentApp?.storageId ? 'Used' : 'Use'}
              </Button>
            </div>
          </div>
        );
      })}

      <EditStorageDialog
        storage={editingStorage}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSuccess={handleEditSuccess}
      />
    </div>
  );
}
