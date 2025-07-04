
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import {
  ClipboardList,
  Home,
  LogOut,
  Menu,
  Users,
  Wrench,
  CalendarClock
} from 'lucide-react';
import { useAuth } from './auth-provider';

const navItems = [
  { href: '/dashboard', label: 'Painel', icon: Home },
  { href: '/dashboard/ordens-de-servico', label: 'Ordens de Serviço', icon: ClipboardList },
  { href: '/dashboard/prazos', label: 'Prazos', icon: CalendarClock },
  { href: '/dashboard/base-de-clientes', label: 'Base de Clientes', icon: Users },
];

function NavContent() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/');
  };

  return (
    <div className="flex h-full max-h-screen flex-col gap-2">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
          <Wrench className="h-6 w-6 text-primary" />
          <span className="">ServiceWise</span>
        </Link>
      </div>
      <div className="flex-1">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
          {navItems.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                pathname.startsWith(href) && href !== '/dashboard' && 'bg-muted text-primary',
                pathname === href && href === '/dashboard' && 'bg-muted text-primary'
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="mt-auto p-4 border-t">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-primary font-bold">
                {user?.email?.charAt(0).toUpperCase()}
            </div>
            <span className="text-sm font-medium truncate">{user?.email}</span>
          </div>
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
             <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
      </div>
    </div>
  );
}

export function DashboardSidebar() {
  return (
    <>
      <div className="hidden border-r bg-card md:block">
        <NavContent />
      </div>
      <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] lg:px-6 md:hidden">
         <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
              <NavContent />
            </SheetContent>
          </Sheet>
           <div className="flex items-center gap-2 font-semibold">
             <Wrench className="h-6 w-6 text-primary" />
             <span className="">ServiceWise</span>
           </div>
      </header>
    </>
  );
}
