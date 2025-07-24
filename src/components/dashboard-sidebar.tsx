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
import { useAuth, AppFunction } from './auth-provider'; // Importa AppFunction do provider
import { useTheme } from 'next-themes';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from './ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { doc, onSnapshot, query, collection, where, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { icons } from 'lucide-react';
import { useSettings } from '@/components/settings-provider';
import { availableIcons } from './icon-map';


// Padronizar tamanho dos ícones e espaçamento para compacto
const ICON_SIZE = 'h-4 w-4'; // Reduzido de h-5 w-5

// Mapeia nomes de ícones (string) para componentes React
const IconMap = icons;

/*
// REMOVIDO: AppFunction agora é importado do auth-provider
type AppFunction = {
  id: string;
  name: string;
  href: string;
  isActive: boolean;
};
*/

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
      <span className={cn('truncate text-sm font-medium', isCollapsed && 'sr-only')}>{label}</span>
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
  isActive: boolean; // Adicionado para controle externo
}> = ({ label, icon: Icon, isCollapsed, children, pathname, subItems, isActive }) => {
  // A section is active if any of its sub-items are active
  // const isActive = subItems.some(item => pathname.startsWith(item.href)); // Lógica movida para o chamador
  const [isOpen, setIsOpen] = React.useState(isActive);

  React.useEffect(() => {
    setIsOpen(isActive);
  }, [isActive]);

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
        <span className={cn('truncate text-sm font-medium', isCollapsed && 'sr-only')}>{label}</span>
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
        <span className={cn('truncate text-sm font-medium', isCollapsed && 'sr-only')}>{label}</span>
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
  const { systemUser, loading: authLoading, userPlan, availableFunctions, effectiveAllowedFunctions } = useAuth(); // <-- ATUALIZADO
  const { setTheme } = useTheme();
  const { settings } = useSettings();
  const iconKey = (settings.iconName && settings.iconName in availableIcons) ? settings.iconName : 'Wrench';
  const Icon = availableIcons[iconKey as keyof typeof availableIcons];
  const [navMenu, setNavMenu] = useState<any[]>([]);
  const [systemNavItems, setSystemNavItems] = useState<any[]>([]);
  const [footerNavMenu, setFooterNavMenu] = useState<NavMenuItem[]>([]);
  // const [effectiveAllowedFunctions, setEffectiveAllowedFunctions] = useState<string[]>([]); <-- REMOVIDO
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return; // Aguarda a autenticação e o carregamento dos dados base
    setIsLoading(true); // Começa a carregar o menu

    const menuConfigRef = doc(db, 'siteConfig', 'menu');
    const unsubscribe = onSnapshot(menuConfigRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setNavMenu(data.navMenu || []);
        setSystemNavItems(data.systemNavItems || []);
        setFooterNavMenu(data.footerNavMenu || []);
      }
      setIsLoading(false); // Termina de carregar o menu
    });

    return () => unsubscribe();
  }, [authLoading]);


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

  const hasVisibleChildren = (item: NavMenuItem): boolean => {
    if (item.enabled === false) return false;

    const isLink = !!item.functionId;
    const isGroup = !!item.subItems && item.subItems.length > 0;

    if (isLink) {
        return effectiveAllowedFunctions.includes(item.functionId!);
    }

    if (isGroup) {
        return item.subItems!.some(hasVisibleChildren);
    }
    
    // Itens que não são nem link nem grupo (grupos vazios)
    return false;
  };

  const renderNavItems = React.useCallback((items: NavMenuItem[]) => {
    return items
      .filter(hasVisibleChildren) // Usa a nova função de filtro recursivo
      .map((item) => {
        const IconComponent = IconMap[item.icon as keyof typeof IconMap] || icons.Wrench;
        const isLink = !!item.functionId;
        const isGroup = !!item.subItems && item.subItems.length > 0;
        
        // Caso 1: Item é um link (pode ou não ser um "grupo" no editor, mas funcionalmente é um link)
        if (isLink) {
          const func = getFunctionById(item.functionId!);
          if (!func) return null;
          const isActive = pathname === func.href;
          return <NavItem key={item.id} href={func.href} label={item.label} icon={IconComponent} isCollapsed={isCollapsed} isActive={isActive} onClick={onLinkClick} />;
        }
        
        // Caso 2: Item é um grupo puro (sem link)
        if (isGroup) {
          const isActive = item.subItems!.some(child => hasVisibleChildren(child) && getFunctionById(child.functionId!)?.href === pathname);

          return (
            <CollapsibleNavItem
              key={item.id}
              label={item.label}
              icon={IconComponent}
              isCollapsed={isCollapsed}
              pathname={pathname}
              subItems={item.subItems!.map(si => ({ href: getFunctionById(si.functionId!)?.href || '#' }))}
              isActive={isActive}
            >
              {renderNavItems(item.subItems!)}
            </CollapsibleNavItem>
          );
        }

        return null; // Caso de um item que não é nem link nem grupo
      });
  }, [isCollapsed, pathname, onLinkClick, effectiveAllowedFunctions, availableFunctions]);

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
          <div className="mt-auto space-y-1">
              <div className='pt-4 border-t -mx-2 px-2'>
                {renderNavItems(footerNavMenu)}
                
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
      <div className={cn("hidden border-r bg-card md:flex md:flex-col", isCollapsed ? "w-[80px]" : "w-[300px]", "transition-all duration-300 ease-in-out relative group z-40")}> 
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
