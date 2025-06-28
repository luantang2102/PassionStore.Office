import { createApi } from "@reduxjs/toolkit/query/react";
import { Category } from "../models/responses/category";
import { PaginationParams } from "../models/params/pagination";
import { CategoryParams } from "../models/params/categoryParams";
import { baseQueryWithErrorHandling } from "./baseApi";

export const categoryApi = createApi({
  reducerPath: "categoryApi",
  baseQuery: baseQueryWithErrorHandling,
  tagTypes: ["Categories"],
  endpoints: (builder) => ({
    fetchCategories: builder.query<{ items: Category[]; pagination: PaginationParams | null }, CategoryParams>({
      query: (categoryParams) => ({
        url: "categories",
        params: categoryParams,
      }),
      transformResponse: (response: Category[], meta) => {
        const paginationHeader = meta?.response?.headers.get("Pagination");
        const pagination = paginationHeader ? JSON.parse(paginationHeader) as PaginationParams : null;

        return {
          items: response,
          pagination,
        };
      },
      providesTags: ["Categories"],
    }),

    fetchCategoriesTree: builder.query<Category[], void>({
      query: () => ({
        url: "categories/tree",
      }),
      transformResponse: (response: Category[]) => {
        return response;
      },
      providesTags: ["Categories"],
    }),
    
    fetchCategoryById: builder.query<Category, string>({
      query: (categoryId) => `categories/${categoryId}`,
      transformResponse: (response: Category) => {
        return response;
      },
      providesTags: ["Categories"],
    }),

    createCategory: builder.mutation<Category, FormData>({
      query: (data) => ({
        url: "categories",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Categories"],
    }),

    updateCategory: builder.mutation<Category, { id: string; data: FormData }>({
      query: ({ id, data }) => ({
        url: `categories/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Categories"],
    }),

    deleteCategory: builder.mutation<void, string>({
      query: (id) => ({
        url: `categories/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Categories"],
    }),
  }),
});

export const {
  useFetchCategoriesQuery,
  useFetchCategoryByIdQuery,
  useFetchCategoriesTreeQuery,
  useCreateCategoryMutation,
  useUpdateCategoryMutation,
  useDeleteCategoryMutation,
} = categoryApi;