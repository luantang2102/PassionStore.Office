import { createApi } from "@reduxjs/toolkit/query/react";
import { PaginationParams } from "../models/params/pagination";
import { baseQueryWithErrorHandling } from "./baseApi";
import { UserParams } from "../models/params/userParams";
import { User } from "../models/responses/user";

export const userApi = createApi({
  reducerPath: "userApi",
  baseQuery: baseQueryWithErrorHandling,
  tagTypes: ["Users"],
  endpoints: (builder) => ({
    fetchUsers: builder.query<{ items: User[]; pagination: PaginationParams | null }, UserParams>({
      query: (userParams) => ({
        url: "users",
        params: userParams,
      }),
      transformResponse: (response: User[], meta) => {
        const paginationHeader = meta?.response?.headers.get("Pagination");
        const pagination = paginationHeader ? JSON.parse(paginationHeader) as PaginationParams : null;

        return {
          items: response,
          pagination,
        };
      },
      providesTags: ["Users"],
    }),

    fetchUserById: builder.query<User, string>({
      query: (userId) => `users/${userId}`,
      providesTags: ["Users"],
    }),
  }),
});

export const {
  useFetchUsersQuery,
  useFetchUserByIdQuery,
} = userApi;