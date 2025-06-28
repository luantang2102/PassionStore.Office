import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithErrorHandling } from "./baseApi";
import { OrderParams } from "../models/params/orderParams";
import { OrderRequest } from "../models/requests/orderRequest";
import { OrderStatusRequest } from "../models/requests/orderStatusRequest";
import { Order } from "../models/responses/order";

export const orderApi = createApi({
  reducerPath: "orderApi",
  baseQuery: baseQueryWithErrorHandling,
  tagTypes: ["Orders"],
  endpoints: (builder) => ({
    getOrders: builder.query<Order[], OrderParams>({
      query: (params) => ({
        url: "orders",
        method: "GET",
        params,
      }),
      providesTags: ["Orders"],
    }),
    getOrderById: builder.query<Order, string>({
      query: (id) => ({
        url: `orders/${id}`,
        method: "GET",
      }),
      providesTags: ["Orders"],
    }),
    createOrder: builder.mutation<Order, OrderRequest>({
      query: (data) => ({
        url: "orders",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Orders"],
    }),
    updateOrderStatus: builder.mutation<
      Order,
      { id: string; data: OrderStatusRequest }
    >({
      query: ({ id, data }) => ({
        url: `orders/${id}/status`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Orders"],
    }),
    cancelOrder: builder.mutation<void, string>({
      query: (id) => ({
        url: `orders/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Orders"],
    }),
  }),
});

export const {
  useGetOrdersQuery,
  useGetOrderByIdQuery,
  useCreateOrderMutation,
  useUpdateOrderStatusMutation,
  useCancelOrderMutation,
} = orderApi;