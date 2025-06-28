export interface Rating {
    id: string;
    value: number;
    comment: string;
    createdDate: string;
    updatedDate?: string;
    userId: string;
    userName: string;
    imageUrl?: string;
    publicId?: string;
    email: string;
    productId: string;
}