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

// Este tipo representa o registro de um Colaborador ou Setor dentro da conta de um usuário.
// É o que é gerenciado na tela /dashboard/colaboradores.
export type Collaborator = {
  id: string;
  userId: string; // ID do dono da conta
  name: string;
  description?: string;
  type: 'collaborator' | 'sector';
  createdAt: Timestamp;
  photoURL?: string;
  // Novos campos para o sistema de convites
  teamMemberUid?: string | null; // ID do SystemUser vinculado após o cadastro
  accessStatus?: 'active' | 'paused'; // Novo campo para o status do acesso
  allowedFunctions?: string[]; // Novo campo para as permissões do membro
  inviteToken?: string | null;   // Token para o link de convite
  inviteExpiresAt?: Timestamp | null; // Data de expiração do convite
  activeTaskCount?: number; // Campo para contagem de tarefas no dashboard
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
  userId: string;
  clientId: string;
  clientName: string;
  title: string;
  description: string;
  status: 'Pendente' | 'Aprovado' | 'Recusado' | 'Convertido';
  totalValue: number;
  createdAt: Timestamp;
  validUntil: Timestamp;
  isTemplate?: boolean;
  templateName?: string;
  version?: number;
  originalQuoteId?: string;
  convertedToServiceOrderId?: string;
  customFields?: { [key: string]: any };
  activityLog?: { timestamp: Timestamp; userEmail: string; description: string }[];
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
  createdAt: Timestamp; // Adicionando este campo
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
    completedAt?: Timestamp | null; // Adicionando este campo
};

export interface ServiceAgreement {
  id: string;
  nextDueDate?: Timestamp;
  // ... other fields
}

export type InventoryItem = {
    id: string;
    userId: string;
    name: string;
    description?: string;
    quantity: number;
    price?: number;
    cost: number;
    minStock?: number;
    createdAt: Timestamp;
    updatedAt: Timestamp;
};

export interface InventoryMovement {
  id: string;
  // ... other fields
}

export type RecentActivity = {
  id: string;
  userId: string;
  userEmail: string;
  collectionName: string;
  activityType: 'create' | 'update' | 'delete' | 'statusChange';
  documentId: string;
  timestamp: Timestamp;
  description: string;
  details?: any;
}

export type QuickNote = {
  id: string;
  userId: string;
  text: string;
  createdAt: Timestamp;
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
  description?: string;
  monthlyPrice: number;
  yearlyPrice: number;
  isPublic: boolean;
  isTrial: boolean;
  allowedFunctions: string[];
  planItems: { value: string }[];
  features?: Partial<FeatureFlags>; // Adicionando este campo
  stripeProductId?: string;
  stripeMonthlyPriceId?: string;
  stripeYearlyPriceId?: string;
  createdAt?: Timestamp;
}

export type SystemUser = {
    uid: string;
    email: string | null;
    name: string | null;
    photoURL: string | null;
    companyId: string | null;
    companyName: string | null;
    phone?: string | null;
    cpfCnpj?: string | null;
    endereco?: string | null;
    planId: string | null;
    subscriptionId: string | null;
    subscriptionStatus: 'active' | 'trialing' | 'canceled' | 'past_due' | 'unpaid' | null;
    stripeCustomerId?: string | null; 
    trialStartedAt?: Timestamp | null;
    trialEndsAt?: Timestamp | null;

    // Campos para o sistema de equipes
    role: 'admin' | 'owner' | 'team_member'; // admin: superuser, owner: dono da conta, team_member: membro da equipe
    mainAccountId?: string | null; // Se for team_member, aqui fica o UID do 'owner'
}

export type RegistrationInvite = {
  id: string;
  mainAccountId: string;
  collaboratorId: string;
  token: string;
  expiresAt: Timestamp;
  usedAt?: Timestamp | null;
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