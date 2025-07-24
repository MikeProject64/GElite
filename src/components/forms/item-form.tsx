'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { Button } from '@/components/ui/button';
import { DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const itemFormSchema = z.object({
  name: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
  description: z.string().optional(),
  quantity: z.coerce.number().min(0, { message: 'A quantidade inicial não pode ser negativa.' }),
  cost: z.coerce.number().min(0, { message: 'O custo não pode ser negativo.' }),
  minStock: z.coerce.number().min(0, { message: 'O estoque mínimo não pode ser negativo.' }).optional(),
});

type ItemFormValues = z.infer<typeof itemFormSchema>;

interface ItemFormProps {
    onSuccess: () => void;
}

export function ItemForm({ onSuccess }: ItemFormProps) {
    const { activeAccountId } = useAuth();
    const { toast } = useToast();

    const form = useForm<ItemFormValues>({
        resolver: zodResolver(itemFormSchema),
        defaultValues: { name: '', description: '', quantity: 0, cost: 0, minStock: 0 },
    });

    const onSubmit = async (data: ItemFormValues) => {
        if (!activeAccountId) {
            toast({ variant: "destructive", title: "Erro", description: "Você precisa estar logado." });
            return;
        }
        
        try {
          const itemPayload = {
            name: data.name,
            description: data.description || '',
            quantity: data.quantity,
            initialQuantity: data.quantity,
            cost: data.cost,
            minStock: data.minStock || 0,
            userId: activeAccountId,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            photoURL: '',
          };
          const itemRef = await addDoc(collection(db, 'inventory'), itemPayload);
    
          if (data.quantity > 0) {
              await addDoc(collection(db, 'inventoryMovements'), {
                  itemId: itemRef.id,
                  userId: activeAccountId,
                  type: 'entrada',
                  quantity: data.quantity,
                  notes: 'Estoque inicial',
                  createdAt: Timestamp.now(),
                  attachments: []
              });
          }
          
          toast({ title: "Sucesso!", description: "Item adicionado ao inventário." });
          onSuccess();
        } catch (error) {
          console.error("Error adding document: ", error);
          toast({
            variant: "destructive",
            title: "Erro ao salvar",
            description: `Falha ao salvar o item.`
          });
        }
      };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                <FormLabel>Nome do Item *</FormLabel>
                <FormControl><Input placeholder="Ex: Filtro de Ar" {...field} /></FormControl>
                <FormMessage />
                </FormItem>
            )}/>
            <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem>
                <FormLabel>Descrição</FormLabel>
                <FormControl><Textarea placeholder="Ex: Filtro de Ar Condicionado automotivo..." {...field} /></FormControl>
                <FormMessage />
                </FormItem>
            )}/>
            <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem>
                    <FormLabel>Qtd. Inicial *</FormLabel>
                    <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}/>
                <FormField control={form.control} name="minStock" render={({ field }) => (
                <FormItem>
                    <FormLabel>Qtd. Mínima</FormLabel>
                    <FormControl><Input type="number" placeholder="0" {...field} /></FormControl>
                    <FormMessage />
                </FormItem>
                )}/>
            </div>
            <FormField control={form.control} name="cost" render={({ field }) => (
                <FormItem>
                <FormLabel>Custo por Unidade (R$) *</FormLabel>
                <FormControl><Input type="number" step="0.01" placeholder="0.00" {...field} /></FormControl>
                <FormMessage />
                </FormItem>
            )}/>
            <DialogFooter className='pt-4'>
                <Button type="button" variant="ghost" onClick={onSuccess}>Cancelar</Button>
                <Button type="submit" disabled={form.formState.isSubmitting}>
                    {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Salvar Item
                </Button>
            </DialogFooter>
            </form>
        </Form>
    );
} 