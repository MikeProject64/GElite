
import type { Timestamp } from 'firebase/firestore';
import type { Stripe } from 'stripe';

export interface Tag {
  id: string;
  name: string;
  color: string; // Stores the Tailwind CSS class for the color
}

export interface CustomField {
  id: string;
  name: string;
  type: 'text' | 'number' | 'date' | 'currency';
  value?: string | number;
}

export interface ServiceStatus {
  id: string;
  name: string;
  color: string; // HSL color string like "210 40% 96.1%"
  isFinal?: boolean;
}

export interface UserSettings {
  siteName: string;
  iconName: string;
  logoURL?: string;
  primaryColorHsl?: { h: number; s: number; l: number; };
  customerCustomFields?: CustomField[];
  serviceOrderCustomFields?: CustomField[];
  quoteCustomFields?: CustomField[];
  serviceStatuses?: ServiceStatus[];
  serviceTypes?: { id: string; name: string, color?: string }[];
  featureFlags?: FeatureFlags;
  landingPageImages?: {
    heroImage?: string;
    feature1Image?: string;
    feature2Image?: string;
    feature3Image?: string;
    galleryImages?: string[];
    testimonial1Image?: string;
    testimonial2Image?: string;
    testimonial3Image?: string;
  };
  whatsappNumber?: string;
  whatsappMessage?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPassword?: string;
  emailRecipients?: string[];
  notifyOnNewSubscription?: boolean;
  stripePublishableKey?: string;
  stripeSecretKey?: string;
  whatsAppBusinessAccountId?: string;
  whatsAppAccessToken?: string;
  ga4PropertyId?: string;
  ga4CredentialsJson?: string;
}

export type PageBlockType = 'title' | 'subtitle' | 'text' | 'image';

export interface PageBlock {
  id: string;
  type: PageBlockType;
  content: {
    text?: string;
    src?: string;
    alt?: string;
  };
}


export interface CustomPage {
  id: string;
  userId: string;
  title: string;
  slug: string;
  content: PageBlock[]; // Changed from string to structured content
  isPublic: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface SystemUser {
  uid: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  createdAt: Timestamp;
  planId?: string;
  stripeCustomerId?: string;
  subscriptionStatus?: 'active' | 'incomplete' | 'canceled' | 'past_due' | 'incomplete_expired' | 'trialing';
  subscriptionId?: string;
  companyName?: string;
  phone?: string;
  trialStartedAt?: Timestamp;
  trialEndsAt?: Timestamp;
}

export interface Plan {
  id: string;
  name: string;
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  isPublic: boolean;
  isTrial?: boolean;
  allowedGroups?: Record<string, boolean>;
  planItems?: { value: string }[];
  createdAt: Timestamp;
  stripeProductId?: string;
  stripeMonthlyPriceId?: string;
  stripeYearlyPriceId?: string;
  features?: {
    servicos?: boolean;
    orcamentos?: boolean;
    prazos?: boolean;
    atividades?: boolean;
    clientes?: boolean;
    colaboradores?: boolean;
    inventario?: boolean;
    contratos?: boolean;
  };
}

export interface SubscriptionDetails {
    id: string;
    status: Stripe.Subscription.Status;
    currentPeriodEnd: number; // JS timestamp
    cancelAtPeriodEnd: boolean;
    price: number; // in cents
    interval: 'month' | 'year' | 'day' | 'week' | null;
    productName: string;
}

export interface Collaborator {
  id: string;
  userId: string;
  name:string;
  createdAt: Timestamp;
  type: 'collaborator' | 'sector';
  description?: string;
  photoURL?: string;
  activeTaskCount?: number;
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
  activityLog?: ActivityLogEntry[];
}

type CustomFields = Record<string, any>;

export interface ActivityLogEntry {
  timestamp: Timestamp;
  userEmail: string;
  description: string;
  entityName?: string; // e.g., customer name for context
}

export type ServiceOrderPriority = 'baixa' | 'media' | 'alta';

export interface ServiceOrder {
    id: string;
    userId: string;
    orderNumber: number;
    client: { id: string; name: string; };
    status: string;
    serviceType: string;
    assignedTo?: string;
    collaboratorName?: string;
    description: string;
    creationDate: Timestamp;
    lastUpdate: Timestamp;
    conclusionDate?: Timestamp;
    totalValue: number;
    customFields?: CustomField[];
    equipment: string;
    serialNumber?: string;
    brand?: string;
    model?: string;
    notes?: string;
}

export interface ServiceAgreement {
    id: string;
    userId: string;
    clientId: string;
    clientName: string;
    title: string;
    serviceOrderTemplateId: string;
    serviceOrderTemplateName: string;
    frequency: 'monthly' | 'quarterly' | 'semiannually' | 'annually';
    nextDueDate: Timestamp;
    startDate: Timestamp;
    status: 'active' | 'paused' | 'finished';
    createdAt: Timestamp;
    notes?: string;
    lastGeneratedAt?: Timestamp;
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
  activityLog?: ActivityLogEntry[];
  convertedToServiceOrderId?: string;
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

export interface InventoryItem {
    id: string;
    userId: string;
    name: string;
    description?: string;
    photoURL?: string;
    quantity: number;
    initialQuantity: number;
    cost: number;
    minStock?: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

export interface InventoryMovement {
    id: string;
    userId: string;
    itemId: string;
    type: 'entrada' | 'saída';
    quantity: number;
    notes?: string;
    attachments?: { name: string; url: string; }[];
    createdAt: Timestamp;
    serviceOrderId?: string;
    serviceOrderCode?: string;
    balance?: number; // This is a client-side calculated field
}

export interface QuickNote {
    id: string;
    userId: string;
    content: string;
    createdAt: Timestamp;
}

export type NotificationTarget = 'all' | 'specific';

export interface AdminNotification {
  id: string;
  title: string;
  message: string;
  target: NotificationTarget;
  sentTo: string[]; // Array of UIDs if target is 'specific'
  createdAt: Timestamp;
  scheduledFor?: Timestamp | null;
  status: 'draft' | 'sent' | 'scheduled';
  actionUrl?: string; // Optional URL for the action button
  actionText?: string; // Optional text for the action button
}

export interface UserNotificationStatus {
    id: string; // Corresponds to the AdminNotification ID
    read: boolean;
    readAt?: Timestamp | null;
}

export interface FeatureFlags {
    servicos?: boolean;
    orcamentos?: boolean;
    prazos?: boolean;
    atividades?: boolean;
    clientes?: boolean;
    colaboradores?: boolean;
    inventario?: boolean;
    contratos?: boolean;
}

export const defaultSettings: UserSettings = {
    siteName: 'Gestor Elite',
    iconName: 'Wrench',
    primaryColorHsl: { h: 210, s: 70, l: 40 },
    customerCustomFields: [],
    serviceOrderCustomFields: [],
    quoteCustomFields: [],
    serviceStatuses: [
        { id: 'pending', name: 'Pendente', color: '48 96% 58%', isFinal: false },
        { id: 'in_progress', name: 'Em Andamento', color: '210 70% 60%', isFinal: false },
        { id: 'completed', name: 'Concluída', color: '142 69% 51%', isFinal: true },
        { id: 'canceled', name: 'Cancelada', color: '0 84% 60%', isFinal: true },
    ],
    serviceTypes: [],
    featureFlags: {
        servicos: true,
        orcamentos: true,
        prazos: true,
        atividades: true,
        clientes: true,
        colaboradores: true,
        inventario: true,
        contratos: true,
    },
    landingPageImages: {
        heroImage: 'https://placehold.co/600x550.png',
        feature1Image: 'https://placehold.co/550x450.png',
        feature2Image: 'https://placehold.co/550x450.png',
        feature3Image: 'https://placehold.co/550x450.png',
        galleryImages: Array(9).fill('https://placehold.co/600x400.png'),
        testimonial1Image: 'https://placehold.co/100x100.png',
        testimonial2Image: 'https://placehold.co/100x100.png',
        testimonial3Image: 'https://placehold.co/100x100.png',
    },
};
