export interface Category {
  id: string;
  name: string;
  description: string;
  level: number;
  isActive: boolean;
  createdDate: string;
  updatedDate: string | null;
  parentCategoryId: string | null;
  parentCategoryName: string | null;
  subCategories: Category[];
  imageUrl: string; 
  totalProducts: number; 
}