
'use client';

import Link from 'next/link';
import Image from 'next/image';
import React from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { signOut } from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import { Sheet, SheetContent, SheetTrigger } from './ui/sheet';
import {
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
  ClipboardList,
  Menu,
} from 'lucide-react';
import { useAuth } from './auth-provider';
import { useSettings } from './settings-provider';
import { availableIcons } from './icon-map';
import { useTheme } from 'next-themes';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';

const NavLink: React.FC<{ href?: string; label: string; icon: React.ElementType; isCollapsed: boolean; isActive: boolean; onClick?: () => void; }> = 
  ({ href, label, icon: Icon, isCollapsed, isActive, onClick }) => {
  const content = (
    <div
      className={cn(
        'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
        isActive && 'bg-muted text-primary'
      )}
    >
      <Icon className="h-4 w-4" />
      {!isCollapsed && label}
    </div>
  );
  
  const linkOrButton = href ? (
    <Link href={href} onClick={onClick}>
      {content}
    </Link>
  ) : (
    <div onClick={onClick} className="cursor-pointer">
      {content}
    </div>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{linkOrButton}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }
  return linkOrButton;
};


function DashboardNavContent({ isCollapsed }: { isCollapsed: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme } = useTheme();
  const { settings } = useSettings();

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const Icon = availableIcons[settings.iconName as keyof typeof availableIcons] || Wrench;
  const siteName = settings.siteName || 'Gestor Elite';
  const logoURL = settings.logoURL;

  const mainNavItems = [
    { href: '/dashboard', label: 'Painel', icon: Home, flag: 'servicos' },
    { href: '/dashboard/servicos', label: 'Serviços', icon: ClipboardList, flag: 'servicos' },
    { href: '/dashboard/orcamentos', label: 'Orçamentos', icon: FileText, flag: 'orcamentos' },
    { href: '/dashboard/prazos', label: 'Prazos', icon: CalendarClock, flag: 'prazos' },
    { href: '/dashboard/atividades', label: 'Atividades', icon: Bell, flag: 'atividades' },
    { href: '/dashboard/base-de-clientes', label: 'Clientes', icon: Users, flag: 'clientes' },
    { href: '/dashboard/colaboradores', label: 'Colaboradores', icon: Briefcase, flag: 'colaboradores' },
    { href: '/dashboard/inventario', label: 'Inventário', icon: Package, flag: 'inventario' },
  ];
  
  return (
    <div className="flex h-full max-h-screen flex-col gap-2">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/dashboard" className="flex items-center gap-2 font-semibold">
           {logoURL ? (
            <Image src={logoURL} alt={siteName} width={24} height={24} className="h-6 w-6 object-contain" />
          ) : (
            <Icon className="h-6 w-6 text-primary" />
          )}
          {!isCollapsed && <span className="">{siteName}</span>}
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4 mt-2">
           {mainNavItems.map(({ href, label, icon, flag }) => {
              const showFeature = flag ? settings.featureFlags?.[flag as keyof typeof settings.featureFlags] !== false : true;
              if (!showFeature) return null;
              const isActive = (href === '/dashboard' && pathname === href) || (href.length > '/dashboard'.length && pathname.startsWith(href));
              return <NavLink key={href} href={href} label={label} icon={icon} isCollapsed={isCollapsed} isActive={isActive} />
            })}
        </nav>
      </div>
      <div className="mt-auto p-4 border-t">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4 gap-1">
          <NavLink href="/dashboard/configuracoes" label="Configurações" icon={Settings} isCollapsed={isCollapsed} isActive={pathname.startsWith('/dashboard/configuracoes')} />
          <NavLink href="/dashboard/subscription" label="Assinatura" icon={CreditCard} isCollapsed={isCollapsed} isActive={pathname.startsWith('/dashboard/subscription')} />
          
          <DropdownMenu>
            <Tooltip>
                <TooltipTrigger asChild>
                    <DropdownMenuTrigger asChild>
                        <button className='w-full'>
                            <NavLink label="Alterar Tema" icon={Sun} isCollapsed={isCollapsed} isActive={false} />
                        </button>
                    </DropdownMenuTrigger>
                </TooltipTrigger>
                {isCollapsed && <TooltipContent side="right">Alterar Tema</TooltipContent>}
            </Tooltip>
            <DropdownMenuContent side="right" align="start">
              <DropdownMenuItem onClick={() => setTheme('light')}>Claro</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('dark')}>Escuro</DropdownMenuItem>
              <DropdownMenuItem onClick={() => setTheme('system')}>Sistema</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <NavLink onClick={handleLogout} label="Sair" icon={LogOut} isCollapsed={isCollapsed} isActive={false} />
        </nav>
      </div>
    </div>
  );
}

// Hook to manage sidebar state, encapsulated within this component
const useSidebar = () => {
    const [isCollapsed, setIsCollapsed] = React.useState(false);
  
    React.useEffect(() => {
      try {
        const storedState = localStorage.getItem('sidebar-collapsed');
        if (storedState) {
          setIsCollapsed(JSON.parse(storedState));
        }
      } catch (e) {
        // In case of parsing error or if localStorage is unavailable
        console.error("Could not load sidebar state from localStorage", e);
      }
    }, []);

    const toggleSidebar = () => {
      setIsCollapsed(prevState => {
        const newState = !prevState;
        try {
          localStorage.setItem('sidebar-collapsed', JSON.stringify(newState));
        } catch (e) {
            console.error("Could not save sidebar state to localStorage", e);
        }
        return newState;
      });
    };
    
    return { isCollapsed, toggleSidebar };
};

export function DashboardSidebar() {
  const { isCollapsed, toggleSidebar } = useSidebar();
  
  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn("hidden border-r bg-card md:block", isCollapsed ? "w-[72px]" : "w-[280px]", "transition-all duration-300 ease-in-out")}>
        <div className="relative h-full">
          <DashboardNavContent isCollapsed={isCollapsed} />
          <Button onClick={toggleSidebar} variant="ghost" size="icon" className="absolute top-[14px] right-0 h-8 w-8">
            <ChevronsLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
          </Button>
        </div>
      </div>
      <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] md:hidden">
         <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
               <DashboardNavContent isCollapsed={false} />
            </SheetContent>
          </Sheet>
      </header>
    </TooltipProvider>
  );
}
