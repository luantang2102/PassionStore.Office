import { Color } from "./color";
import { Size } from "./size";

export interface OrderItem {
  id: string;
  productId: string;
  productName: string;
  productDescription: string;
  productVariantId: string;
  productImage: string;
  quantity: number;
  price: number;
  color: Color;
  size: Size;
}