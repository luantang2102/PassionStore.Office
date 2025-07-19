export interface CategoryParams {
    pageNumber: number;
    pageSize: number;
    orderBy?: string;
    searchTerm?: string;
    isActive?: boolean;
    level?: number;
    parentCategoryId?: string;
  }