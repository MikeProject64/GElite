'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc, collection, getDocs } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Papa from 'papaparse';

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Trash, UserPlus, Upload, X } from 'lucide-react';
import type { SystemUser } from '@/types';

interface ManageListDialogProps {
  listId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const addEmailSchema = z.object({
  email: z.string().email({ message: 'Email inválido.' }),
});
type AddEmailFormValues = z.infer<typeof addEmailSchema>;

export function ManageListDialog({ listId, open, onOpenChange }: ManageListDialogProps) {
  const { toast } = useToast();
  const [listName, setListName] = useState('');
  const [emails, setEmails] = useState<string[]>([]);
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const addEmailForm = useForm<AddEmailFormValues>({ resolver: zodResolver(addEmailSchema) });

  useEffect(() => {
    async function fetchData() {
      if (listId) {
        setIsLoading(true);
        // Fetch current list emails
        const listRef = doc(db, 'emailLists', listId);
        const listSnap = await getDoc(listRef);
        if (listSnap.exists()) {
          setListName(listSnap.data().name);
          setEmails(listSnap.data().emails || []);
        }

        // Fetch all system users
        const usersRef = collection(db, 'users');
        const usersSnap = await getDocs(usersRef);
        setSystemUsers(usersSnap.docs.map(d => ({ ...d.data(), uid: d.id } as SystemUser)));
        setIsLoading(false);
      }
    }
    fetchData();
  }, [listId]);

  const handleAddEmail = async ({ email }: AddEmailFormValues) => {
    if (!listId) return;
    const listRef = doc(db, 'emailLists', listId);
    await updateDoc(listRef, { emails: arrayUnion(email) });
    setEmails(prev => [...prev, email]);
    addEmailForm.reset();
  };
  
  const handleRemoveEmail = async (email: string) => {
    if (!listId) return;
    const listRef = doc(db, 'emailLists', listId);
    await updateDoc(listRef, { emails: arrayRemove(email) });
    setEmails(prev => prev.filter(e => e !== email));
  };
  
  const handleSelectSystemUsers = async (usersToAdd: string[]) => {
    if (!listId) return;
    const listRef = doc(db, 'emailLists', listId);
    await updateDoc(listRef, { emails: arrayUnion(...usersToAdd) });
    setEmails(prev => [...new Set([...prev, ...usersToAdd])]);
    toast({ description: `${usersToAdd.length} usuários adicionados.`});
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          const parsedEmails = results.data
            .map((row: any) => row.email || row.Email || row.EMAIL)
            .filter(email => z.string().email().safeParse(email).success);
          
          if (parsedEmails.length > 0) {
            await handleSelectSystemUsers(parsedEmails);
          } else {
            toast({ variant: 'destructive', title: 'Nenhum email válido encontrado no arquivo.' });
          }
        },
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Gerenciar Lista: {listName}</DialogTitle>
          <DialogDescription>
            Adicione ou remova contatos desta lista.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? <Loader2 className="mx-auto h-8 w-8 animate-spin my-8" /> : (
        <div className="grid grid-cols-2 gap-6">
          <div className="col-span-1 border-r pr-6">
            <h4 className="font-semibold mb-2">Contatos na Lista ({emails.length})</h4>
            <ScrollArea className="h-72">
                {emails.length > 0 ? (
                    emails.map(email => (
                        <div key={email} className="flex items-center justify-between text-sm p-2 hover:bg-muted rounded-md">
                            <span>{email}</span>
                            <TooltipProvider>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleRemoveEmail(email)}>
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </TooltipTrigger>
                                    <TooltipContent><p>Remover</p></TooltipContent>
                                </Tooltip>
                            </TooltipProvider>
                        </div>
                    ))
                ) : <p className="text-sm text-muted-foreground text-center mt-4">Nenhum email na lista.</p>}
            </ScrollArea>
          </div>
          <div className="col-span-1">
             <Tabs defaultValue="manual">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="manual">Manual</TabsTrigger>
                <TabsTrigger value="system">Do Sistema</TabsTrigger>
                <TabsTrigger value="file">Arquivo</TabsTrigger>
              </TabsList>
              <TabsContent value="manual" className="mt-4">
                 <Form {...addEmailForm}>
                    <form onSubmit={addEmailForm.handleSubmit(handleAddEmail)} className="flex gap-2">
                        <FormField control={addEmailForm.control} name="email"
                            render={({ field }) => (
                                <FormItem className="flex-grow">
                                    <FormControl><Input placeholder="contato@exemplo.com" {...field} /></FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                        <Button type="submit"><UserPlus className="h-4 w-4" /></Button>
                    </form>
                 </Form>
              </TabsContent>
              <TabsContent value="system" className="mt-4">
                 <SystemUserSelector users={systemUsers} onAddSelected={handleSelectSystemUsers} />
              </TabsContent>
              <TabsContent value="file" className="mt-4">
                <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-md">
                    <Upload className="h-8 w-8 text-muted-foreground mb-2"/>
                    <p className="text-sm text-muted-foreground mb-2">Arraste um arquivo CSV ou clique.</p>
                    <Input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" id="csv-upload" />
                    <Button asChild><label htmlFor="csv-upload">Escolher Arquivo</label></Button>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}


function SystemUserSelector({ users, onAddSelected }: { users: SystemUser[], onAddSelected: (emails: string[]) => void }) {
    const [selectedUsers, setSelectedUsers] = useState<Record<string, boolean>>({});
    
    const handleAdd = () => {
        const emailsToAdd = Object.keys(selectedUsers).filter(uid => selectedUsers[uid]).map(uid => users.find(u => u.uid === uid)!.email);
        onAddSelected(emailsToAdd);
        setSelectedUsers({});
    };

    return (
        <div>
            <ScrollArea className="h-64 border rounded-md p-2">
                {users.map(user => (
                    <div key={user.uid} className="flex items-center space-x-2 p-1">
                        <Checkbox 
                            id={user.uid} 
                            checked={!!selectedUsers[user.uid]}
                            onCheckedChange={(checked) => setSelectedUsers(prev => ({...prev, [user.uid]: !!checked}))}
                        />
                        <label htmlFor={user.uid} className="text-sm font-medium leading-none">{user.email}</label>
                    </div>
                ))}
            </ScrollArea>
             <Button onClick={handleAdd} className="w-full mt-2" disabled={Object.values(selectedUsers).every(v => !v)}>
                Adicionar Selecionados
            </Button>
        </div>
    );
} 