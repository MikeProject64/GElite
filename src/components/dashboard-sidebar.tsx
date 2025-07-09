
'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import {
  ClipboardList,
  Home,
  LogOut,
  Users,
  Wrench,
  CalendarClock,
  Settings,
  Package,
  FileText,
  Briefcase,
  Bell,
  CreditCard,
  Sun,
  Moon,
  ChevronsLeft,
} from 'lucide-react';
import { useAuth } from './auth-provider';
import { useSettings } from './settings-provider';
import { availableIcons } from './icon-map';
import { useTheme } from 'next-themes';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { Separator } from './ui/separator';

interface NavContentProps {
  isCollapsed: boolean;
  toggleSidebar: () => void;
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
      <div className="flex h-full max-h-screen flex-col border-r bg-card">
        <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold">
            {logoURL ? (
                <Image src={logoURL} alt="Logo" width={24} height={24} className="h-6 w-6" />
            ) : (
                <Icon className="h-6 w-6 text-primary" />
            )}
            {(!isCollapsed || isMobile) && <span className="">{siteName}</span>}
          </Link>
          {!isMobile && (
            <Button onClick={toggleSidebar} variant="ghost" size="icon" className={cn("h-8 w-8 ml-auto", isCollapsed && "ml-2")}>
              <ChevronsLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
            </Button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto">
          {mainNav}
        </div>

        <div className="mt-auto border-t">
          <div className={cn("grid items-start text-sm font-medium", isCollapsed ? "p-2 space-y-1" : "p-4 space-y-1")}>
            
            {isCollapsed && !isMobile ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/dashboard/configuracoes" className={cn('flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-primary md:h-8 md:w-8', pathname.startsWith('/dashboard/configuracoes') && 'bg-accent text-accent-foreground')}><Settings className="h-5 w-5" /><span className="sr-only">Configurações</span></Link>
                </TooltipTrigger>
                <TooltipContent side="right">Configurações</TooltipContent>
              </Tooltip>
            ) : (
              <Link href="/dashboard/configuracoes" className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary', pathname.startsWith('/dashboard/configuracoes') && 'bg-muted text-primary')}><Settings className="h-4 w-4" />{!isCollapsed && <span>Configurações</span>}</Link>
            )}

            {isCollapsed && !isMobile ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Link href="/dashboard/subscription" className={cn('flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-primary md:h-8 md:w-8', pathname.startsWith('/dashboard/subscription') && 'bg-accent text-accent-foreground')}><CreditCard className="h-5 w-5" /><span className="sr-only">Assinatura</span></Link>
                </TooltipTrigger>
                <TooltipContent side="right">Assinatura</TooltipContent>
              </Tooltip>
            ) : (
              <Link href="/dashboard/subscription" className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary', pathname.startsWith('/dashboard/subscription') && 'bg-muted text-primary')}><CreditCard className="h-4 w-4" />{!isCollapsed && <span>Assinatura</span>}</Link>
            )}
            
            <Separator className="my-2" />

            <DropdownMenu>
              <Tooltip>
                <TooltipTrigger asChild>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" className={cn('flex items-center gap-3 px-3 py-2 justify-start text-muted-foreground transition-all hover:text-primary', isCollapsed && !isMobile && "h-9 w-9 justify-center p-0 md:h-8 md:w-8")}>
                      <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                      <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                      {(!isCollapsed || isMobile) && <span className="ml-0">Alterar Tema</span>}
                      <span className="sr-only">Alterar Tema</span>
                    </Button>
                  </DropdownMenuTrigger>
                </TooltipTrigger>
                {(isCollapsed && !isMobile) && <TooltipContent side="right">Alterar Tema</TooltipContent>}
              </Tooltip>
              <DropdownMenuContent align="end" side={isMobile ? "top" : "right"} sideOffset={12}>
                <DropdownMenuItem onClick={() => setTheme('light')}>Claro</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('dark')}>Escuro</DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme('system')}>Sistema</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {isCollapsed && !isMobile ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="ghost" onClick={handleLogout} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-primary md:h-8 md:w-8 p-0"><LogOut className="h-5 w-5" /><span className="sr-only">Sair</span></Button>
                </TooltipTrigger>
                <TooltipContent side="right">Sair</TooltipContent>
              </Tooltip>
            ) : (
              <Button variant="ghost" onClick={handleLogout} className={cn('flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary justify-start')}><LogOut className="h-4 w-4" />{!isCollapsed && <span>Sair</span>}</Button>
            )}
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}

export function DashboardSidebar({ isCollapsed, toggleSidebar, isMobile = false }: { isCollapsed: boolean, toggleSidebar: () => void, isMobile?: boolean }) {
  return (
    <aside className={cn(
      "transition-all duration-300 ease-in-out",
      isMobile ? "w-full" : (isCollapsed ? "w-[72px]" : "w-[220px] lg:w-[280px]")
    )}>
      <NavContent isCollapsed={isCollapsed} toggleSidebar={toggleSidebar} isMobile={isMobile} />
    </aside>
  );
}
