import { Address } from "./address";
import { OrderItem } from "./orderItem";

export interface Order{
  id: string;
  totalAmount: number;
  status: string;
  orderDate: string;
  paymentMethod: string;
  userProfileId: string;
  userFullName: string;
  shippingAddressId: string;
  shippingAddress: Address;
  orderItems: OrderItem[];
  createdDate: string;
  updatedDate?: string;
}
