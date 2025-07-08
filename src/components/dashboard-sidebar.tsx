
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './ui/sheet';
import {
  ClipboardList,
  Home,
  LogOut,
  Menu,
  Users,
  Wrench,
  CalendarClock,
  Settings,
  Package,
  FileText,
  Briefcase,
  Bell,
  CreditCard,
  ChevronsLeft,
  Sun,
  Moon,
  Laptop
} from 'lucide-react';
import { useAuth } from './auth-provider';
import { useSettings } from './settings-provider';
import { availableIcons } from './icon-map';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from './ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';

interface NavContentProps {
  isCollapsed: boolean;
  toggleSidebar?: () => void;
  isMobile?: boolean;
}

function NavContent({ isCollapsed, toggleSidebar, isMobile = false }: NavContentProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { settings } = useSettings();
  const { setTheme } = useTheme();

  const navItems = [
    { href: '/dashboard', label: 'Painel', icon: Home },
    { href: '/dashboard/servicos', label: 'Serviços', icon: ClipboardList, flag: 'servicos' },
    { href: '/dashboard/orcamentos', label: 'Orçamentos', icon: FileText, flag: 'orcamentos' },
    { href: '/dashboard/prazos', label: 'Prazos', icon: CalendarClock, flag: 'prazos' },
    { href: '/dashboard/atividades', label: 'Atividades', icon: Bell, flag: 'atividades' },
    { href: '/dashboard/base-de-clientes', label: 'Clientes', icon: Users, flag: 'clientes' },
    { href: '/dashboard/colaboradores', label: 'Colaboradores', icon: Briefcase, flag: 'colaboradores' },
    { href: '/dashboard/inventario', label: 'Inventário', icon: Package, flag: 'inventario' },
  ];

  const handleLogout = async () => {
    if (user) {
      const storageKey = `gestor-elite-settings-${user.uid}`;
      localStorage.removeItem(storageKey);
    }
    await signOut(auth);
    router.push('/');
  };

  const Icon = availableIcons[settings.iconName as keyof typeof availableIcons] || Wrench;
  const siteName = settings.siteName || 'Gestor Elite';
  const logoURL = settings.logoURL;

  const mainNav = (
    <nav className={cn("grid items-start text-sm font-medium mt-2", isCollapsed ? "px-2" : "px-2 lg:px-4")}>
      {navItems.map(({ href, label, icon: NavIcon, flag }) => {
        const showFeature = flag ? settings.featureFlags?.[flag as keyof typeof settings.featureFlags] !== false : true;
        if (!showFeature) return null;

        const isActive = (href === '/dashboard' && pathname === href) || (href.length > '/dashboard'.length && pathname.startsWith(href));

        if (isCollapsed && !isMobile) {
          return (
            <Tooltip key={href}>
              <TooltipTrigger asChild>
                <Link
                  href={href}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-primary md:h-8 md:w-8',
                    isActive && 'bg-accent text-accent-foreground'
                  )}
                >
                  <NavIcon className="h-5 w-5" />
                  <span className="sr-only">{label}</span>
                </Link>
              </TooltipTrigger>
              <TooltipContent side="right">{label}</TooltipContent>
            </Tooltip>
          );
        }

        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
              isActive && 'bg-muted text-primary'
            )}
          >
            <NavIcon className="h-4 w-4" />
            {!isCollapsed && <span>{label}</span>}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <TooltipProvider delayDuration={0}>
      <div className="flex h-full max-h-screen flex-col">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            {logoURL ? (
                <Image src={logoURL} alt="Logo" width={24} height={24} className="h-6 w-6" />
            ) : (
                <Icon className="h-6 w-6 text-primary" />
            )}
            {(!isCollapsed || isMobile) && <span className="">{siteName}</span>}
          </Link>
        </div>
        <div className="flex-1 overflow-y-auto">
          {mainNav}
        </div>
        <div className="mt-auto p-4 border-t">
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="w-full flex items-center gap-2"
                    style={{ justifyContent: (isCollapsed && !isMobile) ? 'center' : 'flex-start', paddingLeft: (isCollapsed && !isMobile) ? 0 : undefined, paddingRight: (isCollapsed && !isMobile) ? 0 : undefined }}
                  >
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-primary font-bold shrink-0">
                      {user?.email?.charAt(0).toUpperCase()}
                    </div>
                    {(!isCollapsed || isMobile) && <span className="text-sm font-medium truncate">{user?.email}</span>}
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              {(isCollapsed && !isMobile) && <TooltipContent side="right">Minha Conta</TooltipContent>}
            </Tooltip>
            <DropdownMenuContent align="end" className="w-56" side="top" sideOffset={8}>
              <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push('/dashboard/subscription')}>
                <CreditCard className="mr-2 h-4 w-4" />
                <span>Assinatura</span>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push('/dashboard/configuracoes')}>
                <Settings className="mr-2 h-4 w-4" />
                <span>Configurações</span>
              </DropdownMenuItem>
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                    <Sun className="mr-2 h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                    <Moon className="absolute mr-2 h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                    <span>Alterar Tema</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                    <DropdownMenuItem onClick={() => setTheme('light')}>Claro</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme('dark')}>Escuro</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme('system')}>Sistema</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={handleLogout} className="text-destructive focus:bg-destructive focus:text-destructive-foreground">
                <LogOut className="mr-2 h-4 w-4" />
                <span>Sair</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          {!isMobile && (
            <Button onClick={toggleSidebar} variant="outline" size="icon" className="w-full mt-2">
                <ChevronsLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
            </Button>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

export function DashboardSidebar({ isCollapsed, toggleSidebar }: { isCollapsed: boolean, toggleSidebar: () => void }) {
  const { settings } = useSettings();
  const Icon = availableIcons[settings.iconName as keyof typeof availableIcons] || Wrench;
  const siteName = settings.siteName || 'Gestor Elite';
  const logoURL = settings.logoURL;

  return (
    <>
      <div className={cn("hidden border-r bg-card md:block", isCollapsed ? "transition-all duration-300" : "transition-all duration-300")}>
        <NavContent isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} />
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
            <SheetTitle className="sr-only">Menu Principal</SheetTitle>
            <SheetDescription className="sr-only">Navegue pelas diferentes seções do aplicativo.</SheetDescription>
            <NavContent isCollapsed={false} isMobile={true} />
          </SheetContent>
        </Sheet>
        <div className="flex items-center gap-2 font-semibold">
          {logoURL ? (
              <Image src={logoURL} alt="Logo" width={24} height={24} className="h-6 w-6" />
          ) : (
              <Icon className="h-6 w-6 text-primary" />
          )}
          <span className="">{siteName}</span>
        </div>
      </header>
    </>
  );
}
