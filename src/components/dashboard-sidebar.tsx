
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


interface NavLinkProps {
  href: string;
  label: string;
  icon: React.ElementType;
  isCollapsed: boolean;
  isActive: boolean;
  onClick?: () => void;
  className?: string;
}

const NavLink: React.FC<NavLinkProps> = ({ href, label, icon: NavIcon, isCollapsed, isActive, onClick, className }) => {
  const linkContent = (
    <div className={cn(
      'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
      isActive && 'bg-muted text-primary',
      className
    )}>
      <NavIcon className="h-4 w-4" />
      {!isCollapsed && <span>{label}</span>}
    </div>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={href} onClick={onClick}>
            {linkContent}
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Link href={href} onClick={onClick}>
      {linkContent}
    </Link>
  );
};

const NavButton: React.FC<Omit<NavLinkProps, 'href'>> = ({ label, icon: NavIcon, isCollapsed, isActive, onClick, className }) => {
  const buttonContent = (
    <button className={cn(
      'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
      isActive && 'bg-muted text-primary',
      className
    )}>
      <NavIcon className="h-4 w-4" />
      {!isCollapsed && <span>{label}</span>}
    </button>
  );

  if (isCollapsed) {
    return (
       <Tooltip>
        <TooltipTrigger asChild onClick={onClick}>
          {buttonContent}
        </TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }
  
  return <div onClick={onClick}>{buttonContent}</div>
}


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
  const { setTheme, theme } = useTheme();

  const navItems = [
    { href: '/dashboard', label: 'Painel', icon: Home, flag: 'servicos' },
    { href: '/dashboard/servicos', label: 'Serviços', icon: ClipboardList, flag: 'servicos' },
    { href: '/dashboard/orcamentos', label: 'Orçamentos', icon: FileText, flag: 'orcamentos' },
    { href: '/dashboard/prazos', label: 'Prazos', icon: CalendarClock, flag: 'prazos' },
    { href: '/dashboard/atividades', label: 'Atividades', icon: Bell, flag: 'atividades' },
    { href: '/dashboard/base-de-clientes', label: 'Clientes', icon: Users, flag: 'clientes' },
    { href: '/dashboard/colaboradores', label: 'Colaboradores', icon: Briefcase, flag: 'colaboradores' },
    { href: '/dashboard/inventario', label: 'Inventário', icon: Package, flag: 'inventario' },
    { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
    { href: '/dashboard/subscription', label: 'Assinatura', icon: CreditCard },
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
            <nav className="grid items-start px-2 py-4 text-sm font-medium lg:px-4 gap-1">
                {navItems.map(({ href, label, icon: NavIcon, flag }) => {
                    const showFeature = flag ? settings.featureFlags?.[flag as keyof typeof settings.featureFlags] !== false : true;
                    if (!showFeature) return null;
                    const isActive = (href === '/dashboard' && pathname === href) || (href.length > '/dashboard'.length && pathname.startsWith(href));
                    return <NavLink key={href} href={href} label={label} icon={NavIcon} isCollapsed={isCollapsed} isActive={isActive} />
                })}

                 <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="w-full">
                      <NavButton
                          label="Alterar Tema"
                          icon={theme === 'dark' ? Moon : Sun}
                          isCollapsed={isCollapsed}
                          isActive={false}
                       />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start">
                    <DropdownMenuItem onClick={() => setTheme('light')}>Claro</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme('dark')}>Escuro</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setTheme('system')}>Sistema</DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <NavButton label="Sair" icon={LogOut} isCollapsed={isCollapsed} isActive={false} onClick={handleLogout} className="text-destructive hover:text-destructive" />
            </nav>
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
