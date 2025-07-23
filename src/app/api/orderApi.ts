import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithErrorHandling } from "./baseApi";
import { OrderParams } from "../models/params/orderParams";
import { OrderStatusRequest } from "../models/requests/orderStatusRequest";
import { Order } from "../models/responses/order";
import { PaginationParams } from "../models/params/pagination";
import { ReturnRequest, ReturnStatusRequest } from "../models/requests/returnRequest";

export const orderApi = createApi({
  reducerPath: "orderApi",
  baseQuery: baseQueryWithErrorHandling,
  tagTypes: ["Orders"],
  endpoints: (builder) => ({
    fetchAllOrders: builder.query<{ items: Order[]; pagination: PaginationParams | null }, OrderParams>({
      query: (orderParams) => ({
        url: "Orders",
        params: orderParams,
      }),
      transformResponse: (response: Order[], meta) => {
        const paginationHeader = meta?.response?.headers.get("Pagination");
        const pagination = paginationHeader ? JSON.parse(paginationHeader) as PaginationParams : null;

        return {
          items: response,
          pagination,
        };
      },
      providesTags: ["Orders"],
    }),
    getOrderById: builder.query<Order, string>({
      query: (id) => ({
        url: `Orders/${id}`,
        method: "GET",
      }),
      providesTags: ["Orders"],
    }),
    updateOrderStatus: builder.mutation<
      Order,
      { id: string; data: OrderStatusRequest }
    >({
      query: ({ id, data }) => ({
        url: `Orders/${id}/status`,
        method: "PUT",
        body: new URLSearchParams({ Status: data.status }),
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }),
      invalidatesTags: ["Orders"],
    }),
    cancelOrder: builder.mutation<void, { id: string; cancellationReason?: string }>({
      query: ({ id, cancellationReason }) => ({
        url: `Orders/${id}/cancel`,
        method: "DELETE",
        params: cancellationReason ? { cancellationReason } : undefined,
      }),
      invalidatesTags: ["Orders"],
    }),
    requestReturn: builder.mutation<
      Order,
      { id: string; data: ReturnRequest }
    >({
      query: ({ id, data }) => {
        const params = new URLSearchParams({ Reason: data.reason });
        return {
          url: `Orders/${id}/return`,
          method: "POST",
          body: params,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        };
      },
      invalidatesTags: ["Orders"],
    }),
    updateReturnStatus: builder.mutation<
      Order,
      { id: string; data: ReturnStatusRequest }
    >({
      query: ({ id, data }) => {
        const params = new URLSearchParams({ Status: data.status });
        if (data.refundReason) {
          params.append("RefundReason", data.refundReason);
        }
        return {
          url: `Orders/${id}/return/status`,
          method: "PUT",
          body: params,
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
        };
      },
      invalidatesTags: ["Orders"],
    }),
    fetchValidStatusTransitions: builder.query<string[], string>({
      query: (id) => ({
        url: `Orders/${id}/valid-transitions`,
        method: "GET",
      }),
      providesTags: ["Orders"],
    }),
    deleteCancelledOrder: builder.mutation<void, string>({
      query: (id) => ({
        url: `Orders/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Orders"],
    }),
  }),
});

export const {
  useFetchAllOrdersQuery,
  useGetOrderByIdQuery,
  useUpdateOrderStatusMutation,
  useCancelOrderMutation,
  useRequestReturnMutation,
  useUpdateReturnStatusMutation,
  useFetchValidStatusTransitionsQuery,
  useDeleteCancelledOrderMutation,
} = orderApi;