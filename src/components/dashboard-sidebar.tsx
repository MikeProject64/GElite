'use client';

import Link from 'next/link';
import Image from 'next/image';
import React, { useState, useEffect } from 'react';
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
  ChevronDown,
} from 'lucide-react';
import { useAuth } from './auth-provider';
import { useTheme } from 'next-themes';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { icons } from 'lucide-react';
import { useSettings } from '@/components/settings-provider';
import { availableIcons } from './icon-map';


// Padronizar tamanho dos ícones e espaçamento para compacto
const ICON_SIZE = 'h-5 w-5'; // Aumentado de h-4 w-4

// Mapeia nomes de ícones (string) para componentes React
const IconMap = icons;

type AppFunction = {
  id: string;
  name: string;
  href: string;
  isActive: boolean;
};

type NavMenuItem = {
  label: string;
  icon: string;
  href?: string;
  subItems?: NavMenuItem[];
  enabled?: boolean;
  id: string;
  functionId?: string;
};

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

const CollapsibleNavItem: React.FC<{
  label: string;
  icon: React.ElementType;
  isCollapsed: boolean;
  children: React.ReactNode;
  pathname: string;
  subItems: { href: string; flag?: string }[];
}> = ({ label, icon: Icon, isCollapsed, children, pathname, subItems }) => {
  // A section is active if any of its sub-items are active
  const isActive = subItems.some(item => pathname.startsWith(item.href));
  const [isOpen, setIsOpen] = React.useState(isActive);

  React.useEffect(() => {
    // Collapse the menu when the sidebar is collapsed
    if (isCollapsed) {
      setIsOpen(false);
    }
  }, [isCollapsed]);

  const trigger = (
    <div
      className={cn(
        'flex h-9 w-full items-center justify-between rounded-md px-3 py-1 text-muted-foreground transition-all hover:text-primary',
        isCollapsed && 'justify-center',
        isActive && 'font-semibold text-primary'
      )}
    >
      <div className="flex items-center gap-3">
        <Icon className={`${ICON_SIZE} shrink-0`} />
        <span className={cn('truncate text-base font-medium', isCollapsed && 'sr-only')}>{label}</span>
      </div>
      {!isCollapsed && (
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 transition-transform duration-200', isOpen && 'rotate-180')}
        />
      )}
    </div>
  );

  if (isCollapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{trigger}</TooltipTrigger>
        <TooltipContent side="right">{label}</TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <CollapsibleTrigger asChild>
        <button className="w-full">{trigger}</button>
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <div className={cn('ml-4 flex flex-col gap-1 border-l py-1 pl-4')}>
          {children}
        </div>
      </CollapsibleContent>
    </Collapsible>
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
  const { systemUser, loading: authLoading } = useAuth();
  const { setTheme } = useTheme();
  const { settings } = useSettings();
  const iconKey = (settings.iconName && settings.iconName in availableIcons) ? settings.iconName : 'Wrench';
  const Icon = availableIcons[iconKey as keyof typeof availableIcons];
  const [navMenu, setNavMenu] = useState<any[]>([]);
  const [systemNavItems, setSystemNavItems] = useState<any[]>([]);
  const [allowedFunctions, setAllowedFunctions] = useState<string[]>([]);
  const [availableFunctions, setAvailableFunctions] = useState<AppFunction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) {
      return; // Aguarda a autenticação terminar
    }
    if (!systemUser || !systemUser.planId) {
      setIsLoading(false);
      // Opcional: Redirecionar se não houver plano, ou mostrar menu limitado
      return;
    }

    const unsubscribes: (() => void)[] = [];

    // 1. Carregar configuração do menu
    const menuConfigRef = doc(db, 'siteConfig', 'menu');
    unsubscribes.push(onSnapshot(menuConfigRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setNavMenu(data.navMenu || []);
        setSystemNavItems(data.systemNavItems || []);
        setAvailableFunctions(data.availableFunctions || []);
      }
    }));

    // 2. Carregar o plano do usuário para saber as funções permitidas
    const planRef = doc(db, 'plans', systemUser.planId);
    unsubscribes.push(onSnapshot(planRef, (docSnap) => {
        if (docSnap.exists()) {
            const planData = docSnap.data();
            setAllowedFunctions(planData.allowedFunctions || []);
        }
        setIsLoading(false); // Termina o loading aqui
    }));

    return () => unsubscribes.forEach(unsub => unsub());
  }, [systemUser, authLoading]);


  const handleLogout = async () => {
    // Navigate away first to trigger component unmounts and listener cleanup
    router.push('/login');
    // Then sign out
    await signOut(auth);
  };

  type NavMenuItem = {
    label: string;
    icon: string; // Ícone agora é uma string
    href?: string;
    subItems?: NavMenuItem[];
    enabled?: boolean;
    id: string;
    functionId?: string;
  };
  
  const getFunctionById = (id: string) => availableFunctions.find(f => f.id === id);

  const renderNavItems = React.useCallback((items: NavMenuItem[]) => {
    return items
      .filter(item => {
        // Regra 1: O item precisa estar habilitado no editor de menu
        if (item.enabled === false) return false;

        const isGroup = item.subItems && item.subItems.length > 0;

        // Regra 2: Se for um grupo, verifica se algum dos seus filhos é permitido
        if (isGroup) {
          return item.subItems!.some(subItem => {
            if (subItem.enabled === false || !subItem.functionId) return false;
            return allowedFunctions.includes(subItem.functionId);
          });
        }
        
        // Regra 3: Se for um item individual, verifica se ele tem uma função e se essa função é permitida
        if (item.functionId) {
          return allowedFunctions.includes(item.functionId);
        }
        
        // Regra 4: Itens sem functionId (ex: links estáticos que podem existir no futuro) são permitidos por padrão
        // mas atualmente nossa lógica não os cria.
        return true; 
      })
      .map((item) => {
        const isGroup = item.subItems && item.subItems.length > 0;
        const IconComponent = IconMap[item.icon as keyof typeof IconMap] || icons.Wrench;

        if (isGroup) {
          // Filtra sub-itens que não são permitidos ou estão desabilitados antes de passar para o CollapsibleNavItem
          const visibleSubItems = item.subItems!.filter(subItem => 
            subItem.enabled !== false && subItem.functionId && allowedFunctions.includes(subItem.functionId)
          );
          
          if (visibleSubItems.length === 0) return null; // Segurança extra, embora o filtro pai já deva ter cuidado disso

          return (
            <CollapsibleNavItem
              key={item.id}
              label={item.label}
              icon={IconComponent}
              isCollapsed={isCollapsed}
              pathname={pathname}
              subItems={visibleSubItems.map(si => {
                const func = getFunctionById(si.functionId!);
                return { href: func?.href || '#' };
              })}
            >
              {renderNavItems(visibleSubItems)}
            </CollapsibleNavItem>
          );
        }
        
        const func = item.functionId ? getFunctionById(item.functionId) : null;
        if (func?.href) {
          const isActive = (func.href === '/dashboard' && pathname === func.href) || (func.href.length > '/dashboard'.length && pathname.startsWith(func.href));
          return <NavItem key={func.href} href={func.href} label={item.label} icon={IconComponent} isCollapsed={isCollapsed} isActive={isActive} onClick={onLinkClick} />;
        }

        return null;
      });
  }, [isCollapsed, pathname, onLinkClick, allowedFunctions, availableFunctions]);

  if (isLoading || authLoading) {
    // Pode adicionar um skeleton loader aqui se desejar
    return (
        <div className="p-4 space-y-4">
            <div className="h-8 bg-muted rounded w-full"></div>
            <div className="h-8 bg-muted rounded w-full"></div>
            <div className="h-8 bg-muted rounded w-full"></div>
        </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center border-b px-4 lg:h-[60px]">
        <Link href="/dashboard" className={cn("flex items-center gap-2 font-semibold", isCollapsed && 'justify-center')}>
          <Icon className="h-7 w-7 text-primary" />
          {!isCollapsed && <span className="font-bold text-lg truncate">{settings.siteName || 'Gestor Elite'}</span>}
        </Link>
      </div>

      <div className="flex-1 overflow-y-auto sidebar-scroll-content">
        <nav className="flex h-full flex-col px-2 py-4 text-base font-medium">
          <div className="space-y-1">
            {renderNavItems(navMenu)}
          </div>

          {/* Bottom Navigation Items Wrapper */}
          <div className="mt-auto space-y-1 border-t pt-4 -mx-2">
              <div className='px-2'>
                {renderNavItems(systemNavItems)}
                
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
  const { settings } = useSettings();
  const iconKey = (settings.iconName && settings.iconName in availableIcons) ? settings.iconName : 'Wrench';
  const Icon = availableIcons[iconKey as keyof typeof availableIcons];
  const [isSheetOpen, setIsSheetOpen] = React.useState(false);
  
  return (
    <TooltipProvider delayDuration={0}>
      <div className={cn("hidden border-r bg-card md:flex md:flex-col", isCollapsed ? "w-[80px]" : "w-[280px]", "transition-all duration-300 ease-in-out relative group")}> 
        {/* Topo com nome e ícone do site - apenas uma vez! */}
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
