
import type { Timestamp } from 'firebase/firestore';

export interface CustomFields {
  [key: string]: string | number | Timestamp | Date;
}

export interface Customer {
  id: string;
  userId: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  cpfCnpj?: string;
  birthDate?: Timestamp | null;
  notes?: string;
  createdAt: Timestamp;
  customFields?: CustomFields;
}

export interface ServiceOrder {
    id: string;
    userId: string;
    clientId: string;
    clientName: string;
    serviceType: string;
    problemDescription: string;
    technician: string;
    status: 'Pendente' | 'Em Andamento' | 'Aguardando Peça' | 'Concluída' | 'Cancelada';
    dueDate: Timestamp;
    attachments?: { name: string; url: string; }[];
    createdAt: Timestamp;
    customFields?: CustomFields;
}

export interface Quote {
  id: string;
  userId: string;
  clientId: string;
  clientName: string;
  description: string;
  totalValue: number;
  validUntil: Timestamp;
  status: 'Pendente' | 'Aprovado' | 'Recusado' | 'Convertido';
  createdAt: Timestamp;
  customFields?: CustomFields;
}

export interface RecentActivity {
    id: string;
    type: 'cliente' | 'serviço' | 'orçamento';
    description: string;
    timestamp: Date;
    href: string;
}
