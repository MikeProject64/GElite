import type { Stripe } from 'stripe';
import { Timestamp } from "firebase/firestore";

export type Client = {
  id: string;
  userId: string;
  name: string;
  email?: string;
  phone?: string;
  address?: string;
  [key: string]: any;
};

export type Collaborator = {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'collaborator';
  companyId: string;
};

export type CustomField = {
    id: string;
    name: string;
    type: 'text' | 'number' | 'date' | 'currency';
    value?: string | number;
};

export interface ServiceStatus {
    id: string;
    name:string;
    color: string;
    isFinal?: boolean;
}

export interface ServiceType {
  id: string;
  name: string;
  color?: string;
}

export interface Quote {
  id: string;
  // ... other fields
}

export interface Product {
  id: string;
  name: string;
  description?: string;
  price: number;
  productName: string;
}

export interface Customer {
  id: string;
  stripeCustomerId: string;
  // ... other fields
}

export type ServiceOrderPriority = 'baixa' | 'media' | 'alta';

export type ServiceOrder = {
    id: string;
    userId: string;
    clientId: string;
    clientName: string;
    serviceType: string;
    status: string;
    creationDate: Timestamp;
    lastUpdate: Timestamp;
    collaboratorId?: string;
    collaboratorName?: string;
    conclusionDate?: Timestamp;
    totalValue?: number;
    isTemplate?: boolean;
    equipment?: string;
    solutionDescription?: string;
    notes?: string;
    customFields?: CustomField[];
    attachments?: { name: string; url: string; }[];
    signature?: string;
    source?: { type: 'quote' | 'agreement'; id: string };
    version?: number;
    originalServiceOrderId?: string;
    generatedByAgreementId?: string;
    templateName?: string;
    problemDescription?: string;
    priority?: ServiceOrderPriority;
    dueDate?: Timestamp;
};

export interface ServiceAgreement {
  id: string;
  // ... other fields
}

export type InventoryItem = {
    id: string;
    userId: string;
    name: string;
    description?: string;
    quantity: number;
    price?: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
};

export interface InventoryMovement {
  id: string;
  // ... other fields
}

export type LandingPageImageSettings = {
    heroImage?: string;
    galleryImage1?: string;
    galleryImage2?: string;
    galleryImage3?: string;
    testimonial1Image?: string;
    testimonial2Image?: string;
    testimonial3Image?: string;
};

export type FeatureFlags = {
    enableQuotes?: boolean;
    enableInventory?: boolean;
    enableAgreements?: boolean;
    enableTeams?: boolean;
    enableScheduler?: boolean;
    enableReports?: boolean;
    enableApiAccess?: boolean;
    enableWhatsapp?: boolean;
    enableLandingPage?: boolean;
};

export type UserSettings = {
    siteName: string;
    iconName: string;
    logoURL: string;
    primaryColorHsl: { h: number; s: number; l: number };
    serviceStatuses: ServiceStatus[];
    serviceTypes: ServiceType[];
    serviceOrderCustomFields: CustomField[];
    quoteCustomFields: CustomField[];
    landingPageImages: LandingPageImageSettings;
    featureFlags: FeatureFlags;
};

export type Plan = {
    id: string;
    name: string;
    price: number;
    features: {
        [key in keyof FeatureFlags]?: boolean;
    };
    stripePriceId?: string;
    description?: string;
}

export type SystemUser = {
    uid: string;
    email: string | null;
    name: string | null;
    photoURL: string | null;
    companyId: string | null;
    companyName: string | null;
    planId: string | null;
    subscriptionId: string | null;
    subscriptionStatus: 'active' | 'canceled' | 'past_due' | 'unpaid' | null;
    role: 'admin' | 'collaborator';
}

export const defaultSettings: UserSettings = {
    siteName: "Seu App",
    iconName: "LayoutGrid",
    logoURL: "",
    primaryColorHsl: { h: 221.2, s: 83.2, l: 53.3 },
    serviceStatuses: [
      { id: 'pending', name: 'Pendente', color: '48 96% 58%', isFinal: false },
      { id: 'in_progress', name: 'Em Andamento', color: '210 70% 60%', isFinal: false },
      { id: 'completed', name: 'Concluído', color: '142 69% 51%', isFinal: true },
      { id: 'canceled', name: 'Cancelado', color: '0 84% 60%', isFinal: true },
    ],
    serviceTypes: [],
    serviceOrderCustomFields: [],
    quoteCustomFields: [],
    landingPageImages: {},
    featureFlags: {
        enableQuotes: true,
        enableInventory: true,
        enableAgreements: true,
        enableTeams: true,
        enableScheduler: false,
        enableReports: true,
        enableApiAccess: false,
        enableWhatsapp: true,
        enableLandingPage: true,
    },
};