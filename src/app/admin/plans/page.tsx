
'use client';

import { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, query, onSnapshot, orderBy, doc, updateDoc, deleteDoc, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/auth-provider';
import { syncPlanWithStripe } from './actions';

import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Loader2, MoreHorizontal, PlusCircle, CreditCard, Trash2, DollarSign, CheckCircle, Star, X } from 'lucide-react';
import type { Plan } from '@/types';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';

// Definição do tipo para os grupos de menu
type MenuGroup = {
  id: string;
  label: string;
};

const planFormSchema = z.object({
  name: z.string().min(3, { message: 'O nome do plano deve ter pelo menos 3 caracteres.' }),
  description: z.string().optional(),
  monthlyPrice: z.coerce.number().min(0, { message: 'O preço mensal não pode ser negativo.' }),
  yearlyPrice: z.coerce.number().min(0, { message: 'O preço anual não pode ser negativo.' }),
  isPublic: z.boolean().default(true),
  isTrial: z.boolean().default(false),
  allowedGroups: z.record(z.boolean()).default({}),
  planItems: z.array(z.object({ value: z.string().min(1, 'O item não pode estar vazio.') })).default([]),
  stripeProductId: z.string().optional(),
  stripeMonthlyPriceId: z.string().optional(),
  stripeYearlyPriceId: z.string().optional(),
});

type PlanFormValues = z.infer<typeof planFormSchema>;

const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

export default function AdminPlansPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [plans, setPlans] = useState<Plan[]>([]);
  const [menuGroups, setMenuGroups] = useState<MenuGroup[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [deletingPlanId, setDeletingPlanId] = useState<string | null>(null);

  const form = useForm<PlanFormValues>({
    resolver: zodResolver(planFormSchema),
    defaultValues: {
      name: '',
      description: '',
      monthlyPrice: 0,
      yearlyPrice: 0,
      isPublic: true,
      isTrial: false,
      allowedGroups: {},
      planItems: [],
      stripeProductId: '',
      stripeMonthlyPriceId: '',
      stripeYearlyPriceId: '',
    },
  });
  
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "planItems"
  });

  // Carregar grupos de menu
  useEffect(() => {
    const menuConfigRef = doc(db, 'siteConfig', 'menu');
    const unsubscribe = onSnapshot(menuConfigRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        const groups = (data.navMenu || [])
            .filter((item: any) => item.subItems && item.subItems.length > 0)
            .map((item: any) => ({ id: item.id, label: item.label }));
        setMenuGroups(groups);
      }
    });
    return () => unsubscribe();
  }, []);

  // Carregar planos
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    const q = query(collection(db, 'plans'), orderBy('monthlyPrice', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const planList = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Plan));
      setPlans(planList);
      setIsLoading(false);
    }, (error: any) => {
        console.error("Error fetching plans: ", error);
        toast({ variant: "destructive", title: "Erro", description: "Não foi possível carregar os planos." });
        setIsLoading(false);
    });
    return () => unsubscribe();
  }, [user, toast]);
  
  useEffect(() => {
    if (isDialogOpen) {
      if (editingPlan) {
        const defaultGroups = menuGroups.reduce((acc, group) => ({...acc, [group.id]: false}), {});
        const allowedGroups = {...defaultGroups, ...editingPlan.allowedGroups};
        form.reset({
            ...editingPlan,
            allowedGroups,
        });
      } else {
        form.reset({
          name: '', description: '', monthlyPrice: 0, yearlyPrice: 0, isPublic: true, isTrial: false,
          allowedGroups: menuGroups.reduce((acc, group) => ({...acc, [group.id]: false}), {}),
          planItems: [],
          stripeProductId: '', stripeMonthlyPriceId: '', stripeYearlyPriceId: '',
        });
      }
    }
  }, [isDialogOpen, editingPlan, form, menuGroups]);
  
  const handleAddNew = () => {
    setEditingPlan(null);
    setIsDialogOpen(true);
  };
  
  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setIsDialogOpen(true);
  };

  const handleDelete = (planId: string) => {
    setDeletingPlanId(planId);
    setIsAlertOpen(true);
  };

  const confirmDelete = async () => {
    if (!deletingPlanId) return;
    try {
      // Opcional: Adicionar lógica para remover do Stripe aqui se necessário
      await deleteDoc(doc(db, 'plans', deletingPlanId));
      toast({ title: "Sucesso!", description: "Plano excluído." });
    } catch (error) {
      console.error("Error deleting plan: ", error);
      toast({ variant: "destructive", title: "Erro", description: "Falha ao excluir o plano." });
    } finally {
        setDeletingPlanId(null);
        setIsAlertOpen(false);
    }
  };

  const handleSetTrialPlan = async (planId: string) => {
    const batch = writeBatch(db);
    plans.forEach(plan => {
      const planRef = doc(db, 'plans', plan.id);
      batch.update(planRef, { isTrial: plan.id === planId });
    });

    try {
      await batch.commit();
      toast({ title: 'Sucesso!', description: 'Plano de teste gratuito definido.' });
    } catch (error) {
      console.error("Error setting trial plan: ", error);
      toast({ variant: 'destructive', title: 'Erro', description: 'Não foi possível definir o plano de teste.' });
    }
  };


  const onSubmit = async (data: PlanFormValues) => {
    if (!user) return;

    if (data.isTrial) {
        const otherTrialPlan = plans.find(p => p.isTrial && p.id !== editingPlan?.id);
        if (otherTrialPlan) {
            toast({ variant: "destructive", title: "Aviso", description: `O plano "${otherTrialPlan.name}" já está definido como teste. Desmarque-o primeiro.` });
            form.control.setError("isTrial", { message: "Apenas um plano pode ser de teste."});
            return;
        }
    }
    
    try {
      const syncResult = await syncPlanWithStripe({
          name: data.name,
          description: data.description,
          monthlyPrice: data.monthlyPrice,
          yearlyPrice: data.yearlyPrice,
          stripeProductId: editingPlan?.stripeProductId,
      });

      if (!syncResult.success) {
        toast({ variant: "destructive", title: "Erro de Sincronização", description: syncResult.message });
        return;
      }
      
      const payload = {
          ...data,
          stripeProductId: syncResult.stripeProductId,
          stripeMonthlyPriceId: syncResult.stripeMonthlyPriceId,
          stripeYearlyPriceId: syncResult.stripeYearlyPriceId,
      };

      if (editingPlan) {
        const planRef = doc(db, 'plans', editingPlan.id);
        await updateDoc(planRef, payload);
        toast({ title: "Sucesso!", description: "Plano atualizado." });
      } else {
        await addDoc(collection(db, 'plans'), {
          ...payload,
          createdAt: Timestamp.now(),
        });
        toast({ title: "Sucesso!", description: "Plano criado." });
      }
      setIsDialogOpen(false);
      setEditingPlan(null);
    } catch (error) {
      console.error("Error saving plan: ", error);
      toast({ variant: "destructive", title: "Erro ao salvar", description: `Falha ao salvar o plano.` });
    }
  };
  
  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Gerenciamento de Planos</h1>
        <Button onClick={handleAddNew}>
            <PlusCircle className="mr-2 h-4 w-4"/> Novo Plano
        </Button>
      </div>

       <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle>{editingPlan ? "Editar Plano de Assinatura" : "Criar Novo Plano"}</DialogTitle>
              <DialogDescription>
                Defina os detalhes, preços e grupos de páginas disponíveis neste plano.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-h-[70vh] overflow-y-auto p-1 pr-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem><FormLabel>Nome do Plano</FormLabel><FormControl><Input placeholder="Ex: Profissional" {...field} /></FormControl><FormMessage /></FormItem>
                )}/>
                <FormField control={form.control} name="description" render={({ field }) => (
                  <FormItem><FormLabel>Descrição Curta</FormLabel><FormControl><Textarea placeholder="Para quem este plano é ideal?" {...field} rows={2} /></FormControl><FormMessage /></FormItem>
                )}/>

                <div className="grid md:grid-cols-2 gap-4">
                    <FormField control={form.control} name="monthlyPrice" render={({ field }) => (
                        <FormItem><FormLabel>Preço Mensal (R$)</FormLabel>
                            <FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input type="number" step="0.01" className="pl-8" {...field} /></div></FormControl><FormMessage />
                        </FormItem>
                    )}/>
                    <FormField control={form.control} name="yearlyPrice" render={({ field }) => (
                        <FormItem><FormLabel>Preço Anual (R$)</FormLabel>
                            <FormControl><div className="relative"><DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"/><Input type="number" step="0.01" className="pl-8" {...field} /></div></FormControl><FormMessage />
                        </FormItem>
                    )}/>
                </div>
                
                <FormField control={form.control} name="isPublic" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                    <div className="space-y-0.5"><FormLabel>Plano Público</FormLabel><FormDescription>Tornar este plano visível na página de preços.</FormDescription></div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )}/>
                
                <FormField control={form.control} name="isTrial" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm bg-amber-50">
                    <div className="space-y-0.5"><FormLabel>Plano de Teste Gratuito</FormLabel><FormDescription>Define este como o plano padrão para novos usuários em teste.</FormDescription></div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )}/>
                
                <Separator />
                
                <div>
                  <h3 className="mb-4 text-lg font-medium">Grupos de Páginas Permitidos</h3>
                  <div className="space-y-2">
                    {menuGroups.map((group) => (
                      <FormField key={group.id} control={form.control} name={`allowedGroups.${group.id}`} render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <FormLabel>{group.label}</FormLabel>
                          <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )}/>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                    <h3 className="mb-4 text-lg font-medium">Itens Exibidos no Plano</h3>
                    <div className="space-y-2">
                        {fields.map((field, index) => (
                            <div key={field.id} className="flex items-center gap-2">
                                <FormField control={form.control} name={`planItems.${index}.value`} render={({ field }) => (
                                    <Input {...field} placeholder={`Benefício #${index + 1}`} className="flex-grow"/>
                                )}/>
                                <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                     <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => append({ value: '' })}>
                        Adicionar Item
                    </Button>
                </div>


                <DialogFooter className='pt-4 sticky bottom-0 bg-background py-3'>
                    <Button type="button" variant="ghost" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {editingPlan ? "Salvar Alterações" : "Criar Plano"}
                    </Button>
                </DialogFooter>
              </form>
            </Form>
          </DialogContent>
        </Dialog>


      {isLoading ? (
        <div className="flex justify-center items-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
      ) : plans.length === 0 ? (
         <Card>
            <CardContent className="flex items-center justify-center h-48">
              <div className="text-center">
                  <p className="text-muted-foreground">Nenhum plano criado ainda.</p>
                  <Button variant="link" onClick={handleAddNew}>Crie o primeiro plano</Button>
              </div>
            </CardContent>
         </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {plans.map(plan => (
                <Card key={plan.id} className="flex flex-col relative">
                    <CardHeader>
                        {plan.isTrial && (
                            <Badge variant="secondary" className="absolute top-4 right-4 bg-amber-400 text-amber-900 z-10">
                                <Star className="mr-2 h-4 w-4"/> Plano de Teste
                            </Badge>
                        )}
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>{plan.name}</CardTitle>
                                <CardDescription>{plan.description}</CardDescription>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
                                     <DropdownMenuItem onClick={() => handleSetTrialPlan(plan.id)}>
                                         <Star className="mr-2 h-4 w-4" />
                                         {plan.isTrial ? "Remover Teste" : "Definir como Teste"}
                                     </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => handleEdit(plan)}>Editar</DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-destructive" onClick={() => handleDelete(plan.id)}>
                                        <Trash2 className="mr-2 h-4 w-4" />Excluir
                                    </DropdownMenuItem>
                                </DropdownMenuContent>
                            </DropdownMenu>
                        </div>
                    </CardHeader>
                    <CardContent className="flex-grow">
                        <div className="mb-6 space-y-4">
                            <div>
                                <p className="text-3xl font-bold">{formatCurrency(plan.monthlyPrice)}
                                    <span className="text-lg font-normal text-muted-foreground">/mês</span>
                                </p>
                                <p className="text-xs text-muted-foreground">Cobrança recorrente, sem fidelidade.</p>
                            </div>

                            {plan.yearlyPrice > 0 && (
                                <>
                                    <Separator />
                                    <div>
                                        <p className="text-xl font-bold">
                                            {formatCurrency(plan.yearlyPrice / 12)}
                                            <span className="text-base font-normal text-muted-foreground"> p/ mês no plano anual</span>
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            Valor total por ano: {formatCurrency(plan.yearlyPrice)}.
                                         {plan.monthlyPrice > 0 && (plan.monthlyPrice * 12) > plan.yearlyPrice && (
                                            <span className="font-semibold text-foreground ml-1">
                                                (Economize {formatCurrency((plan.monthlyPrice * 12) - plan.yearlyPrice)}!)
                                            </span>
                                        )}
                                        </p>
                                    </div>
                                </>
                            )}
                        </div>
                        
                        <div className="mb-4">
                            <Badge variant={plan.isPublic ? 'secondary' : 'outline'} className="">{plan.isPublic ? "Público" : "Privado"}</Badge>
                        </div>

                        <Separator className="my-4"/>
                        <h4 className="font-semibold mb-2">Itens Inclusos:</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            {plan.planItems?.map((item: any, index: number) => (
                                <li key={index} className="flex items-center gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                    <span>{item.value}</span>
                                </li>
                            ))}
                        </ul>
                    </CardContent>
                </Card>
            ))}
        </div>
      )}

      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
            <AlertDialogHeader><AlertDialogTitle>Você tem certeza?</AlertDialogTitle><AlertDialogDescription>Esta ação não pode ser desfeita. Isso excluirá permanentemente o plano.</AlertDialogDescription></AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingPlanId(null)}>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Sim, excluir</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>

    </div>
  );
}
