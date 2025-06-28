import { Cart } from "./cart";
import { Rating } from "./rating";
import { UserProfile } from "./userProfile";

export interface User {
    id: string;
    userName: string | null;
    imageUrl: string | null;
    publicId: string | null;
    email: string | null;
    roles: string[];
    isEmailVerified: boolean;
    createdDate: string;
    updatedDate?: string;
    userProfiles: UserProfile[];
    cart: Cart;
    ratings : Rating[];
}

