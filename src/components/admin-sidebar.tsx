'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './ui/sheet';
import {
  Home,
  LogOut,
  Menu,
  Users,
  CreditCard,
  Puzzle,
  Wrench,
  Settings,
  LayoutDashboard,
  Image as ImageIcon,
  Package,
  TrendingUp,
  FileText,
  Bell,
  LineChart,
  Package2,
  Palette,
  FileCode,
  Globe,
  Link as LinkIcon,
  Mail,
  List,
  Send,
  Mails,
  Shield // Adicionado
} from 'lucide-react';
import { useAuth } from './auth-provider';
import { useSettings } from './settings-provider';
import { availableIcons } from './icon-map';
import { Collapsible, CollapsibleTrigger, CollapsibleContent } from './ui/collapsible';
import { ChevronDown } from 'lucide-react';
import { useState } from 'react';
import { clearSessionCookie } from '@/app/actions';

function AdminNavContent() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { settings } = useSettings();

  const navItems = [
    { href: '/admin/dashboard', label: 'Visão Geral', icon: LayoutDashboard },
    { href: '/admin/users', label: 'Usuários', icon: Users },
    { href: '/admin/notifications', label: 'Notificações', icon: Bell },
    { href: '/admin/analytics', label: 'Analytics', icon: TrendingUp },
    { href: '/admin/pages', label: 'Páginas', icon: FileText },
    { href: '/admin/home', label: 'Home', icon: ImageIcon },
    { href: '/admin/plans', label: 'Planos', icon: Package },
    { href: '/admin/stripe', label: 'Stripe', icon: CreditCard },
    { href: '/admin/integrations', label: 'Integrações', icon: Puzzle },
    { href: '/admin/email', label: 'Email Marketing', icon: Mails },
    { href: '/admin/conta-e-seguranca', label: 'Conta e Segurança', icon: Shield }, // Adicionado
    { href: '/admin/configuracoes', label: 'Configurações', icon: Settings },
    { href: '/admin/menu-lateral', label: 'Menu Lateral', icon: List },
  ];

  const handleLogout = async () => {
    await signOut(auth);
    // await clearSessionCookie(); // TODO: Re-enable when logout flow is server-side
    router.push('/admin/login');
  };

  const Icon = availableIcons[settings.iconName as keyof typeof availableIcons] || Wrench;
  const siteName = settings.siteName || 'Gestor Elite';
  const logoURL = settings.logoURL;

  return (
    <div className="flex h-full max-h-screen flex-col gap-2">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/admin/dashboard" className="flex items-center gap-2 font-semibold">
          {logoURL ? (
            <Image src={logoURL} alt="Logo" width={24} height={24} className="h-6 w-6 object-contain" />
          ) : (
            <Icon className="h-6 w-6 text-primary" />
          )}
          <span className="">{siteName} (Admin)</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4 mt-2">
          {navItems.map((item) => {
            const IconComponent = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
                <Link
                key={item.href}
                href={item.href}
                className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                    isActive ? 'bg-muted text-primary' : ''
                )}
                >
                <IconComponent className="h-4 w-4" />
                {item.label}
                </Link>
            );
          })}
        </nav>
      </div>
      <div className="mt-auto p-4 border-t">
          <div className="flex items-center justify-between gap-2 mb-4">
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-primary font-bold shrink-0">
                  {user?.email?.charAt(0).toUpperCase()}
              </div>
              <span className="text-sm font-medium truncate">{user?.email}</span>
            </div>
          </div>
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
             <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
      </div>
    </div>
  );
}

export function AdminSidebar() {
  const { settings } = useSettings();
  const Icon = availableIcons[settings.iconName as keyof typeof availableIcons] || Wrench;
  const siteName = settings.siteName || 'Gestor Elite';
  const logoURL = settings.logoURL;

  return (
    <>
      <div className="hidden border-r bg-card md:block">
        <AdminNavContent />
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
              <SheetTitle className="sr-only">Menu do Administrador</SheetTitle>
              <SheetDescription className="sr-only">Navegue pelas diferentes seções do painel administrativo.</SheetDescription>
              <AdminNavContent />
            </SheetContent>
          </Sheet>
           <div className="flex items-center gap-2 font-semibold">
             {logoURL ? (
                <Image src={logoURL} alt="Logo" width={24} height={24} className="h-6 w-6 object-contain" />
              ) : (
                <Icon className="h-6 w-6 text-primary" />
              )}
             <span className="">{siteName} (Admin)</span>
           </div>
      </header>
    </>
  );
}
