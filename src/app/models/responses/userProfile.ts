export interface UserProfile {
    id: string;
    fullName: string | null;
    phoneNumber: string | null;
    province: string | null;
    district: string | null;
    ward: string | null;
    specificAddress: string | null;
    isDefault: boolean;
    createdDate: string;
    updatedDate?: string;
}