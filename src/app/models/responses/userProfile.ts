import { Address } from "./address";

export interface UserProfile {
    id: string;
    firstName: string | null;
    lastName: string | null;
    phoneNumber: string | null;
    address: Address | null;
    createdDate: string;
    updatedDate?: string;
}