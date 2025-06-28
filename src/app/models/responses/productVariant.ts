import { Color } from "./color";
import { ProductVariantImage } from "./productVariantImage";
import { Size } from "./size";

export interface ProductVariant {
    id: string;
    price : number;
    stockQuantity: number;
    images: ProductVariantImage[];
    deletedImageIds: string[];
    size: Size;
    color: Color;
    createdDate: string;
    updatedDate: string | null;
}