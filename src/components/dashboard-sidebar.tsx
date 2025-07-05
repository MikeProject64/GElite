
'use client';

import Link from 'next/link';
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
} from 'lucide-react';
import { useAuth } from './auth-provider';
import { useSettings } from './settings-provider';
import { availableIcons } from './icon-map';
import { collection, query, where, onSnapshot, orderBy, limit, getDocs } from 'firebase/firestore';
import { RecentActivity } from '@/types';
import { useEffect, useState } from 'react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from './ui/dropdown-menu';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import Image from 'next/image';

function NotificationBell() {
    const { user } = useAuth();
    const router = useRouter();
    const [notifications, setNotifications] = useState<RecentActivity[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!user) return;
        setIsLoading(true);
        
        const queries = [
            query(collection(db, 'serviceOrders'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(5)),
            query(collection(db, 'customers'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(5)),
            query(collection(db, 'quotes'), where('userId', '==', user.uid), orderBy('createdAt', 'desc'), limit(5)),
        ];

        const fetchCombinedActivity = async () => {
            try {
                const [ordersSnap, customersSnap, quotesSnap] = await Promise.all([
                    getDocs(queries[0]),
                    getDocs(queries[1]),
                    getDocs(queries[2])
                ]);
                
                const ordersActivity: RecentActivity[] = ordersSnap.docs.map(doc => ({ id: doc.id, type: 'serviço', description: `Nova OS: ${doc.data().serviceType}`, timestamp: doc.data().createdAt.toDate(), href: `/dashboard/servicos/${doc.id}`}));
                const customersActivity: RecentActivity[] = customersSnap.docs.map(doc => ({ id: doc.id, type: 'cliente', description: `Novo cliente: ${doc.data().name}`, timestamp: doc.data().createdAt.toDate(), href: `/dashboard/base-de-clientes/${doc.id}`}));
                const quotesActivity: RecentActivity[] = quotesSnap.docs.map(doc => ({ id: doc.id, type: 'orçamento', description: `Orçamento para ${doc.data().clientName}`, timestamp: doc.data().createdAt.toDate(), href: `/dashboard/orcamentos/${doc.id}`}));
        
                const combined = [...ordersActivity, ...customersActivity, ...quotesActivity]
                    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
                    .slice(0, 5);
                
                setNotifications(combined);
            } catch (error) {
                console.error("Error fetching notifications", error);
            } finally {
                setIsLoading(false);
            }
        };

        const unsubscribes = queries.map(q => onSnapshot(q, () => {
            // This is just to trigger a refetch when any collection changes.
            fetchCombinedActivity();
        }));
        
        fetchCombinedActivity();

        return () => unsubscribes.forEach(unsub => unsub());

    }, [user]);

    const getIcon = (type: RecentActivity['type']) => {
        switch (type) {
            case 'cliente': return <Users className="h-4 w-4" />;
            case 'serviço': return <Wrench className="h-4 w-4" />;
            case 'orçamento': return <FileText className="h-4 w-4" />;
            default: return null;
        }
    };

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="relative">
                    <Bell className="h-4 w-4"/>
                    {!isLoading && notifications.length > 0 && (
                        <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                        </span>
                    )}
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-80">
                <DropdownMenuLabel>Notificações Recentes</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {isLoading ? (
                    <DropdownMenuItem disabled>Carregando...</DropdownMenuItem>
                ) : notifications.length > 0 ? (
                    notifications.map(n => (
                        <DropdownMenuItem key={n.id} className="flex items-start gap-2" onSelect={() => router.push(n.href)}>
                            <div className='text-muted-foreground mt-1'>{getIcon(n.type)}</div>
                            <div className='flex flex-col'>
                                <span className='text-sm whitespace-normal'>{n.description}</span>
                                <span className='text-xs text-muted-foreground'>{formatDistanceToNow(n.timestamp, { addSuffix: true, locale: ptBR })}</span>
                            </div>
                        </DropdownMenuItem>
                    ))
                ) : (
                    <DropdownMenuItem disabled>Nenhuma notificação recente.</DropdownMenuItem>
                )}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

function NavContent() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const { settings } = useSettings();

  const navItems = [
    { href: '/dashboard', label: 'Painel', icon: Home },
    { href: '/dashboard/servicos', label: 'Serviços', icon: ClipboardList },
    { href: '/dashboard/orcamentos', label: 'Orçamentos', icon: FileText },
    { href: '/dashboard/prazos', label: 'Prazos', icon: CalendarClock },
    { href: '/dashboard/atividades', label: 'Atividades', icon: Bell },
    { href: '/dashboard/base-de-clientes', label: 'Clientes', icon: Users },
    { href: '/dashboard/colaboradores', label: 'Colaboradores', icon: Briefcase },
    { href: '/dashboard/inventario', label: 'Inventário', icon: Package },
    { href: '/dashboard/configuracoes', label: 'Configurações', icon: Settings },
  ];

  const handleLogout = async () => {
    if (user) {
      const storageKey = `servicewise-settings-${user.uid}`;
      localStorage.removeItem(storageKey);
    }
    await signOut(auth);
    router.push('/');
  };

  const Icon = availableIcons[settings.iconName as keyof typeof availableIcons] || Wrench;
  const siteName = settings.siteName || 'ServiceWise';
  const logoURL = settings.logoURL;

  return (
    <div className="flex h-full max-h-screen flex-col gap-2">
      <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
        <Link href="/" className="flex items-center gap-2 font-semibold">
           {logoURL ? (
            <Image src={logoURL} alt="Logo" width={24} height={24} className="h-6 w-6" />
          ) : (
            <Icon className="h-6 w-6 text-primary" />
          )}
          <span className="">{siteName}</span>
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto">
        <nav className="grid items-start px-2 text-sm font-medium lg:px-4 mt-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            const isActive = (href.length > '/dashboard'.length && pathname.startsWith(href)) || pathname === href;
            return (
                <Link
                key={href}
                href={href}
                className={cn(
                    'flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary',
                    isActive ? 'bg-muted text-primary' : ''
                )}
                >
                <Icon className="h-4 w-4" />
                {label}
                </Link>
            )
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
            <NotificationBell />
          </div>
          <Button variant="ghost" className="w-full justify-start" onClick={handleLogout}>
             <LogOut className="mr-2 h-4 w-4" /> Sair
          </Button>
      </div>
    </div>
  );
}

export function DashboardSidebar() {
  const { settings } = useSettings();
  const Icon = availableIcons[settings.iconName as keyof typeof availableIcons] || Wrench;
  const siteName = settings.siteName || 'ServiceWise';
  const logoURL = settings.logoURL;

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
              <SheetTitle className="sr-only">Menu Principal</SheetTitle>
              <SheetDescription className="sr-only">Navegue pelas diferentes seções do aplicativo.</SheetDescription>
              <NavContent />
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
