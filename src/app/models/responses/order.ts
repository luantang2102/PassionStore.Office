import { OrderItem } from "./orderItem";
import { UserProfile } from "./userProfile";

export enum ShippingMethod {
  Standard = "Standard",
  Express = "Express",
  SameDay = "SameDay",
}

export enum PaymentMethod {
  COD = "COD",
  VietQR = "PayOS",
}
export interface Order {
  id: string;
  totalAmount: number;
  status: string;
  orderDate: string;
  paymentMethod: PaymentMethod;
  paymentLink?: string;
  paymentTransactionId?: string;
  userProfile: UserProfile;
  userFullName: string;
  shippingAddress: string;
  shippingMethod: ShippingMethod;
  shippingCost: number;
  note: string;
  returnReason?: string;
  estimatedDelivery? : string;
  trackingNumber?: string;
  orderItems: OrderItem[];
  createdDate: string;
  updatedDate?: string;
}
