'use client';
import { AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { Avatar } from '@/components/ui/avatar';
import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut, Crown, Zap } from 'lucide-react';
import { trpcClientReact } from '@/utils/api';
import { Skeleton } from '@/components/ui/skeleton';

interface UserMenuProps {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  plan?: string | null;
}

/** 是否为无限制（null/Infinity 表示无上限） */
function isUnlimited(n: number | null | undefined): boolean {
  return n == null || n === Infinity;
}

/** 格式化字节为可读大小，null=无限 */
function formatBytes(bytes: number | null | undefined): string {
  if (isUnlimited(bytes)) return '∞';
  const b = bytes!;
  if (b >= 1024 * 1024 * 1024) {
    return (b / (1024 * 1024 * 1024)).toFixed(1) + ' GB';
  }
  if (b >= 1024 * 1024) {
    return (b / (1024 * 1024)).toFixed(1) + ' MB';
  }
  if (b >= 1024) {
    return (b / 1024).toFixed(1) + ' KB';
  }
  return b + ' B';
}

/** 格式化数量，null/Infinity 显示为 ∞ */
function formatNumber(n: number | null | undefined): string {
  return isUnlimited(n) ? '∞' : String(n);
}

/** 计算进度百分比，无限制返回 0 */
function calcPercent(used: number, max: number | null | undefined): number {
  if (isUnlimited(max)) return 0;
  return Math.min((used / max!) * 100, 100);
}

const UserMenu: React.FC<UserMenuProps> = props => {
  const { name, email, image } = props;

  const handleSignOut = () => {
    window.location.href = '/api/auth/signout';
  };

  const { data: planUsage, isLoading } =
    trpcClientReact.plan.getPlanWithUsage.useQuery();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Avatar>
          <AvatarImage src={image ?? ''} />
          <AvatarFallback>
            <div className="flex items-center justify-center h-full">
              {name?.substring(0, 2) ?? 'U'}
            </div>
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-64">
        <div className="px-2 py-1.5 text-sm font-medium">{name}</div>
        {email && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            {email}
          </div>
        )}

        <DropdownMenuSeparator />

        {/* 套餐与用量 */}
        <div className="px-2 py-2">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-2 w-full" />
              <Skeleton className="h-3 w-32" />
            </div>
          ) : planUsage ? (
            <div className="space-y-2">
              {/* 套餐标签 */}
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-xs font-medium">
                  {planUsage.plan === 'payed' ? (
                    <Crown className="h-3.5 w-3.5 text-amber-500" />
                  ) : (
                    <Zap className="h-3.5 w-3.5 text-muted-foreground" />
                  )}
                  {planUsage.label}
                </span>
                {planUsage.plan === 'free' && (
                  <span className="text-xs text-amber-500 cursor-pointer hover:underline">
                    升级 →
                  </span>
                )}
              </div>

              {/* 文件数量进度 */}
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>文件数</span>
                  <span>
                    {planUsage.usageCount} /{formatNumber(planUsage.maxFiles)}
                  </span>
                </div>
                {!isUnlimited(planUsage.maxFiles) && (
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{
                        width: `${calcPercent(planUsage.usageCount, planUsage.maxFiles)}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* 存储空间进度 */}
              <div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
                  <span>存储</span>
                  <span>
                    {formatBytes(planUsage.usageStorage)} /
                    {formatBytes(planUsage.maxStorage)}
                  </span>
                </div>
                {!isUnlimited(planUsage.maxStorage) && (
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-300"
                      style={{
                        width: `${calcPercent(planUsage.usageStorage, planUsage.maxStorage)}%`,
                      }}
                    />
                  </div>
                )}
              </div>

              {/* 功能列表 */}
              {planUsage.features && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {planUsage.features.map(f => (
                    <span
                      key={f}
                      className="px-1.5 py-0.5 text-[10px] rounded bg-muted text-muted-foreground"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : null}
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          className="text-destructive cursor-pointer"
          onClick={handleSignOut}
        >
          <LogOut className="h-4 w-4 mr-2" />
          退出登录
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default UserMenu;
