'use client';

import { Button } from '@/components/ui/Button';
import { Home } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function HomeButton() {
  const pathname = usePathname();

  // 从路径中提取appId
  const appIdMatch = pathname.match(/\/dashboard\/apps\/([^\/]+)/);
  const appId = appIdMatch ? appIdMatch[1] : null;

  // 如果不在app页面或者无法获取appId，则跳转到dashboard首页
  const href = appId ? `/dashboard/apps/${appId}` : '/dashboard';

  return (
    <Button asChild variant="ghost" size="icon">
      <Link href={href}>
        <Home className="h-4 w-4" />
        <span className="sr-only">回到应用首页</span>
      </Link>
    </Button>
  );
}

export default HomeButton;
