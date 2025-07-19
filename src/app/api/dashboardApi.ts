import { createApi } from '@reduxjs/toolkit/query/react';
import { baseQueryWithErrorHandling } from './baseApi';

interface DashboardSummary {
  totalRevenue: number;
  activeOrders: number;
  totalCustomers: number;
  outOfStockProducts: number;
  revenueChange: number;
  ordersChange: number;
  customersChange: number;
  outOfStockChange: number;
}

interface CategoryRevenue {
  name: string;
  sales: number;
  color: string;
}

interface CategoryRating {
  name: string;
  averageRating: number;
  color: string;
}

interface InventoryAlert {
  product: string;
  stock: number;
  status: string;
  category: string;
}

interface MonthlySales {
  month: string;
  sales: number;
  orders: number;
  customers: number;
}

interface OrderSummary {
  orderId: string;
  customer: string;
  category: string;
  paymentMethod: string;
  status: string;
  total: number;
  orderDate: string;
}

interface CategoryStock {
  name: string;
  stock: number;
  color: string;
}

interface TopCustomer {
  name: string;
  orders: number;
  totalSpent: number;
  topProduct: string;
  lastPurchase: string;
}

interface MarketingMetric {
  channel: string;
  clicks: number;
  conversions: number;
  cost: number;
  roi: number;
}

interface MarketingSummary {
  campaignROI: number;
  emailOpenRate: number;
  socialEngagement: number;
  advertisingCost: number;
}

interface PaginationParams {
  totalItems: number;
  pageNumber: number;
  pageSize: number;
  totalPages: number;
}

export const dashboardApi = createApi({
  reducerPath: 'dashboardApi',
  baseQuery: baseQueryWithErrorHandling,
  tagTypes: ['Dashboard'],
  endpoints: (builder) => ({
    getDashboardSummary: builder.query<DashboardSummary, { startDate?: string; endDate?: string }>({
      query: ({ startDate, endDate }) => ({
        url: '/dashboard/summary',
        params: { startDate, endDate },
      }),
      providesTags: ['Dashboard'],
    }),
    getRevenueByCategory: builder.query<CategoryRevenue[], { startDate?: string; endDate?: string }>({
      query: ({ startDate, endDate }) => ({
        url: '/dashboard/revenue-by-category',
        params: { startDate, endDate },
      }),
      providesTags: ['Dashboard'],
    }),
    getRatingsByCategory: builder.query<CategoryRating[], void>({
      query: () => '/dashboard/ratings-by-category',
      providesTags: ['Dashboard'],
    }),
    getInventoryAlerts: builder.query<InventoryAlert[], { threshold?: number }>({
      query: ({ threshold }) => ({
        url: '/dashboard/inventory-alerts',
        params: { threshold },
      }),
      providesTags: ['Dashboard'],
    }),
    getSalesByMonth: builder.query<MonthlySales[], { months?: number }>({
      query: ({ months }) => ({
        url: '/dashboard/sales-by-month',
        params: { months },
      }),
      providesTags: ['Dashboard'],
    }),
    getOrderSummary: builder.query<{ items: OrderSummary[]; pagination: PaginationParams | null }, { startDate?: string; endDate?: string; pageNumber?: number; pageSize?: number }>({
      query: ({ startDate, endDate, pageNumber, pageSize }) => ({
        url: '/dashboard/order-summary',
        params: { startDate, endDate, pageNumber, pageSize },
      }),
      transformResponse: (response: OrderSummary[], meta) => {
        const paginationHeader = meta?.response?.headers.get('Pagination');
        const pagination = paginationHeader ? JSON.parse(paginationHeader) as PaginationParams : null;
        return {
          items: response,
          pagination,
        };
      },
      providesTags: ['Dashboard'],
    }),
    getStockByCategory: builder.query<CategoryStock[], void>({
      query: () => '/dashboard/stock-by-category',
      providesTags: ['Dashboard'],
    }),
    getTopCustomers: builder.query<TopCustomer[], { limit?: number; startDate?: string; endDate?: string }>({
      query: ({ limit, startDate, endDate }) => ({
        url: '/dashboard/top-customers',
        params: { limit, startDate, endDate },
      }),
      providesTags: ['Dashboard'],
    }),
    getMarketingSummary: builder.query<MarketingSummary, void>({
      query: () => '/dashboard/marketing-summary',
      providesTags: ['Dashboard'],
    }),
    getMarketingMetrics: builder.query<MarketingMetric[], void>({
      query: () => '/dashboard/marketing-metrics',
      providesTags: ['Dashboard'],
    }),
  }),
});

export const {
  useGetDashboardSummaryQuery,
  useGetRevenueByCategoryQuery,
  useGetRatingsByCategoryQuery,
  useGetInventoryAlertsQuery,
  useGetSalesByMonthQuery,
  useGetOrderSummaryQuery,
  useGetStockByCategoryQuery,
  useGetTopCustomersQuery,
  useGetMarketingSummaryQuery,
  useGetMarketingMetricsQuery,
} = dashboardApi;