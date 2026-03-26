import { getServerSession } from '@/server/auth';
import { redirect } from 'next/navigation';
import { ThemeProvider } from './theme-provider';
import { ThemeToggle } from './theme-toggle';
import UserMenu from '@/components/feature/user-menu';
import HomeButton from '@/components/feature/home-button';
import '../globals.css';

export default async function RootLayout({
  children,
  nav,
}: Readonly<{
  children: React.ReactNode;
  nav: React.ReactNode;
}>) {
  const session = await getServerSession();

  // 在 SKIP_LOGIN 模式下，即使没有会话也不重定向
  if (!session?.user && process.env.SKIP_LOGIN !== 'true') {
    redirect('/api/auth/signin');
  }

  return (
    <ThemeProvider>
      <nav className="sticky top-0 z-50 h-[64px] border-b bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60 transition-colors duration-200">
        <div className="container flex justify-between h-full items-center relative gap-2 mx-auto">
          <HomeButton />

          <div className="flex items-center gap-1">
            <ThemeToggle />

            <UserMenu
              plan={session?.user?.plan}
              name={session?.user?.name}
              email={session?.user?.email}
              image={session?.user?.image}
            />
          </div>

          <div className="absolute h-full left-1/2 -translate-x-1/2 flex justify-center items-center">
            {nav}
          </div>
        </div>
      </nav>
      <main className="h-[calc(100vh-64px)]">{children}</main>
    </ThemeProvider>
  );
}
