import { Rating } from "./rating";
import { UserProfile } from "./userProfile";

export interface User {
    id: string;
    userName: string | null;
    imageUrl: string | null;
    publicId: string | null;
    email: string | null;
    gender: string | null;
    dateOfBirth: string | null;
    createdDate: string;
    updatedDate?: string;
    emailConfirmed: boolean;
    isDeactivated: boolean;
    roles: string[];
    userProfiles: UserProfile[];
    cartItemsCount: number;
    ratings: Rating[];
}
