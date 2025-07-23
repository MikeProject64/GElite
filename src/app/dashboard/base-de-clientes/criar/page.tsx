'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';
import { useSettings } from '@/components/settings-provider';
import { useToast } from '@/hooks/use-toast';
import { collection, addDoc, query, where, getDocs, Timestamp, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { CustomerForm, CustomerFormValues } from '@/components/forms/customer-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { ArrowLeft, UserPlus } from 'lucide-react';

export default function CriarClientePage() {
    const { user } = useAuth();
    const { settings } = useSettings();
    const router = useRouter();
    const { toast } = useToast();

    const handleCreateCustomer = async (data: CustomerFormValues) => {
        if (!user) {
            toast({ variant: "destructive", title: "Erro", description: "Você precisa estar logado para criar um cliente." });
            return;
        }

        try {
            const q = query(collection(db, 'customers'), where('userId', '==', user.uid), where('phone', '==', data.phone));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
              toast({ variant: "destructive", title: "Cliente Duplicado", description: "Já existe um cliente com este número de telefone." });
              return;
            }
            
            const customFieldsData = { ...data.customFields };
            settings.customerCustomFields?.forEach(field => {
                if (field.type === 'date' && customFieldsData[field.id]) {
                    customFieldsData[field.id] = Timestamp.fromDate(new Date(customFieldsData[field.id]));
                }
            });

            const payload = {
                ...data,
                userId: user.uid,
                tagIds: data.tagId && data.tagId !== 'none' ? [data.tagId] : [],
                birthDate: data.birthDate ? Timestamp.fromDate(data.birthDate) : null,
                customFields: customFieldsData,
                createdAt: Timestamp.now(),
                activityLog: [{
                    timestamp: Timestamp.now(),
                    userEmail: user.email || 'Sistema',
                    description: 'Cliente cadastrado.',
                    entityName: data.name,
                }],
            };
            delete (payload as any).tagId;

            await addDoc(collection(db, 'customers'), payload);
            toast({ title: "Sucesso!", description: "Cliente cadastrado." });
            router.push('/dashboard/base-de-clientes');

        } catch (error) {
            console.error("Error creating customer: ", error);
            toast({
                variant: "destructive",
                title: "Erro ao criar cliente",
                description: `Ocorreu um erro ao tentar salvar. ${error instanceof Error ? error.message : ''}`
            });
        }
    };

    return (
        <div className="flex flex-col gap-4 max-w-4xl mx-auto w-full">
            <div className="flex items-center gap-4">
                <Button variant="outline" size="icon" className="h-7 w-7" asChild>
                    <Link href="/dashboard/base-de-clientes">
                        <ArrowLeft className="h-4 w-4" />
                        <span className="sr-only">Voltar</span>
                    </Link>
                </Button>
                <h1 className="flex-1 shrink-0 whitespace-nowrap text-xl font-semibold tracking-tight sm:grow-0 flex items-center gap-2">
                    <UserPlus className="h-5 w-5" />
                    Cadastrar Novo Cliente
                </h1>
            </div>
            <Card>
                <CardHeader>
                    <CardTitle>Informações do Cliente</CardTitle>
                    <CardDescription>
                        Preencha os detalhes para adicionar um novo cliente à sua base.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <CustomerForm onSubmit={handleCreateCustomer} onCancel={() => router.push('/dashboard/base-de-clientes')} />
                </CardContent>
            </Card>
        </div>
    );
} 