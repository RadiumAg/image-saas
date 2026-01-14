'use client';
import { AvatarFallback, AvatarImage } from '@radix-ui/react-avatar';
import { Avatar } from '@/components/ui/avatar';
import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { LogOut } from 'lucide-react';

interface UserMenuProps {
  name?: string | null;
  email?: string | null;
  image?: string | null;
  plan?: string | null;
}

const UserMenu: React.FC<UserMenuProps> = props => {
  const { name, email, image, plan } = props;

  const handleSignOut = () => {
    window.location.href = '/api/auth/signout';
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger>
        <Avatar>
          <AvatarImage src={image ?? ''} />
          <AvatarFallback>{name?.substring(0, 2) ?? 'U'}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <div className="px-2 py-1.5 text-sm font-medium">{name}</div>
        {email && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            {email}
          </div>
        )}
        {plan && (
          <div className="px-2 py-1.5 text-xs text-muted-foreground">
            套餐: {plan}
          </div>
        )}
        <div className="h-px bg-border my-1" />
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
