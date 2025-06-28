import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithErrorHandling } from "./baseApi";
import { BrandParams } from "../models/params/brandParams";
import { Brand } from "../models/responses/brand";
import { PaginationParams } from "../models/params/pagination";

export const brandApi = createApi({
  reducerPath: "brandApi",
  baseQuery: baseQueryWithErrorHandling,
  tagTypes: ["Brands"],
  endpoints: (builder) => ({
    fetchBrands: builder.query<{ items: Brand[]; pagination: PaginationParams | null }, BrandParams>({
          query: (BrandParams) => ({
            url: "Brands",
            params: BrandParams,
          }),
          transformResponse: (response: Brand[], meta) => {
            const paginationHeader = meta?.response?.headers.get("Pagination");
            const pagination = paginationHeader ? JSON.parse(paginationHeader) as PaginationParams : null;
    
            return {
              items: response,
              pagination,
            };
          },
          providesTags: ["Brands"],
        }),
    fetchBrandsTree: builder.query<Brand[], void>({
      query: () => ({
        url: "brands/tree",
        method: "GET",
      }),
      providesTags: ["Brands"],
    }),
    fetchBrandById: builder.query<Brand, string>({
      query: (id) => ({
        url: `brands/${id}`,
        method: "GET",
      }),
      providesTags: ["Brands"],
    }),
    createBrand: builder.mutation<Brand, FormData>({
      query: (data) => ({
        url: "brands",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Brands"],
    }),
    updateBrand: builder.mutation<
      Brand,
      { id: string; data: FormData }
    >({
      query: ({ id, data }) => ({
        url: `brands/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Brands"],
    }),
    deleteBrand: builder.mutation<void, string>({
      query: (id) => ({
        url: `brands/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Brands"],
    }),
  }),
});

export const {
  useFetchBrandsQuery,
  useFetchBrandByIdQuery,
  useFetchBrandsTreeQuery,
  useCreateBrandMutation,
  useUpdateBrandMutation,
  useDeleteBrandMutation,
} = brandApi;