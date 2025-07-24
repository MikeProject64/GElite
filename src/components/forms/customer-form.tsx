'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useSettings } from '@/components/settings-provider';
import { format, parse, isValid } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Customer } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, DollarSign, Loader2 } from 'lucide-react';
import { ChangeEvent, useEffect, useState } from 'react';

const customerFormSchema = z.object({
  name: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres.' }),
  phone: z.string().refine(val => {
    const digits = val.replace(/\D/g, '');
    return digits.length >= 10 && digits.length <= 11;
  }, {
    message: 'O telefone deve conter entre 10 e 11 dígitos numéricos.'
  }),
  email: z.string().email({ message: "Por favor, insira um e-mail válido." }).optional().or(z.literal('')),
  address: z.string().optional(),
  cpfCnpj: z.string().optional(),
  birthDate: z.date().optional().nullable(),
  notes: z.string().optional(),
  customFields: z.record(z.any()).optional(),
  tagId: z.string().optional(),
});

export type CustomerFormValues = z.infer<typeof customerFormSchema>;

interface CustomerFormProps {
    customer?: Customer | null;
    onFormSubmit: (data: CustomerFormValues) => Promise<void>; // Renomeado de onSubmit para onFormSubmit
    onCancel?: () => void;
}

export function CustomerForm({ customer, onFormSubmit, onCancel }: CustomerFormProps) {
    const { settings } = useSettings();
    const [birthDateString, setBirthDateString] = useState('');

    const form = useForm<CustomerFormValues>({
        resolver: zodResolver(customerFormSchema),
        defaultValues: {
            name: '',
            phone: '',
            email: '',
            address: '',
            cpfCnpj: '',
            birthDate: null,
            notes: '',
            customFields: {},
            tagId: '',
        },
    });

    useEffect(() => {
        if (customer) {
            const birthDate = customer.birthDate ? customer.birthDate.toDate() : null;
            const defaultValues = {
                ...customer,
                birthDate: birthDate,
                customFields: customer.customFields || {},
                tagId: Array.isArray(customer.tagIds) ? customer.tagIds[0] : '',
            };
            form.reset(defaultValues as any);
            setBirthDateString(birthDate ? format(birthDate, 'dd/MM/yyyy') : '');
        } else {
            form.reset({
              name: '', phone: '', email: '', address: '',
              cpfCnpj: '', birthDate: null, notes: '', customFields: {}, tagId: ''
            });
            setBirthDateString('');
        }
    }, [customer, form]);
    
    const handleBirthDateChange = (e: ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        const digitsOnly = value.replace(/\D/g, '');
        let formatted = digitsOnly;
        if (digitsOnly.length > 2) {
          formatted = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2)}`;
        }
        if (digitsOnly.length > 4) {
          formatted = `${digitsOnly.slice(0, 2)}/${digitsOnly.slice(2, 4)}/${digitsOnly.slice(4, 8)}`;
        }
        setBirthDateString(formatted);

        if (formatted.length === 10) {
          const parsedDate = parse(formatted, 'dd/MM/yyyy', new Date());
          if (isValid(parsedDate)) {
            form.setValue('birthDate', parsedDate, { shouldValidate: true });
          } else {
            form.setValue('birthDate', null);
          }
        } else {
          form.setValue('birthDate', null);
        }
    };

    return (
        <Form {...form}>
            <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-4">
                <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Nome Completo *</FormLabel>
                    <FormControl><Input placeholder="Ex: Maria Oliveira" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Telefone *</FormLabel>
                    <FormControl><Input placeholder="Ex: (11) 99999-8888" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl><Input type="email" placeholder="Ex: maria.oliveira@email.com" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="tagId" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Etiqueta</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value} defaultValue={field.value}>
                        <FormControl>
                            <SelectTrigger>
                            <SelectValue placeholder="Selecione uma etiqueta" />
                            </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                            <SelectItem value="none">Nenhuma</SelectItem>
                            {settings.tags?.map(tag => (
                                <SelectItem key={tag.id} value={tag.id}>
                                <div className="flex items-center gap-2">
                                    <div className={cn("w-3 h-3 rounded-full border", tag.color)}></div>
                                    {tag.name}
                                </div>
                                </SelectItem>
                            ))}
                        </SelectContent>
                        </Select>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Endereço</FormLabel>
                    <FormControl><Textarea placeholder="Rua das Flores, 123, Bairro, Cidade - Estado" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="cpfCnpj" render={({ field }) => (
                    <FormItem>
                    <FormLabel>CPF/CNPJ</FormLabel>
                    <FormControl><Input placeholder="Opcional" {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="birthDate" render={({ field }) => (
                    <FormItem>
                        <FormLabel>Data de Nascimento</FormLabel>
                        <FormControl>
                        <Input
                            placeholder="DD/MM/AAAA"
                            value={birthDateString}
                            onChange={handleBirthDateChange}
                        />
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )}/>
                <FormField control={form.control} name="notes" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Observações</FormLabel>
                    <FormControl><Textarea placeholder="Informações adicionais sobre o cliente..." {...field} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )}/>

                {settings.customerCustomFields?.map((customField) => {
                    if (customField.type === 'currency') {
                        return (
                            <FormField
                                key={customField.id}
                                control={form.control}
                                name={`customFields.${customField.id}`}
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>{customField.name}</FormLabel>
                                        <FormControl>
                                            <div className="relative">
                                                <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input type="number" step="0.01" className="pl-8" {...field} onChange={event => field.onChange(+event.target.value)} />
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                        );
                    }
                    return (
                        <FormField
                            key={customField.id}
                            control={form.control}
                            name={`customFields.${customField.id}`}
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>{customField.name}</FormLabel>
                                    <FormControl>
                                        {customField.type === 'date' ? (
                                            <Popover>
                                                <PopoverTrigger asChild>
                                                    <Button variant={"outline"} className={cn("w-full justify-start text-left font-normal", !field.value && "text-muted-foreground")}>
                                                        <CalendarIcon className="mr-2 h-4 w-4" />
                                                        {field.value ? format(new Date(field.value), "PPP", { locale: ptBR }) : <span>Selecione a data</span>}
                                                    </Button>
                                                </PopoverTrigger>
                                                <PopoverContent className="w-auto p-0" align="start">
                                                    <Calendar mode="single" selected={field.value ? new Date(field.value) : undefined} onSelect={field.onChange} initialFocus />
                                                </PopoverContent>
                                            </Popover>
                                        ) : (
                                            <Input type={customField.type} {...field} />
                                        )}
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                    )
                })}

                <div className="flex justify-end gap-2 pt-4">
                    {onCancel && <Button type="button" variant="ghost" onClick={onCancel}>Cancelar</Button>}
                    <Button type="submit" disabled={form.formState.isSubmitting}>
                        {form.formState.isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {customer ? "Salvar Alterações" : "Salvar Cliente"}
                    </Button>
                </div>
            </form>
        </Form>
    );
}