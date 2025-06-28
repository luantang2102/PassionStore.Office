import { Brand } from "./brand";
import { Category } from "./category";
import { ProductImage } from "./productImage";
import { ProductVariant } from "./productVariant";

export interface Product {
    id: string;
    name: string;
    description: string;
    maxPrice: number;
    minPrice: number;
    brand: Brand;
    inStock: boolean;
    stockQuantity: number;
    averageRating: number;
    productImages: ProductImage[];
    categories: Category[];
    isFeatured: boolean;
    productVariants: ProductVariant[];
    createdDate: string;
    updatedDate: string | null;
}