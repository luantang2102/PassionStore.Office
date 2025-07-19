import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithErrorHandling } from "./baseApi";
import { NotificationParams, NotificationRequest, NotificationResponse } from "../models/responses/notification";

export interface PaginationMetadata {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalCount: number;
}

export const notificationApi = createApi({
  reducerPath: "notificationApi",
  baseQuery: baseQueryWithErrorHandling,
  tagTypes: ["Notifications"],
  endpoints: (builder) => ({
    fetchNotifications: builder.query<{ items: NotificationResponse[]; pagination: PaginationMetadata | null }, NotificationParams>({
      query: (params) => ({
        url: "notifications",
        params: {
          isRead: params.isRead,
          pageNumber: params.pageNumber,
          pageSize: params.pageSize,
          searchTerm: params.searchTerm,
        },
      }),
      transformResponse: (response: NotificationResponse[], meta) => {
        const paginationHeader = meta?.response?.headers.get("Pagination");
        const pagination = paginationHeader ? JSON.parse(paginationHeader) as PaginationMetadata : null;

        return {
          items: response,
          pagination,
        };
      },
      providesTags: ["Notifications"],
    }),
    createNotification: builder.mutation<NotificationResponse, NotificationRequest>({
      query: (notificationRequest) => ({
        url: "notifications",
        method: "POST",
        body: notificationRequest,
      }),
      invalidatesTags: ["Notifications"],
    }),
    markNotificationAsRead: builder.mutation<void, string>({
      query: (id) => ({
        url: `notifications/${id}/read`,
        method: "PUT",
      }),
      invalidatesTags: ["Notifications"],
    }),
  }),
});

export const {
  useFetchNotificationsQuery,
  useCreateNotificationMutation,
  useMarkNotificationAsReadMutation,
} = notificationApi;