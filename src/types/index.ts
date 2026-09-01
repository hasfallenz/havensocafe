export type UserRole = "OWNER" | "MANAGER" | "SERVICE_STAFF" | "KITCHEN_STAFF";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface TableItem {
  id: string;
  tableNumber: string;
  capacity: number;
  location: string;
  status: "AVAILABLE" | "OCCUPIED" | "RESERVED";
  qrCode?: string | null;
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
  displayOrder: number;
  isActive: boolean;
  itemCount?: number;
}

export interface MenuItemData {
  id: string;
  categoryId: string;
  category?: CategoryItem;
  name: string;
  slug: string;
  description: string;
  price: number;
  imageUrl: string;
  isAvailable: boolean;
  stock?: number;
  preparationTime?: number;
  ingredients?: string | null;
  allergens?: string | null;
  recommendationTags?: string | null; // JSON string
  createdAt?: string;
  updatedAt?: string;
}

export interface ItemCustomization {
  temperature?: "hot" | "iced";
  sugarLevel?: "normal" | "less" | "none" | "extra";
  iceLevel?: "normal" | "less" | "none";
  dairyOption?: "regular" | "oat" | "coconut";
  notes?: string;
  [key: string]: any;
}

export interface CartItemData {
  id: string;
  cartId: string;
  menuItemId: string;
  menuItem?: MenuItemData;
  quantity: number;
  customizations?: string | null; // JSON string or object
  unitPrice: number;
  subtotal: number;
}

export interface CartData {
  id: string;
  sessionId: string;
  status: string;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  items: CartItemData[];
}

export type OrderStatus = "QUEUED" | "COOKING" | "READY" | "COMPLETED" | "CANCELLED";
export type PaymentStatus = "PENDING" | "SUCCESS" | "FAILED" | "EXPIRED" | "CANCELLED";

export interface OrderItemData {
  id: string;
  orderId: string;
  menuItemId: string;
  nameSnapshot: string;
  priceSnapshot: number;
  quantity: number;
  customizations?: string | null;
  subtotal: number;
}

export interface OrderData {
  id: string;
  orderNumber: string;
  sessionId: string;
  tableId?: string | null;
  tableNumber?: string | null;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  tax: number;
  discount: number;
  total: number;
  notes?: string | null;
  items: OrderItemData[];
  payments?: PaymentData[];
  createdAt: string;
  updatedAt: string;
}

export interface PaymentData {
  id: string;
  orderId: string;
  provider: string; // QRIS, VA_BCA, VA_MANDIRI, CASHIER
  providerReference?: string | null;
  amount: number;
  currency: string;
  status: PaymentStatus;
  metadata?: string | null;
  createdAt: string;
}

export type SenderType = "CUSTOMER" | "AI" | "STAFF" | "SYSTEM";

export interface MessageData {
  id: string;
  conversationId: string;
  senderType: SenderType;
  content: string;
  metadata?: string | null; // JSON string for action preview chips
  createdAt: string;
}

export interface ConversationData {
  id: string;
  sessionId: string;
  status: string;
  aiStatus: "ACTIVE" | "PAUSED";
  communicationProfile?: string | null;
  messages: MessageData[];
}

export type TicketPriority = "P0" | "P1" | "P2" | "P3";
export type TicketStatus = "WAITING" | "IN_PROGRESS" | "RESOLVED";
export type TicketType =
  | "LIVE_CHAT"
  | "PHYSICAL_ASSISTANCE"
  | "PAYMENT_ISSUE"
  | "REFUND"
  | "WRONG_ORDER"
  | "ALLERGEN"
  | "GENERAL";

export interface SupportTicketData {
  id: string;
  conversationId?: string | null;
  orderId?: string | null;
  tableId?: string | null;
  tableNumber?: string | null;
  type: TicketType;
  priority: TicketPriority;
  status: TicketStatus;
  assignedUserId?: string | null;
  assignedUserName?: string | null;
  summary: string;
  metadata?: string | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
}

export interface InventoryItemData {
  id: string;
  name: string;
  stock: number;
  unit: string;
  minStock: number;
  status: "AVAILABLE" | "LOW_STOCK" | "OUT_OF_STOCK";
  updatedAt: string;
}

export interface RealtimeEvent {
  type:
    | "ORDER_CREATED"
    | "ORDER_STATUS_CHANGED"
    | "PAYMENT_COMPLETED"
    | "KITCHEN_UPDATED"
    | "SUPPORT_TICKET_CREATED"
    | "SUPPORT_TICKET_UPDATED"
    | "NEW_MESSAGE"
    | "STAFF_TAKEOVER"
    | "RETURN_TO_AI";
  data: any;
  timestamp: string;
}
