'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { useTheme } from 'next-themes';
import { Moon, Sun } from 'lucide-react';
import { useMount } from 'ahooks';

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === 'dark';
  const [ready, setReady] = useState(false);

  useMount(() => {
    setReady(true);
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <Button
      className="cursor-pointer"
      onClick={() => {
        setTheme(isDark ? 'light' : 'dark');
      }}
      variant="ghost"
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}
