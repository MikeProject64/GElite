'use client';

import { useState, useEffect } from 'react';
import { useAuth } from './auth-provider';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp, getDoc, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { AdminNotification, UserNotificationStatus } from '@/types';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export function NotificationModalProvider() {
  const { user } = useAuth();
  const [activeNotification, setActiveNotification] = useState<AdminNotification | null>(null);
  const [notificationStatusId, setNotificationStatusId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;

    const userNotificationsRef = collection(db, 'users', user.uid, 'notifications');
    const q = query(userNotificationsRef, where('read', '==', false), limit(1));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const userNotifDoc = snapshot.docs[0];
        const notificationId = userNotifDoc.id;

        // Fetch the main notification content efficiently
        const mainNotifRef = doc(db, 'admin_notifications', notificationId);
        const mainNotifSnap = await getDoc(mainNotifRef);
        
        if (mainNotifSnap.exists()) {
            setActiveNotification({ id: mainNotifSnap.id, ...mainNotifSnap.data() } as AdminNotification);
            setNotificationStatusId(notificationId);
        } else {
            // Handle case where user notification exists but main notif is deleted
             console.warn(`User notification ${notificationId} exists, but main notification is missing.`);
             // Mark as read to avoid loop
             await updateDoc(userNotifDoc.ref, { read: true, readAt: serverTimestamp() });
        }
      } else {
        setActiveNotification(null);
        setNotificationStatusId(null);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleCloseNotification = async () => {
    if (!user || !notificationStatusId) return;

    try {
      const userNotificationRef = doc(db, 'users', user.uid, 'notifications', notificationStatusId);
      await updateDoc(userNotificationRef, {
        read: true,
        readAt: serverTimestamp(),
      });
      // The listener will automatically clear the state
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  if (!activeNotification) {
    return null;
  }

  return (
    <Dialog open={!!activeNotification} onOpenChange={handleCloseNotification}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{activeNotification.title}</DialogTitle>
          <DialogDescription>
            {activeNotification.message}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
            <Button onClick={handleCloseNotification}>Fechar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 