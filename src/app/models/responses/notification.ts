
export interface NotificationResponse {
  id: string;
  userId: string;
  objectId: string;
  objectType: string;
  content: string;
  isRead: boolean;
  createdDate: string;
}

export interface NotificationRequest {
  userId: string;
  objectId: string;
  objectType: string;
  content: string;
}

export interface NotificationParams {
  pageNumber?: number;
  pageSize?: number;
  searchTerm?: string;
  isRead?: boolean;
}