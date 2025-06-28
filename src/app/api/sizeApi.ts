import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithErrorHandling } from "./baseApi";
import { Size } from "../models/responses/size";
import { SizeParams } from "../models/params/sizeParams";
import { PaginationParams } from "../models/params/pagination";


export const sizeApi = createApi({
  reducerPath: "sizeApi",
  baseQuery: baseQueryWithErrorHandling,
  tagTypes: ["Sizes"],
  endpoints: (builder) => ({
    fetchSizes: builder.query<{ items: Size[]; pagination: PaginationParams | null }, SizeParams>({
              query: (SizeParams) => ({
                url: "Sizes",
                params: SizeParams,
              }),
              transformResponse: (response: Size[], meta) => {
                const paginationHeader = meta?.response?.headers.get("Pagination");
                const pagination = paginationHeader ? JSON.parse(paginationHeader) as PaginationParams : null;
        
                return {
                  items: response,
                  pagination,
                };
              },
              providesTags: ["Sizes"],
            }),
        fetchSizesTree: builder.query<Size[], void>({
          query: () => ({
            url: "Sizes/tree",
            method: "GET",
          }),
          providesTags: ["Sizes"],
        }),
    fetchSizeById: builder.query<Size, string>({
      query: (id) => ({
        url: `sizes/${id}`,
        method: "GET",
      }),
      providesTags: ["Sizes"],
    }),
    createSize: builder.mutation<Size, FormData>({
      query: (data) => ({
        url: "sizes",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Sizes"],
    }),
    updateSize: builder.mutation<Size, { id: string; data: FormData }>({
      query: ({ id, data }) => ({
        url: `sizes/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Sizes"],
    }),
    deleteSize: builder.mutation<void, string>({
      query: (id) => ({
        url: `sizes/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Sizes"],
    }),
  }),
});

export const {
  useFetchSizesQuery,
  useFetchSizeByIdQuery,
  useFetchSizesTreeQuery,
  useCreateSizeMutation,
  useUpdateSizeMutation,
  useDeleteSizeMutation,
} = sizeApi;