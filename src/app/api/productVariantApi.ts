import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithErrorHandling } from "./baseApi";
import { ProductVariantParams } from "../models/params/productVariantParams";
import { PaginationParams } from "../models/params/pagination";
import { ProductVariant } from "../models/responses/productVariant";

export const productVariantApi = createApi({
  reducerPath: "productVariantApi",
  baseQuery: baseQueryWithErrorHandling,
  tagTypes: ["ProductVariants"],
  endpoints: (builder) => ({
    fetchProductVariants: builder.query<{ items: ProductVariant[]; pagination: PaginationParams | null }, ProductVariantParams>({
      query: (params) => ({
        url: "ProductVariants",
        params,
      }),
      transformResponse: (response: ProductVariant[], meta) => {
        const paginationHeader = meta?.response?.headers.get("Pagination");
        const pagination = paginationHeader
          ? JSON.parse(paginationHeader) as PaginationParams
          : null;

        return {
          items: response,
          pagination,
        };
      },
      providesTags: ["ProductVariants"],
    }),
    fetchProductVariantById: builder.query<ProductVariant, string>({
      query: (id) => `ProductVariants/${id}`,
      providesTags: ["ProductVariants"],
    }),
    createProductVariant: builder.mutation<ProductVariant, FormData>({
      query: (data) => ({
        url: "ProductVariants",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["ProductVariants"],
    }),
    updateProductVariant: builder.mutation<ProductVariant, { id: string; data: FormData }>({
      query: ({ id, data }) => ({
        url: `ProductVariants/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["ProductVariants"],
    }),
    deleteProductVariant: builder.mutation<void, string>({
      query: (id) => ({
        url: `ProductVariants/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["ProductVariants"],
    }),
  }),
});

export const {
  useFetchProductVariantsQuery,
  useFetchProductVariantByIdQuery,
  useCreateProductVariantMutation,
  useUpdateProductVariantMutation,
  useDeleteProductVariantMutation,
} = productVariantApi;