import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithErrorHandling } from "./baseApi";
import { ColorParams } from "../models/params/colorParams";
import { PaginationParams } from "../models/params/pagination";
import { Color } from "../models/responses/color";


export const colorApi = createApi({
  reducerPath: "colorApi",
  baseQuery: baseQueryWithErrorHandling,
  tagTypes: ["Colors"],
  endpoints: (builder) => ({
    fetchColors: builder.query<{ items: Color[]; pagination: PaginationParams | null }, ColorParams>({
              query: (ColorParams) => ({
                url: "Colors",
                params: ColorParams,
              }),
              transformResponse: (response: Color[], meta) => {
                const paginationHeader = meta?.response?.headers.get("Pagination");
                const pagination = paginationHeader ? JSON.parse(paginationHeader) as PaginationParams : null;
        
                return {
                  items: response,
                  pagination,
                };
              },
              providesTags: ["Colors"],
            }),
        fetchColorsTree: builder.query<Color[], void>({
          query: () => ({
            url: "Colors/tree",
            method: "GET",
          }),
          providesTags: ["Colors"],
        }),
    fetchColorById: builder.query<Color, string>({
      query: (id) => ({
        url: `colors/${id}`,
        method: "GET",
      }),
      providesTags: ["Colors"],
    }),
    createColor: builder.mutation<Color, FormData>({
      query: (data) => ({
        url: "colors",
        method: "POST",
        body: data,
      }),
      invalidatesTags: ["Colors"],
    }),
    updateColor: builder.mutation<
      Color,
      { id: string; data: FormData }
    >({
      query: ({ id, data }) => ({
        url: `colors/${id}`,
        method: "PUT",
        body: data,
      }),
      invalidatesTags: ["Colors"],
    }),
    deleteColor: builder.mutation<void, string>({
      query: (id) => ({
        url: `colors/${id}`,
        method: "DELETE",
      }),
      invalidatesTags: ["Colors"],
    }),
  }),
});

export const {
  useFetchColorsQuery,
  useFetchColorByIdQuery,
  useFetchColorsTreeQuery,
  useCreateColorMutation,
  useUpdateColorMutation,
  useDeleteColorMutation,
} = colorApi;