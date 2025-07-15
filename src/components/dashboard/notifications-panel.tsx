'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { db } from '@/lib/firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, writeBatch, serverTimestamp, orderBy } from 'firebase/firestore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BellRing, X, Inbox } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface UserNotification {
  id: string;
  title: string;
  message: string;
  createdAt: any;
  actionUrl?: string;
  actionText?: string;
}

export function NotificationsPanel() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }

    const userNotificationsRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(userNotificationsRef, where('read', '==', false), orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const unreadNotifications = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as UserNotification));
      setNotifications(unreadNotifications);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching notifications:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleMarkAsRead = async (notificationId: string) => {
    if (!user) return;
    const userNotificationRef = doc(db, 'users', user.uid, 'notifications', notificationId);
    await updateDoc(userNotificationRef, { read: true, readAt: serverTimestamp() });
  };

  const handleClearAll = async () => {
    if (!user || notifications.length === 0) return;
    const batch = writeBatch(db);
    notifications.forEach(notif => {
      const ref = doc(db, 'users', user.uid, 'notifications', notif.id);
      batch.update(ref, { read: true, readAt: serverTimestamp() });
    });
    await batch.commit();
  };

  if (isLoading) {
    // Retorna um skeleton que ocupa o espaço para não quebrar o layout
    return (
        <Card className="md:col-span-2 lg:col-span-3 xl:col-span-4">
            <CardHeader><Skeleton className="h-6 w-48" /></CardHeader>
            <CardContent><Skeleton className="h-24 w-full" /></CardContent>
        </Card>
    );
  }

  if (notifications.length === 0) {
    return null; // Não renderiza nada se não houver notificações
  }

  return (
    <Card className="h-[350px] flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <BellRing className="h-6 w-6 text-primary" />
          <div>
            <CardTitle>Notificações</CardTitle>
            <CardDescription>
                Você tem {notifications.length} {notifications.length === 1 ? 'nova notificação' : 'novas notificações'}.
            </CardDescription>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleClearAll}>Limpar Tudo</Button>
      </CardHeader>
      <CardContent className="flex-grow overflow-y-auto">
        <div className="space-y-4">
          {notifications.map((notif) => (
            <div key={notif.id} className="flex items-start justify-between p-4 rounded-lg border bg-background/60">
              <div>
                <h4 className="font-semibold">{notif.title}</h4>
                <p className="text-sm text-muted-foreground">{notif.message}</p>
                {notif.actionUrl && (
                  <Button asChild size="sm" className="mt-3">
                    <Link href={notif.actionUrl} target="_blank">{notif.actionText || 'Ver Mais'}</Link>
                  </Button>
                )}
              </div>
              <Button variant="ghost" size="icon" className="ml-4 flex-shrink-0" onClick={() => handleMarkAsRead(notif.id)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
} 