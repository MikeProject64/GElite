
import type { Timestamp } from 'firebase/firestore';

export interface Tag {
  id: string;
  name: string;
  color: string; // Stores the Tailwind CSS class for the color
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date';
}

export interface UserSettings {
  siteName: string;
  iconName: string;
  logoURL?: string;
  customerCustomFields?: CustomField[];
  serviceOrderCustomFields?: CustomField[];
  quoteCustomFields?: CustomField[];
  serviceStatuses?: string[];
  tags?: Tag[];
  skillTags?: Tag[];
}

export interface Collaborator {
  id: string;
  userId: string;
  name:string;
  createdAt: Timestamp;
  type: 'collaborator' | 'sector';
  description?: string;
  photoURL?: string;
  skillIds?: string[];
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
  tagIds?: string[];
}

type CustomFields = Record<string, any>;

export interface ActivityLogEntry {
  timestamp: Timestamp;
  userEmail: string;
  description: string;
}

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
    activityLog?: ActivityLogEntry[];
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
  isTemplate?: boolean;
  templateName?: string;
  originalQuoteId?: string;
  version?: number;
}

export interface RecentActivity {
    id: string;
    type: 'cliente' | 'serviço' | 'orçamento';
    description: string;
    timestamp: Date;
    href: string;
}

export interface TimelineNote {
  id: string;
  userId: string;
  customerId: string;
  note: string;
  createdAt: Timestamp;
}

export type TimelineItemType = 'creation' | 'serviceOrder' | 'quote' | 'note';

export interface TimelineItem {
  id: string;
  type: TimelineItemType;
  date: Date;
  data: Customer | ServiceOrder | Quote | TimelineNote;
}
