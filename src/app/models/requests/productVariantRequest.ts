import { ExistingProductVariantImageRequest } from "./existingProductVariantImageRequest";

export interface ProductVariantRequest {
  productId: string;
  colorId: string;
  sizeId: string;
  price: number;
  stockQuantity: number;
  productImages?: ExistingProductVariantImageRequest[];
}