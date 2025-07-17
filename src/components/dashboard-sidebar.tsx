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
  ChevronsLeft,
  ClipboardList,
  Menu,
  FileSignature,
  User,
  LifeBuoy,
  GraduationCap,
  LayoutDashboard,
  ShoppingCart,
  Calendar,
  BarChart2,
  BookOpen,
  Truck,
  MessageSquare,
} from 'lucide-react';
import { useAuth } from './auth-provider';
import { useSettings } from './settings-provider';
import { availableIcons } from './icon-map';
import { useTheme } from 'next-themes';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';


// Padronizar tamanho dos ícones e espaçamento para compacto
const ICON_SIZE = 'h-5 w-5'; // Aumentado de h-4 w-4

const NavItem: React.FC<{
  href: string;
  label: string;
  icon: React.ElementType;
  isCollapsed: boolean;
  isActive: boolean;
  onClick?: () => void;
}> = ({ href, label, icon: Icon, isCollapsed, isActive, onClick }) => {
  const linkContent = (
    <Link
      href={href}
      onClick={onClick}
      className={cn(
        'flex h-9 items-center justify-start gap-3 rounded-md px-3 py-1 text-muted-foreground transition-all hover:text-primary', // Reduzido h-12->h-9, py-2->1, rounded-lg->md
        isCollapsed && 'justify-center',
        isActive && 'bg-muted text-primary'
      )}
    >
      <Icon className={`${ICON_SIZE} shrink-0`} />
      <span className={cn('truncate text-base font-medium', isCollapsed && 'sr-only')}>{label}</span>
    </Link>
  );

  return isCollapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>{linkContent}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  ) : (
    linkContent
  );
};


const NavActionButton: React.FC<{
  label: string;
  icon: React.ReactNode;
  isCollapsed: boolean;
  onClick?: () => void;
  children?: React.ReactNode;
}> = ({ label, icon, isCollapsed, onClick, children }) => {
  const buttonContent = (
    <button
      onClick={onClick}
      className={cn(
        'flex h-9 w-full items-center gap-3 rounded-md px-3 py-1 text-muted-foreground transition-all hover:text-primary', // Reduzido h-12->h-9, py-2->1, rounded-lg->md
        isCollapsed && 'justify-center'
      )}
    >
      <span className="flex items-center gap-3">
        {React.cloneElement(icon as React.ReactElement, { className: ICON_SIZE + ' shrink-0' })}
        <span className={cn('truncate text-base font-medium', isCollapsed && 'sr-only')}>{label}</span>
      </span>
    </button>
  );

  const button = children ? (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{buttonContent}</DropdownMenuTrigger>
      {children}
    </DropdownMenu>
  ) : (
    buttonContent
  );

  return isCollapsed ? (
    <Tooltip>
      <TooltipTrigger asChild>{button}</TooltipTrigger>
      <TooltipContent side="right">{label}</TooltipContent>
    </Tooltip>
  ) : (
    button
  );
};


function DashboardNavContent({ isCollapsed, onLinkClick }: { isCollapsed: boolean, onLinkClick?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { setTheme } = useTheme();
  const { user } = useAuth();
  const { settings } = useSettings();

  const handleLogout = async () => {
    // Navigate away first to trigger component unmounts and listener cleanup
    router.push('/login');
    // Then sign out
    await signOut(auth);
  };

  const Icon = availableIcons[settings.iconName as keyof typeof availableIcons] || Wrench;
  const siteName = settings.siteName || 'Gestor Elite';
  const logoURL = settings.logoURL;

  const mainNavItems = [
    { href: '/dashboard', label: 'Painel', icon: Home, flag: 'servicos' },
    { href: '/dashboard/servicos', label: 'Serviços', icon: ClipboardList, flag: 'servicos' },
    { href: '/dashboard/orcamentos', label: 'Orçamentos', icon: FileText, flag: 'orcamentos' },
    { href: '/dashboard/contratos', label: 'Contratos', icon: FileSignature, flag: 'contratos' },
    { href: '/dashboard/prazos', label: 'Prazos', icon: CalendarClock, flag: 'prazos' },
    { href: '/dashboard/atividades', label: 'Atividades', icon: Bell, flag: 'atividades' },
    { href: '/dashboard/base-de-clientes', label: 'Clientes', icon: Users, flag: 'clientes' },
    { href: '/dashboard/colaboradores', label: 'Equipe', icon: Briefcase, flag: 'colaboradores' },
    { href: '/dashboard/inventario', label: 'Estoque', icon: Package, flag: 'inventario' },
    { href: '/dashboard/whatsapp', label: 'WhatsApp', icon: MessageSquare, flag: 'whatsapp' },
  ];
  
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center border-b px-4 lg:h-[60px]">
        <Link href="/dashboard" className={cn("flex items-center gap-2 font-semibold", isCollapsed && 'justify-center')}>
           {logoURL ? (
            <Image src={logoURL} alt={siteName} width={24} height={24} className="h-6 w-6 object-contain" />
          ) : (
            <Icon className="h-6 w-6 text-primary" />
          )}
          <span className={cn(isCollapsed && 'sr-only')}>{siteName}</span>
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto sidebar-scroll-content">
        <nav className="flex h-full flex-col px-2 py-4 text-base font-medium">
          <div className="space-y-1">
            {/* Main Navigation Items */}
            {mainNavItems.map(({ href, label, icon, flag }) => {
                const showFeature = settings.featureFlags?.[flag as keyof typeof settings.featureFlags] !== false;
                if (!showFeature) return null;
                const isActive = (href === '/dashboard' && pathname === href) || (href.length > '/dashboard'.length && pathname.startsWith(href));
                return <NavItem key={href} href={href} label={label} icon={icon} isCollapsed={isCollapsed} isActive={isActive} onClick={onLinkClick} />
            })}
          </div>

          {/* Bottom Navigation Items Wrapper */}
          <div className="mt-auto space-y-1 border-t pt-4 -mx-2">
              <div className='px-2'>
                <NavItem href="/dashboard/configuracoes" label="Configurações" icon={Settings} isCollapsed={isCollapsed} isActive={pathname.startsWith('/dashboard/configuracoes')} onClick={onLinkClick}/>
                <NavItem href="/dashboard/plans" label="Assinatura" icon={CreditCard} isCollapsed={isCollapsed} isActive={pathname.startsWith('/dashboard/plans')} onClick={onLinkClick}/>
                <NavItem href="/dashboard/perfil" label="Meu Perfil" icon={User} isCollapsed={isCollapsed} isActive={pathname.startsWith('/dashboard/perfil')} onClick={onLinkClick}/>
                <NavItem href="/dashboard/tutoriais" label="Tutoriais" icon={GraduationCap} isCollapsed={isCollapsed} isActive={pathname.startsWith('/dashboard/tutoriais')} onClick={onLinkClick}/>
                
                <NavActionButton
                  label="Sair"
                  icon={<LogOut />}
                  isCollapsed={isCollapsed}
                  onClick={handleLogout}
                />
              </div>
          </div>
        </nav>
      </div>
    </div>
  );
}

const useSidebar = () => {
    const [isCollapsed, setIsCollapsed] = React.useState(false);
  
    React.useEffect(() => {
      try {
        const storedState = localStorage.getItem('sidebar-collapsed');
        if (storedState) {
          setIsCollapsed(JSON.parse(storedState));
        }
      } catch (e) {
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
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  
  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn("hidden border-r bg-card md:flex md:flex-col", isCollapsed ? "w-[80px]" : "w-[280px]", "transition-all duration-300 ease-in-out relative group")}>
          <DashboardNavContent isCollapsed={isCollapsed} />
          <Button onClick={toggleSidebar} variant="ghost" size="icon" className="absolute top-[14px] -right-4 h-8 w-8 rounded-full border bg-card hover:bg-muted">
            <ChevronsLeft className={cn("h-4 w-4 transition-transform", isCollapsed && "rotate-180")} />
          </Button>
      </div>
      <header className="flex h-14 items-center gap-4 border-b bg-card px-4 lg:h-[60px] md:hidden">
         <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="shrink-0">
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle navigation menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="flex flex-col p-0">
               <DashboardNavContent isCollapsed={false} onLinkClick={() => setIsSheetOpen(false)} />
            </SheetContent>
          </Sheet>
      </header>
    </TooltipProvider>
  );
}
