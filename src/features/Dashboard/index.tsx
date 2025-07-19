import { useState, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Tabs,
  Tab,
  Button,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  ShoppingCart,
  People,
  Warning,
  Store,
  Download,
  Money,
} from "@mui/icons-material";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import {
  useGetDashboardSummaryQuery,
  useGetRevenueByCategoryQuery,
  useGetInventoryAlertsQuery,
  useGetSalesByMonthQuery,
  useGetOrderSummaryQuery,
  useGetStockByCategoryQuery,
  useGetTopCustomersQuery,
} from "../../app/api/dashboardApi";
import { useFetchProductsQuery } from "../../app/api/productApi";

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function Dashboard() {
  const [currentTab, setCurrentTab] = useState("overview");

  // Memoize date range to prevent unnecessary refetches
  const dateRange = useMemo(() => ({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
    endDate: new Date().toISOString(),
  }), []);

  // API queries with skip option
  const { data: summaryData, isLoading: summaryLoading, error: summaryError } = useGetDashboardSummaryQuery(dateRange, {
    skip: currentTab !== "overview",
  });
  const { data: revenueByCategory, isLoading: revenueLoading, error: revenueError } = useGetRevenueByCategoryQuery(dateRange, {
    skip: currentTab !== "overview",
  });
  const { data: inventoryAlerts, isLoading: alertsLoading, error: alertsError } = useGetInventoryAlertsQuery({ threshold: 5 }, {
    skip: currentTab !== "overview" && currentTab !== "inventory",
  });
  const { data: salesByMonth, isLoading: salesLoading, error: salesError } = useGetSalesByMonthQuery({ months: 6 }, {
    skip: currentTab !== "sales",
  });
  const { data: orderSummary, isLoading: ordersLoading, error: ordersError } = useGetOrderSummaryQuery({
    ...dateRange,
    pageNumber: 1,
    pageSize: 10,
  }, {
    skip: currentTab !== "sales",
  });
  const { data: stockByCategory, isLoading: stockLoading, error: stockError } = useGetStockByCategoryQuery(undefined, {
    skip: currentTab !== "inventory",
  });
  const { data: topCustomers, isLoading: customersLoading, error: customersError } = useGetTopCustomersQuery({ 
    limit: 4,
    ...dateRange,
  }, {
    skip: currentTab !== "customers",
  });

  // Fetch products (optional, can remove if not needed)
  useFetchProductsQuery({ pageNumber: 1, pageSize: 100 }, {
    skip: currentTab !== "inventory",
  });

  const handleTabChange = (_: React.SyntheticEvent, newValue: string) => {
    setCurrentTab(newValue);
  };

  // Chart data
  const categoryChartData = {
    labels: revenueByCategory?.map((item) => item.name) || [],
    datasets: [
      {
        label: "Revenue (VND)",
        data: revenueByCategory?.map((item) => item.sales) || [],
        backgroundColor: revenueByCategory?.map((item) => item.color) || ["#0088FE"],
        borderColor: revenueByCategory?.map((item) => item.color) || ["#0088FE"],
        borderWidth: 1,
      },
    ],
  };

  const salesChartData = {
    labels: salesByMonth?.map((item) => item.month) || [],
    datasets: [
      {
        label: "Revenue (VND)",
        data: salesByMonth?.map((item) => item.sales) || [],
        backgroundColor: "#8884d8",
        borderColor: "#8884d8",
        borderWidth: 1,
      },
    ],
  };

  const stockChartData = {
    labels: stockByCategory?.map((item) => item.name) || [],
    datasets: [
      {
        label: "Stock Quantity",
        data: stockByCategory?.map((item) => item.stock) || [],
        backgroundColor: stockByCategory?.map((item) => item.color) || ["#0088FE"],
        borderColor: stockByCategory?.map((item) => item.color) || ["#0088FE"],
        borderWidth: 1,
      },
    ],
  };

  return (
    <Box sx={{ p: 3, flex: 1 }}>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 4 }}>
        <Typography variant="h5" sx={{ fontWeight: 500 }}>
          Business Dashboard
        </Typography>
        <Box sx={{ display: "flex", gap: 1 }}>
          <Button variant="outlined" startIcon={<Store />} sx={{ textTransform: "none" }}>
            View Store
          </Button>
          <Button variant="outlined" startIcon={<Download />} sx={{ textTransform: "none" }}>
            Download Report
          </Button>
        </Box>
      </Box>

      <Tabs value={currentTab} onChange={handleTabChange} sx={{ mb: 4 }}>
        <Tab value="overview" label="Overview" />
        <Tab value="sales" label="Sales" />
        <Tab value="inventory" label="Inventory" />
        <Tab value="customers" label="Customers" />
      </Tabs>

      {currentTab === "overview" && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
          {(summaryLoading || revenueLoading || alertsLoading) && <CircularProgress />}
          {(summaryError || revenueError || alertsError) && (
            <Alert severity="error">Error loading overview data</Alert>
          )}
          {summaryData && (
            <Box>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                Key Performance Metrics
              </Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "repeat(2, 1fr)", lg: "repeat(4, 1fr)" }, gap: 2 }}>
                <Card>
                  <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
                    <Typography variant="subtitle2">Total Revenue Summary</Typography>
                    <Money sx={{ fontSize: 16, color: "text.secondary" }} />
                  </CardContent>
                  <CardContent>
                    <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                      {summaryData.totalRevenue.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      <span style={{ color: summaryData.revenueChange >= 0 ? "#16a34a" : "#dc2626" }}>
                        {summaryData.revenueChange.toFixed(1)}%
                      </span> from last month
                    </Typography>
                    <LinearProgress variant="determinate" value={75} sx={{ mt: 1 }} />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
                    <Typography variant="subtitle2">Active Orders Summary</Typography>
                    <ShoppingCart sx={{ fontSize: 16, color: "text.secondary" }} />
                  </CardContent>
                  <CardContent>
                    <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                      {summaryData.activeOrders.toLocaleString("vi-VN")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      <span style={{ color: summaryData.ordersChange >= 0 ? "#16a34a" : "#dc2626" }}>
                        {summaryData.ordersChange >= 0 ? "+" : ""}{summaryData.ordersChange}
                      </span> from last month
                    </Typography>
                    <LinearProgress variant="determinate" value={65} sx={{ mt: 1 }} />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
                    <Typography variant="subtitle2">Total Customers Summary</Typography>
                    <People sx={{ fontSize: 16, color: "text.secondary" }} />
                  </CardContent>
                  <CardContent>
                    <Typography variant="h5" sx={{ fontWeight: "bold" }}>
                      {summaryData.totalCustomers.toLocaleString("vi-VN")}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      <span style={{ color: summaryData.customersChange >= 0 ? "#16a34a" : "#dc2626" }}>
                        {summaryData.customersChange.toFixed(1)}%
                      </span> from last month
                    </Typography>
                    <LinearProgress variant="determinate" value={80} sx={{ mt: 1 }} />
                  </CardContent>
                </Card>
                <Card>
                  <CardContent sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", pb: 1 }}>
                    <Typography variant="subtitle2">Out of Stock Products Summary</Typography>
                    <Warning sx={{ fontSize: 16, color: "#f97316" }} />
                  </CardContent>
                  <CardContent>
                    <Typography variant="h5" sx={{ fontWeight: "bold", color: "#dc2626" }}>
                      {summaryData.outOfStockProducts}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      <span style={{ color: summaryData.outOfStockChange >= 0 ? "#dc2626" : "#16a34a" }}>
                        {summaryData.outOfStockChange >= 0 ? "+" : ""}{summaryData.outOfStockChange}
                      </span> from yesterday
                    </Typography>
                    <LinearProgress variant="determinate" value={25} sx={{ mt: 1 }} />
                  </CardContent>
                </Card>
              </Box>
            </Box>
          )}
          <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", lg: "7fr 3fr" }, gap: 2 }}>
            <Card>
              <CardHeader>
                <Typography variant="subtitle1">Revenue by Product Category</Typography>
                <Typography variant="body2" color="text.secondary">
                  Compare revenue performance across product categories
                </Typography>
              </CardHeader>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                  Revenue Distribution by Category
                </Typography>
                {revenueByCategory && (
                  <Box sx={{ height: 350 }}>
                    <Bar
                      data={categoryChartData}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: "top" },
                          title: {
                            display: true,
                            text: "Revenue Distribution by Category",
                          },
                          tooltip: {
                            callbacks: {
                              label: (context) => `${context.dataset.label}: ${(context.raw as number).toLocaleString("vi-VN", { style: "currency", currency: "VND" })}`,
                            },
                          },
                        },
                        scales: {
                          y: {
                            beginAtZero: true,
                            ticks: {
                              callback: (value) => `${Number(value) / 1000000}M VND`,
                            },
                          },
                        },
                      }}
                    />
                  </Box>
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Typography variant="subtitle1">Inventory Alerts</Typography>
                <Typography variant="body2" color="text.secondary">
                  Products requiring immediate attention
                </Typography>
              </CardHeader>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                  Critical Inventory Status
                </Typography>
                {inventoryAlerts && (
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    {inventoryAlerts.map((item, index) => (
                      <Box key={index} sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Box>
                          <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                            {item.product}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            {item.category}
                          </Typography>
                        </Box>
                        <Chip
                          label={item.stock === 0 ? "Out of Stock" : `${item.stock} left`}
                          color={item.status === "critical" || item.status === "out" ? "error" : "warning"}
                          size="small"
                        />
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>
          </Box>
        </Box>
      )}

      {currentTab === "sales" && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Card>
            <CardHeader>
              <Typography variant="subtitle1">Monthly Revenue Overview</Typography>
              <Typography variant="body2" color="text.secondary">
                Revenue and orders over the past 6 months
              </Typography>
            </CardHeader>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                Monthly Revenue Trend
              </Typography>
              {salesLoading && <CircularProgress />}
              {salesError && <Alert severity="error">Error loading sales data</Alert>}
              {salesByMonth && (
                <Box sx={{ height: 350 }}>
                  <Bar
                    data={salesChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: "top" },
                        title: {
                          display: true,
                          text: "Monthly Revenue Trend",
                        },
                        tooltip: {
                          callbacks: {
                            label: (context) => `${context.dataset.label}: ${(context.raw as number).toLocaleString("vi-VN", { style: "currency", currency: "VND" })}`,
                          },
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: (value) => `${Number(value) / 1000000}M VND`,
                          },
                        },
                      },
                    }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Typography variant="subtitle1">Order Summary</Typography>
              <Typography variant="body2" color="text.secondary">
                Detailed breakdown of orders by customer, category, and payment method
              </Typography>
            </CardHeader>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                Recent Orders
              </Typography>
              {ordersLoading && <CircularProgress />}
              {ordersError && <Alert severity="error">Error loading order summary</Alert>}
              {orderSummary && (
                <TableContainer component={Paper} elevation={0}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Order ID</TableCell>
                        <TableCell>Customer</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Payment Method</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Total</TableCell>
                        <TableCell>Date</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {orderSummary.items.map((order, index) => (
                        <TableRow key={index}>
                          <TableCell>{order.orderId}</TableCell>
                          <TableCell sx={{ fontWeight: "medium" }}>{order.customer}</TableCell>
                          <TableCell>{order.category}</TableCell>
                          <TableCell>{order.paymentMethod}</TableCell>
                          <TableCell>
                            <Chip label={order.status} color={order.status === "Delivered" ? "success" : "warning"} />
                          </TableCell>
                          <TableCell>{order.total.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}</TableCell>
                          <TableCell>{order.orderDate}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {currentTab === "inventory" && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Card>
            <CardHeader>
              <Typography variant="subtitle1">Stock by Product Category</Typography>
              <Typography variant="body2" color="text.secondary">
                Total stock quantity across product categories
              </Typography>
            </CardHeader>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                Stock Levels by Category
              </Typography>
              {stockLoading && <CircularProgress />}
              {stockError && <Alert severity="error">Error loading stock data</Alert>}
              {stockByCategory && (
                <Box sx={{ height: 350 }}>
                  <Bar
                    data={stockChartData}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: "top" },
                        title: {
                          display: true,
                          text: "Stock Levels by Category",
                        },
                        tooltip: {
                          callbacks: {
                            label: (context) => `${context.dataset.label}: ${context.raw} units`,
                          },
                        },
                      },
                      scales: {
                        y: {
                          beginAtZero: true,
                          ticks: {
                            callback: (value) => `${value} units`,
                          },
                        },
                      },
                    }}
                  />
                </Box>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <Typography variant="subtitle1">Inventory Management Alerts</Typography>
              <Typography variant="body2" color="text.secondary">
                Products requiring attention
              </Typography>
            </CardHeader>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                Inventory Status Overview
              </Typography>
              {alertsLoading && <CircularProgress />}
              {alertsError && <Alert severity="error">Error loading inventory alerts</Alert>}
              {inventoryAlerts && (
                <TableContainer component={Paper} elevation={0}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Product</TableCell>
                        <TableCell>Category</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Stock</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {inventoryAlerts.map((item, index) => (
                        <TableRow key={index}>
                          <TableCell>{item.product}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>
                            <Chip
                              label={
                                item.status === "critical"
                                  ? "Critical"
                                  : item.status === "out"
                                  ? "Out of Stock"
                                  : "Low Stock"
                              }
                              color={item.status === "critical" || item.status === "out" ? "error" : "warning"}
                            />
                          </TableCell>
                          <TableCell>{item.stock === 0 ? "Out of Stock" : item.stock}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>
      )}

      {currentTab === "customers" && (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
          <Card>
            <CardHeader>
              <Typography variant="subtitle1">Top Customers List</Typography>
              <Typography variant="body2" color="text.secondary">
                High-value customers with their top purchased product
              </Typography>
            </CardHeader>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 500 }}>
                High-Value Customers
              </Typography>
              {customersLoading && <CircularProgress />}
              {customersError && <Alert severity="error">Error loading customer data</Alert>}
              {topCustomers && (
                <TableContainer component={Paper} elevation={0}>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Customer Name</TableCell>
                        <TableCell>Orders</TableCell>
                        <TableCell>Total Spent</TableCell>
                        <TableCell>Top Product</TableCell>
                        <TableCell>Last Purchase</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {topCustomers.map((customer, index) => (
                        <TableRow key={index}>
                          <TableCell sx={{ fontWeight: "medium" }}>{customer.name}</TableCell>
                          <TableCell>{customer.orders}</TableCell>
                          <TableCell>{customer.totalSpent.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}</TableCell>
                          <TableCell>{customer.topProduct}</TableCell>
                          <TableCell>{customer.lastPurchase}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Box>
      )}
    </Box>
  );
}