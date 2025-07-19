export interface ReturnRequest {
  reason: string;
}

export interface ReturnStatusRequest {
  status: string;
  refundReason?: string;
}