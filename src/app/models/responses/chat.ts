export interface ChatRequest {
  topic: string;
}

export interface ChatResponse {
  id: string;
  topic: string;
  userId: string;
  userName: string;
  createdDate: string;
}

export interface MessageRequest {
  content: string;
}

export interface MessageResponse {
  id: string;
  content: string;
  isUserMessage: boolean;
  chatId: string;
  createdDate: string;
}

export interface MessageParams {
  searchTerm?: string;
  orderBy?: string;
  isUserMessage?: boolean;
  pageNumber: number;
  pageSize: number;
}