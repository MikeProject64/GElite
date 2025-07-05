
import type { Timestamp } from 'firebase/firestore';

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date';
}

export interface UserSettings {
  siteName: string;
  iconName: string;
  customerCustomFields?: CustomField[];
  serviceOrderCustomFields?: CustomField[];
  quoteCustomFields?: CustomField[];
  serviceStatuses?: string[];
}

export interface Collaborator {
  id: string;
  userId: string;
  name: string;
  createdAt: Timestamp;
  type: 'collaborator' | 'sector';
  description?: string;
  photoURL?: string;
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

type CustomFields = Record<string, any>;

export interface ServiceOrder {
    id: string;
    userId: string;
    clientId: string;
    clientName: string;
    serviceType: string;
    problemDescription: string;
    collaboratorId?: string;
    collaboratorName?: string;
    totalValue: number;
    status: string;
    dueDate: Timestamp;
    attachments?: { name: string; url: string; }[];
    createdAt: Timestamp;
    completedAt?: Timestamp | null;
    customFields?: CustomFields;
}

export interface Quote {
  id: string;
  userId: string;
  clientId: string;
  clientName: string;
  title: string;
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
