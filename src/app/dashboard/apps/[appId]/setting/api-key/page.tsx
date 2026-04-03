'use client';
import { FC, use, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { trpcClientReact } from '@/utils/api';
import { Plus, Key, Copy, Check } from 'lucide-react';
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';

interface ApiKeyCardProps {
  name: string;
  apiKey: string;
}

const ApiKeyCard: FC<ApiKeyCardProps> = props => {
  const { name, apiKey } = props;
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="group flex items-center justify-between rounded-lg border bg-card p-4 transition-colors duration-200 hover:bg-accent/50">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Key className="h-4 w-4" />
        </div>
        <div className="flex flex-col gap-0.5">
          <span className="text-sm font-medium">{name}</span>
          <span className="font-mono text-xs text-muted-foreground">
            {apiKey}
          </span>
        </div>
      </div>
      <Button
        variant="ghost"
        size="icon"
        className="cursor-pointer opacity-0 transition-opacity duration-200 group-hover:opacity-100"
        onClick={handleCopy}
        aria-label="Copy API key"
      >
        {copied ? (
          <Check className="h-4 w-4 text-green-500" />
        ) : (
          <Copy className="h-4 w-4" />
        )}
      </Button>
    </div>
  );
};

const ApiKeySkeletonList: FC = () => {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="flex items-center justify-between rounded-lg border bg-card p-4"
        >
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-md" />
            <div className="flex flex-col gap-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-48" />
            </div>
          </div>
          <Skeleton className="h-8 w-8 rounded-md" />
        </div>
      ))}
    </div>
  );
};

export default function StoragePage(
  props: PageProps<'/dashboard/apps/[appId]/setting/api-key'>
) {
  const { appId } = use(props.params);
  const newApiKeyName = useRef('');
  const utils = trpcClientReact.useUtils();
  const { mutate, isPending: isCreating } =
    trpcClientReact.apiKeys.createApiKey.useMutation({
      onSuccess: data => {
        utils.apiKeys.listApiKeys.setData({ appId }, prev => {
          newApiKeyName.current = '';
          if (!prev || !data) {
            return prev;
          }

          return [data, ...prev];
        });
      },
    });
  const { data: apiKeys, isPending } =
    trpcClientReact.apiKeys.listApiKeys.useQuery({ appId });

  return (
    <div className="mx-auto max-w-3xl pt-10">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
        <Popover>
          <PopoverTrigger asChild>
            <Button size="sm" className="cursor-pointer gap-1.5">
              <Plus className="h-4 w-4" />
              <span>New Key</span>
            </Button>
          </PopoverTrigger>

          <PopoverContent className="w-72">
            <div className="flex flex-col gap-3">
              <label className="text-sm font-medium" htmlFor="api-key-name">
                Key Name
              </label>
              <Input
                id="api-key-name"
                placeholder="e.g. Production"
                onChange={e => {
                  newApiKeyName.current = e.target.value;
                }}
              />
              <Button
                className="cursor-pointer"
                disabled={isCreating}
                onClick={() => {
                  mutate({ appId, name: newApiKeyName.current });
                }}
              >
                {isCreating ? 'Creating...' : 'Create'}
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>

      {isPending ? (
        <ApiKeySkeletonList />
      ) : apiKeys && apiKeys.length > 0 ? (
        <div className="flex flex-col gap-3">
          {apiKeys.map(item => (
            <ApiKeyCard key={item.id} name={item.name} apiKey={item.key} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-12 text-center">
          <Key className="mb-3 h-10 w-10 text-muted-foreground/50" />
          <p className="text-sm text-muted-foreground">
            No API keys yet. Create one to get started.
          </p>
        </div>
      )}
    </div>
  );
}
