import { createApi } from "@reduxjs/toolkit/query/react";
import { PaginationParams } from "../models/params/pagination";
import { baseQueryWithErrorHandling } from "./baseApi";
import { ChatRequest, ChatResponse, MessageParams, MessageRequest, MessageResponse } from "../models/responses/chat";

export const chatApi = createApi({
  reducerPath: "chatApi",
  baseQuery: baseQueryWithErrorHandling,
  tagTypes: ["Chats", "Messages"],
  endpoints: (builder) => ({
    fetchChats: builder.query<{ items: ChatResponse[]; pagination: PaginationParams | null }, PaginationParams>({
      query: (params) => ({
        url: "chats",
        params,
      }),
      transformResponse: (response: ChatResponse[], meta) => {
        const paginationHeader = meta?.response?.headers.get("Pagination");
        const pagination = paginationHeader ? JSON.parse(paginationHeader) as PaginationParams : null;

        return {
          items: response,
          pagination,
        };
      },
      providesTags: ["Chats"],
    }),
    createChat: builder.mutation<ChatResponse, ChatRequest>({
      query: (chatRequest) => ({
        url: "chats",
        method: "POST",
        body: chatRequest,
      }),
      invalidatesTags: ["Chats"],
    }),
    fetchMessages: builder.query<{ items: MessageResponse[]; pagination: PaginationParams | null }, { chatId: string; params: MessageParams }>({
      query: ({ chatId, params }) => ({
        url: `chats/${chatId}/messages`,
        params: {
          searchTerm: params.searchTerm,
          orderBy: params.orderBy,
          isUserMessage: params.isUserMessage,
          pageNumber: params.pageNumber,
          pageSize: params.pageSize,
        },
      }),
      transformResponse: (response: MessageResponse[], meta) => {
        const paginationHeader = meta?.response?.headers.get("Pagination");
        const pagination = paginationHeader ? JSON.parse(paginationHeader) as PaginationParams : null;

        return {
          items: response,
          pagination,
        };
      },
      providesTags: ["Messages"],
    }),
    sendMessage: builder.mutation<MessageResponse, { chatId: string; messageRequest: MessageRequest }>({
      query: ({ chatId, messageRequest }) => ({
        url: `chats/${chatId}/messages`,
        method: "POST",
        body: messageRequest,
      }),
      invalidatesTags: ["Messages"],
    }),
    deleteChat: builder.mutation({
      query: (chatId: string) => ({
        url: `chats/${chatId}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Chats"],
    }),
  }),
});

export const {  
  useFetchChatsQuery,
  useCreateChatMutation,
  useFetchMessagesQuery,
  useSendMessageMutation,
  useDeleteChatMutation,
} = chatApi;