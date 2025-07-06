
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { collection, addDoc, query, onSnapshot, orderBy, doc, updateDoc, deleteDoc, Timestamp } from 'firebase/firestore';
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
import { Loader2, MoreHorizontal, PlusCircle, CreditCard, Trash2, DollarSign, CheckCircle } from 'lucide-react';
import type { Plan } from '@/types';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';

const featureList = [
    { id: 'servicos', label: 'Serviços' },
    { id: 'orcamentos', label: 'Orçamentos' },
    { id: 'prazos', label: 'Prazos' },
    { id: 'atividades', label: 'Atividades' },
    { id: 'clientes', label: 'Clientes' },
    { id: 'colaboradores', label: 'Colaboradores' },
    { id: 'inventario', label: 'Inventário' },
] as const;

type FeatureId = typeof featureList[number]['id'];

const planFormSchema = z.object({
  name: z.string().min(3, { message: 'O nome do plano deve ter pelo menos 3 caracteres.' }),
  description: z.string().optional(),
  monthlyPrice: z.coerce.number().min(0, { message: 'O preço mensal não pode ser negativo.' }),
  yearlyPrice: z.coerce.number().min(0, { message: 'O preço anual não pode ser negativo.' }),
  isPublic: z.boolean().default(true),
  features: z.object(
    featureList.reduce((acc, feature) => {
        acc[feature.id] = z.boolean().default(false);
        return acc;
    }, {} as Record<FeatureId, z.ZodBoolean>)
  ).default({}),
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
      features: featureList.reduce((acc, feature) => ({ ...acc, [feature.id]: false }), {}),
      stripeProductId: '',
      stripeMonthlyPriceId: '',
      stripeYearlyPriceId: '',
    },
  });

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    const q = query(collection(db, 'plans'), orderBy('monthlyPrice', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const planList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Plan));
      setPlans(planList);
      setIsLoading(false);
    }, (error: any) => {
        console.error("Error fetching plans: ", error);
        toast({
            variant: "destructive",
            title: "Erro ao buscar dados",
            description: "Não foi possível carregar os planos. Verifique as regras de segurança.",
        });
        setIsLoading(false);
    });

    return () => unsubscribe();
  }, [user, toast]);
  
  useEffect(() => {
    if (isDialogOpen) {
      if (editingPlan) {
        form.reset(editingPlan);
      } else {
        form.reset({
          name: '', description: '', monthlyPrice: 0, yearlyPrice: 0, isPublic: true,
          features: featureList.reduce((acc, feature) => ({ ...acc, [feature.id]: false }), {}),
          stripeProductId: '', stripeMonthlyPriceId: '', stripeYearlyPriceId: '',
        });
      }
    }
  }, [isDialogOpen, editingPlan, form]);

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

  const onSubmit = async (data: PlanFormValues) => {
    if (!user) return;
    
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
                Defina os detalhes, preços e funcionalidades disponíveis neste plano.
              </DialogDescription>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 max-h-[70vh] overflow-y-auto p-1 pr-4">
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

                <Separator />
                
                <div>
                  <h3 className="mb-4 text-lg font-medium">Funções do Plano</h3>
                  <div className="space-y-4">
                    {featureList.map((feature) => (
                      <FormField key={feature.id} control={form.control} name={`features.${feature.id}`} render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 shadow-sm">
                          <div className="space-y-0.5"><FormLabel>{feature.label}</FormLabel></div>
                          <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                        </FormItem>
                      )}/>
                    ))}
                  </div>
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
                <Card key={plan.id} className="flex flex-col">
                    <CardHeader>
                        <div className="flex justify-between items-start">
                            <div>
                                <CardTitle>{plan.name}</CardTitle>
                                <CardDescription>{plan.description}</CardDescription>
                            </div>
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild><Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4"/></Button></DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Ações</DropdownMenuLabel>
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
                        <h4 className="font-semibold mb-2">Funções Inclusas:</h4>
                        <ul className="space-y-2 text-sm text-muted-foreground">
                            {featureList.map(feature => (
                                plan.features[feature.id] && (
                                    <li key={feature.id} className="flex items-center gap-2">
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                        <span>{feature.label}</span>
                                    </li>
                                )
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
