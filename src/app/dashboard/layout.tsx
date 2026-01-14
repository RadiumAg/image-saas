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

  if (!session?.user) {
    redirect('/api/auth/signin');
  }

  return (
    <ThemeProvider>
      <nav className="h-[80px] border-b flex justify-center">
        <div className="container flex justify-between h-full items-center relative gap-2">
          <HomeButton />

          <div className="flex items-center gap-2">
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
      <main className="h-[calc(100vh-80px)]">{children}</main>
    </ThemeProvider>
  );
}
