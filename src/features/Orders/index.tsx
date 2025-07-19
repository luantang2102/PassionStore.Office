/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
import { useState, useEffect, useCallback, useMemo } from "react";
import {
  Box,
  TextField,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Pagination,
  Button,
  Typography,
  Paper,
  Chip,
  IconButton,
  InputAdornment,
  Card,
  CardContent,
  CardHeader,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  CircularProgress,
  Alert,
  Snackbar,
  SelectChangeEvent,
  Tabs,
  Tab,
  Avatar,
} from "@mui/material";
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  Save as SaveIcon,
  AssignmentReturn as ReturnIcon,
  Inventory as PackageIcon,
  Download as DownloadIcon,
  Visibility as EyeIcon,
  AttachMoney as DollarSignIcon,
  AccessTime as ClockIcon,
  CheckCircle as CheckCircleIcon,
  Cancel as XCircleIcon,
  Warning as AlertCircleIcon,
  LocalShipping as TruckIcon,
  SwapVert as ArrowUpDownIcon,
  CalendarToday as CalendarIcon,
  CreditCard as CreditCardIcon,
} from "@mui/icons-material";
import { useAppDispatch, useAppSelector } from "../../app/store/store";
import {
  useFetchAllOrdersQuery,
  useUpdateOrderStatusMutation,
  useRequestReturnMutation,
  useUpdateReturnStatusMutation,
  useFetchValidStatusTransitionsQuery,
} from "../../app/api/orderApi";
import { format } from "date-fns";
import { Order } from "../../app/models/responses/order";
import { PaginationParams } from "../../app/models/params/pagination";
import { OrderStatusRequest } from "../../app/models/requests/orderStatusRequest";
import { ReturnRequest, ReturnStatusRequest } from "../../app/models/requests/returnRequest";
import { debounce } from "lodash";
import { setPageNumber, setParams, setReturnDialogOpen, setReturnReason, setSelectedOrderId } from "./orderSlice";

// Status transition logic
const statusTransitions = {
  PayOS: {
    PendingPayment: ["PaymentConfirmed", "PaymentFailed", "Cancelled"],
    PaymentConfirmed: ["OrderConfirmed", "OnHold", "Cancelled"],
    PaymentFailed: ["PendingPayment", "Cancelled"],
    OrderConfirmed: ["Processing", "OnHold", "Cancelled"],
    Processing: ["ReadyToShip", "OnHold", "Cancelled"],
    ReadyToShip: ["Shipped", "OnHold", "Cancelled"],
    Shipped: ["OutForDelivery", "OnHold"],
    OutForDelivery: ["Delivered"],
    Delivered: ["ReturnRequested", "Completed"],
    ReturnRequested: ["Returned", "Completed"],
    Returned: ["Refunded", "Completed"],
    Refunded: ["Completed"],
    OnHold: ["OrderConfirmed"],
    Cancelled: [],
  },
  COD: {
    OrderConfirmed: ["Processing", "OnHold", "Cancelled"],
    Processing: ["ReadyToShip", "OnHold", "Cancelled"],
    ReadyToShip: ["Shipped", "OnHold", "Cancelled"],
    Shipped: ["OutForDelivery", "OnHold"],
    OutForDelivery: ["Delivered"],
    Delivered: ["PaymentReceived", "ReturnRequested"],
    PaymentReceived: ["Completed"],
    ReturnRequested: ["Returned", "Completed"],
    Returned: ["Refunded", "Completed"],
    Refunded: ["Completed"],
    OnHold: ["OrderConfirmed"],
    Cancelled: [],
  },
};

// Status display configuration
const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PendingPayment: { label: "Pending Payment", color: "#FFF3E0", icon: ClockIcon },
  PaymentConfirmed: { label: "Payment Confirmed", color: "#E6FFEE", icon: CheckCircleIcon },
  OrderConfirmed: { label: "Order Confirmed", color: "#E3F2FD", icon: CheckCircleIcon },
  Processing: { label: "Processing", color: "#EDE7F6", icon: RefreshIcon },
  ReadyToShip: { label: "Ready to Ship", color: "#E8EAF6", icon: PackageIcon },
  Shipped: { label: "Shipped", color: "#E3F2FD", icon: TruckIcon },
  OutForDelivery: { label: "Out for Delivery", color: "#FFEDD5", icon: TruckIcon },
  Delivered: { label: "Delivered", color: "#E6FFEE", icon: CheckCircleIcon },
  PaymentReceived: { label: "Payment Received", color: "#E6FFEE", icon: DollarSignIcon },
  Completed: { label: "Completed", color: "#E6FFEE", icon: CheckCircleIcon },
  PaymentFailed: { label: "Payment Failed", color: "#FFEBEE", icon: XCircleIcon },
  OnHold: { label: "On Hold", color: "#F5F5F5", icon: AlertCircleIcon },
  Cancelled: { label: "Cancelled", color: "#FFEBEE", icon: XCircleIcon },
  ReturnRequested: { label: "Return Requested", color: "#FFEDD5", icon: ReturnIcon },
  Returned: { label: "Returned", color: "#FFEDD5", icon: ReturnIcon },
  Refunded: { label: "Refunded", color: "#F5F5F5", icon: DollarSignIcon },
};

export default function OrderList() {
  const dispatch = useAppDispatch();
  const { params, selectedOrderId, isReturnDialogOpen, returnReason } = useAppSelector(
    (state) => state.order
  );
  const { data, isLoading, error, refetch, isFetching } = useFetchAllOrdersQuery(params);
  const [updateOrderStatus, { isLoading: isUpdating }] = useUpdateOrderStatusMutation();
  const [requestReturn, { isLoading: isRequestingReturn }] = useRequestReturnMutation();
  const [updateReturnStatus, { isLoading: isUpdatingReturn }] = useUpdateReturnStatusMutation();
  const [sortBy, setSortBy] = useState("orderDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  
  const filteredOrders = useMemo(() => {
    if (!data?.items) return [];
    let sorted = [...data.items];
    if (sortBy) {
      sorted.sort((a, b) => {
        let aValue: any = a[sortBy as keyof Order];
        let bValue: any = b[sortBy as keyof Order];
        if (sortBy === "orderDate" || sortBy === "createdDate" || sortBy === "updatedDate") {
          aValue = new Date(aValue).getTime();
          bValue = new Date(bValue).getTime();
        }
        return sortOrder === "asc" ? (aValue > bValue ? 1 : -1) : (aValue < bValue ? 1 : -1);
      });
    }
    return sorted;
  }, [data, sortBy, sortOrder]);

  const { data: validTransitions, isLoading: isLoadingTransitions } = useFetchValidStatusTransitionsQuery(
    selectedOrderId || "",
    { skip: !selectedOrderId || filteredOrders.find((o) => o.id === selectedOrderId)?.paymentMethod === "COD" }
  );

  const [search, setSearch] = useState(params.searchTerm || "");
  const [statusFilter, setStatusFilter] = useState<string>(params.status || "");

  const [newReturnStatus, setNewReturnStatus] = useState<string>("");
  const [refundReason, setRefundReason] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Notification state
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  });

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      dispatch(setParams({ searchTerm: value.trim() || undefined }));
      dispatch(setPageNumber(1));
    }, 500),
    [dispatch]
  );

  // Sync search and status filter with params
  useEffect(() => {
    setSearch(params.searchTerm || "");
    setStatusFilter(params.status || "");
  }, [params.searchTerm, params.status]);

  // Reset form data when dialogs open/close
  useEffect(() => {
    if (isReturnDialogOpen) {
      setNewReturnStatus("");
      setRefundReason("");
      setReturnReason("");
    }
  }, [isReturnDialogOpen]);

  // Handlers
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearch(value);
    debouncedSearch(value);
  };

  const handleClearSearch = () => {
    setSearch("");
    dispatch(setParams({ searchTerm: undefined }));
    dispatch(setPageNumber(1));
  };

  const handleStatusFilterChange = (e: SelectChangeEvent<string>) => {
    const value = e.target.value as string;
    setStatusFilter(value);
    dispatch(setParams({ status: value || undefined }));
    dispatch(setPageNumber(1));
  };

  const handleSortChange = (newSortBy: string) => {
    setSortBy(newSortBy);
    setSortOrder(sortBy === newSortBy && sortOrder === "asc" ? "desc" : "asc");
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    dispatch(setPageNumber(page));
  };

  const handleUpdateStatus = async (orderId: string, newStatus: string) => {
    if (!orderId || !newStatus) {
      setNotification({
        open: true,
        message: "Please select a valid status.",
        severity: "error",
      });
      return;
    }

    const order = filteredOrders.find((o) => o.id === orderId);
    if (!order) {
      setNotification({
        open: true,
        message: "Order not found.",
        severity: "error",
      });
      return;
    }

    const validStatuses = getValidTransitions(order);
    if (!validStatuses.includes(newStatus)) {
      setNotification({
        open: true,
        message: `Invalid status transition from ${order.status} to ${newStatus}.`,
        severity: "error",
      });
      return;
    }

    try {
      const statusRequest: OrderStatusRequest = { status: newStatus };
      await updateOrderStatus({ id: orderId, data: statusRequest }).unwrap();
      setNotification({
        open: true,
        message: "Order status updated successfully",
        severity: "success",
      });
    } catch (err) {
      console.error("Failed to update order status:", err);
      setNotification({
        open: true,
        message: "Failed to update order status",
        severity: "error",
      });
    }
  };

  const handleReturnClick = (id: string, reason?: string) => {
    dispatch(setSelectedOrderId(id));
    dispatch(setReturnReason(reason || ""));
    dispatch(setReturnDialogOpen(true));
  };

  const handleRequestReturnClick = (id: string) => {
    dispatch(setSelectedOrderId(id));
    dispatch(setReturnDialogOpen(true));
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
  };

  const handleCloseDialog = () => {
    dispatch(setReturnDialogOpen(false));
    dispatch(setSelectedOrderId(null));
    dispatch(setReturnReason(""));
    setSelectedOrder(null);
  };

  const handleRequestReturn = async () => {
    if (!selectedOrderId || !returnReason) {
      setNotification({
        open: true,
        message: "Please provide a return reason.",
        severity: "error",
      });
      return;
    }

    try {
      const returnRequest: ReturnRequest = { reason: returnReason };
      await requestReturn({ id: selectedOrderId, data: returnRequest }).unwrap();
      setNotification({
        open: true,
        message: "Return requested successfully",
        severity: "success",
      });
      handleCloseDialog();
    } catch (err) {
      console.error("Failed to request return:", err);
      setNotification({
        open: true,
        message: "Failed to request return",
        severity: "error",
      });
    }
  };

  const handleUpdateReturnStatus = async () => {
    if (!selectedOrderId || !newReturnStatus) {
      setNotification({
        open: true,
        message: "Please select a valid return status.",
        severity: "error",
      });
      return;
    }

    if (newReturnStatus === "Refunded" && !refundReason) {
      setNotification({
        open: true,
        message: "Please provide a refund reason.",
        severity: "error",
      });
      return;
    }

    try {
      const returnStatusRequest: ReturnStatusRequest = {
        status: newReturnStatus,
        refundReason: newReturnStatus === "Refunded" ? refundReason : undefined,
      };
      await updateReturnStatus({ id: selectedOrderId, data: returnStatusRequest }).unwrap();
      setNotification({
        open: true,
        message: "Return status updated successfully",
        severity: "success",
      });
      handleCloseDialog();
    } catch (err) {
      console.error("Failed to update return status:", err);
      setNotification({
        open: true,
        message: "Failed to update return status",
        severity: "error",
      });
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return "N/A";
    return format(new Date(dateString), "MMM dd, yyyy HH:mm");
  };

  const calculateStartIndex = (pagination: PaginationParams) => {
    return (pagination.currentPage - 1) * pagination.pageSize + 1;
  };

  const calculateEndIndex = (pagination: PaginationParams) => {
    const endIndex = pagination.currentPage * pagination.pageSize;
    return endIndex > pagination.totalCount ? pagination.totalCount : endIndex;
  };

  const getValidTransitions = (order: Order): string[] => {
    const paymentMethod = order.paymentMethod === "PayOS" ? "PayOS" : "COD";
    return (
      statusTransitions[paymentMethod][order.status as keyof typeof statusTransitions[typeof paymentMethod]] || []
    ) as string[];
  };

  const StatusBadge = ({ status, orderId }: { status: string; orderId: string }) => {
    const config = statusConfig[status] || { label: status, color: "#F5F5F5", icon: AlertCircleIcon };
    const Icon = config.icon;
    const order = filteredOrders.find((o) => o.id === orderId);
    const validStatusTransitions = order
      ? getValidTransitions(order) // Use local transitions for COD
      : validTransitions || []; // Fallback to API transitions for PayOS

    return (
      <FormControl sx={{ minWidth: 150 }} size="small">
        <Select
          value={status}
          onChange={(e) => handleUpdateStatus(orderId, e.target.value as string)}
          disabled={isUpdating || validStatusTransitions.length === 0}
          sx={{ backgroundColor: config.color, borderRadius: 1 }}
          renderValue={() => (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Icon sx={{ fontSize: 16 }} />
              <Typography variant="body2">{config.label}</Typography>
            </Box>
          )}
        >
          <MenuItem value={status}>
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Icon sx={{ fontSize: 16 }} />
              {config.label}
            </Box>
          </MenuItem>
          {validStatusTransitions.map((transitionStatus) => (
            <MenuItem key={transitionStatus} value={transitionStatus}>
              {statusConfig[transitionStatus]?.label || transitionStatus}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    );
  };

  const OrderDetailsDialog = ({ order }: { order: Order }) => {
    const [tab, setTab] = useState("overview");

    return (
      <Dialog open={!!selectedOrder} onClose={handleCloseDialog} maxWidth="lg" fullWidth>
        <DialogTitle>Order Details</DialogTitle>
        <DialogContent>
          <Tabs value={tab} onChange={(_, newValue) => setTab(newValue)} sx={{ mb: 2 }}>
            <Tab value="overview" label="Overview" />
            <Tab value="items" label="Items" />
            <Tab value="customer" label="Customer" />
            <Tab value="shipping" label="Shipping" />
          </Tabs>
          {tab === "overview" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
                <Card>
                  <CardHeader title={<Typography variant="subtitle2">Order Status</Typography>} />
                  <CardContent>
                    <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <StatusBadge status={order.status} orderId={order.id} />
                    </Box>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader title={<Typography variant="subtitle2">Order Total</Typography>} />
                  <CardContent>
                    <Typography variant="h6">{order.totalAmount.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      Shipping: {order.shippingCost.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {order.orderItems.length} item{order.orderItems.length !== 1 ? "s" : ""}
                    </Typography>
                  </CardContent>
                </Card>
              </Box>
              <Card>
                <CardHeader title={<Typography variant="subtitle2">Order Timeline</Typography>} />
                <CardContent>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <CalendarIcon sx={{ fontSize: 16 }} />
                      <Typography variant="body2">
                        Ordered: {formatDate(order.orderDate)}
                      </Typography>
                    </Box>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <CalendarIcon sx={{ fontSize: 16 }} />
                      <Typography variant="body2">
                        Created: {formatDate(order.createdDate)}
                      </Typography>
                    </Box>
                    {order.updatedDate && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <CalendarIcon sx={{ fontSize: 16 }} />
                        <Typography variant="body2">
                          Updated: {formatDate(order.updatedDate)}
                        </Typography>
                      </Box>
                    )}
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <TruckIcon sx={{ fontSize: 16 }} />
                      <Typography variant="body2">
                        Est. Delivery: {order.estimatedDelivery ? formatDate(order.estimatedDelivery) : "N/A"}
                      </Typography>
                    </Box>
                    {order.trackingNumber && (
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <PackageIcon sx={{ fontSize: 16 }} />
                        <Typography variant="body2">Tracking: {order.trackingNumber}</Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
              {(order.note || order.returnReason) && (
                <Card>
                  <CardHeader title={<Typography variant="subtitle2">Notes</Typography>} />
                  <CardContent>
                    <Typography variant="body2">
                      {order.note || order.returnReason || "No notes available"}
                    </Typography>
                  </CardContent>
                </Card>
              )}
            </Box>
          )}
          {tab === "items" && (
            <Card>
              <CardHeader title={<Typography variant="subtitle1">Order Items</Typography>} />
              <CardContent>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  {order.orderItems.map((item, index) => (
                    <Box
                      key={index}
                      sx={{ display: "flex", alignItems: "center", gap: 2, p: 2, border: "1px solid #e5e7eb", borderRadius: 1 }}
                    >
                      <img
                        src={item.productImage || "/placeholder.svg"}
                        alt={item.productName}
                        style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 4 }}
                      />
                      <Box sx={{ flex: 1 }}>
                        <Typography variant="subtitle2">{item.productName}</Typography>
                        <Box sx={{ display: "flex", gap: 1, mt: 1, mb: 2 }}>
                          {item.color?.name && item.color.name !== "None" && (
                            <Chip
                              label={`Color: ${item.color.name}`}
                              size="small"
                              sx={{ backgroundColor: item.color.hexCode, color: item.color.hexCode === "#000000" ? "#fff" : "#000" }}
                            />
                          )}
                          {item.size?.name && item.size.name !== "None" && (
                            <Chip label={`Size: ${item.size.name}`} size="small" />
                          )}
                        </Box>
                        <Typography variant="body2" color="text.secondary">
                          Quantity: {item.quantity} × {item.price.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
                        </Typography>
                      </Box>
                      <Typography variant="subtitle2">{(item.quantity * item.price).toLocaleString("vi-VN", { style: "currency", currency: "VND" })}</Typography>
                    </Box>
                  ))}
                  <Divider />
                  <Box sx={{ display: "flex", justifyContent: "space-between", mt: 2 }}>
                    <Typography variant="subtitle2">Total</Typography>
                    <Typography variant="subtitle2" sx={{ color: "#e56565ff" }}>
                      {order.totalAmount.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
          {tab === "customer" && (
            <Card>
              <CardHeader title={<Typography variant="subtitle1">Customer Information</Typography>} />
              <CardContent>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar>{order.userProfile.fullName?.split(" ").map((n) => n[0]).join("") || "N/A"}</Avatar>
                    <Box>
                      <Typography variant="subtitle2">{order.userProfile.fullName}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {order.userProfile.phoneNumber}
                      </Typography>
                    </Box>
                  </Box>
                  <Divider />
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Payment Method
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <CreditCardIcon sx={{ fontSize: 16 }} />
                      <Typography variant="body2">{order.paymentMethod}</Typography>
                    </Box>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          )}
          {tab === "shipping" && (
            <Card>
              <CardHeader title={<Typography variant="subtitle1">Shipping Information</Typography>} />
              <CardContent>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Shipping Address
                    </Typography>
                    <Typography variant="body2">{order.userProfile.specificAddress}</Typography>
                    <Typography variant="body2">
                      {order.userProfile.ward}, {order.userProfile.district}, {order.userProfile.province}
                    </Typography>
                    <Typography variant="body2">{order.shippingAddress}</Typography>
                  </Box>
                  <Box>
                    <Typography variant="subtitle2" sx={{ mb: 1 }}>
                      Shipping Method
                    </Typography>
                    <Typography variant="body2">{order.shippingMethod}</Typography>
                  </Box>
                  {order.trackingNumber && (
                    <Box>
                      <Typography variant="subtitle2" sx={{ mb: 1 }}>
                        Tracking Information
                      </Typography>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                        <PackageIcon sx={{ fontSize: 16 }} />
                        <Typography variant="body2">{order.trackingNumber}</Typography>
                        <Button variant="outlined" size="small">
                          Track Package
                        </Button>
                      </Box>
                    </Box>
                  )}
                </Box>
              </CardContent>
            </Card>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Close</Button>
        </DialogActions>
      </Dialog>
    );
  };

  const OrdersView = () => (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 500 }}>
        Order Management
      </Typography>
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
          <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2 }}>
            <TextField
              label="Search Orders"
              value={search}
              onChange={handleSearchChange}
              variant="outlined"
              size="small"
              sx={{ width: "300px" }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon />
                  </InputAdornment>
                ),
                endAdornment: search && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch}>
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              disabled={isFetching}
            />
            <FormControl sx={{ width: { xs: "100%", md: 200 } }} size="small">
              <InputLabel>Filter by Status</InputLabel>
              <Select
                value={statusFilter}
                onChange={handleStatusFilterChange}
                label="Filter by Status"
                disabled={isFetching}
              >
                <MenuItem value="">All Statuses</MenuItem>
                {Object.keys(statusConfig).map((status) => (
                  <MenuItem key={status} value={status}>
                    {statusConfig[status].label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl sx={{ width: { xs: "100%", md: 150 } }} size="small">
              <InputLabel>Sort By</InputLabel>
              <Select value={sortBy} onChange={(e) => handleSortChange(e.target.value)} label="Sort By">
                <MenuItem value="orderDate">Date</MenuItem>
                <MenuItem value="totalAmount">Total</MenuItem>
                <MenuItem value="userProfile.fullName">Customer</MenuItem>
              </Select>
            </FormControl>
            <IconButton onClick={() => handleSortChange(sortBy)}>
              <ArrowUpDownIcon sx={{ fontSize: 20 }} />
            </IconButton>
          </Box>
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="outlined"
              color="primary"
              onClick={() => {}}
              startIcon={<DownloadIcon />}
              sx={{ borderRadius: "8px", textTransform: "none" }}
            >
              Export
            </Button>
          </Box>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <TableContainer component={Paper} elevation={0} sx={{ mb: 2 }}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell>Customer</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Items</TableCell>
                <TableCell>Shipping Method</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Date</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell>
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: "medium" }}>
                        {order.userProfile.fullName}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {order.userProfile.phoneNumber}
                      </Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={order.status} orderId={order.id} />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                      {order.orderItems.map((item, index) => (
                        <Box key={index} sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          <Typography variant="body2">+ {item.productName}</Typography>
                          {item.color?.name && item.color.name !== "None" && (
                            <Chip
                              label={item.color.name}
                              size="small"
                              sx={{ backgroundColor: item.color.hexCode, color: item.color.hexCode === "#000000" ? "#fff" : "#000" }}
                            />
                          )}
                          {item.size?.name && item.size.name !== "None" && (
                            <Chip label={item.size.name} size="small" />
                          )}
                          <Chip
                            label={"x" + item.quantity}
                            size="small"
                            sx={{ backgroundColor: "#31ddc4ff", color: "#000" }}
                          />
                        </Box>
                      ))}
                    </Box>
                  </TableCell>
                  <TableCell>{order.shippingMethod}</TableCell>
                  <TableCell sx={{ fontWeight: "medium" }}>{order.totalAmount.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}</TableCell>
                  <TableCell>{formatDate(order.orderDate)}</TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
                      <Button variant="outlined" size="small" onClick={() => handleViewOrder(order)}>
                        <EyeIcon sx={{ fontSize: 16 }} />
                      </Button>
                      {order.status === "Delivered" && (
                        <IconButton color="warning" onClick={() => handleRequestReturnClick(order.id)}>
                          <ReturnIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      )}
                      {(order.status === "ReturnRequested" || order.status === "Returned") && (
                        <IconButton color="warning" onClick={() => handleReturnClick(order.id, order.returnReason)}>
                          <ReturnIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {(!filteredOrders || filteredOrders.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1" color="textSecondary">
                      {search ? `No orders found for "${search}"` : "No orders found"}
                    </Typography>
                    {search && (
                      <Button startIcon={<ClearIcon />} onClick={handleClearSearch} sx={{ mt: 2 }}>
                        Clear Search
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        {data?.pagination && filteredOrders.length > 0 && (
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 3 }}>
            <Typography variant="body2" color="textSecondary">
              Showing {calculateStartIndex(data.pagination)} - {calculateEndIndex(data.pagination)} of{" "}
              {data.pagination.totalCount} orders
            </Typography>
            <Pagination
              count={data.pagination.totalPages}
              page={data.pagination.currentPage}
              onChange={handlePageChange}
              color="primary"
              shape="rounded"
            />
          </Box>
        )}
      </Paper>
    </Box>
  );

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading orders...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Card sx={{ p: 3, m: 2, bgcolor: "#fff4f4" }}>
        <CardContent>
          <Typography variant="h6" color="error">
            Error loading orders
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Please try again later or contact support.
          </Typography>
          <Button startIcon={<RefreshIcon />} variant="outlined" sx={{ mt: 2 }} onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Notification */}
      <Snackbar
        open={notification.open}
        autoHideDuration={6000}
        onClose={handleCloseNotification}
        anchorOrigin={{ vertical: "top", horizontal: "right" }}
      >
        <Alert onClose={handleCloseNotification} severity={notification.severity} sx={{ width: "100%" }}>
          {notification.message}
        </Alert>
      </Snackbar>

      {/* Main Content */}
      <OrdersView />

      {/* Return Dialog */}
      <Dialog open={isReturnDialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>{returnReason ? "Manage Return" : "Request Return"}</DialogTitle>
        <DialogContent>
          {returnReason ? (
            <>
              <Typography variant="subtitle1" sx={{ mb: 2 }}>
                Return Reason: {returnReason}
              </Typography>
              {isLoadingTransitions ? (
                <Box sx={{ display: "flex", justifyContent: "center", p: 2 }}>
                  <CircularProgress size={24} />
                </Box>
              ) : (
                <FormControl fullWidth sx={{ mt: 2 }}>
                  <InputLabel>Return Status</InputLabel>
                  <Select
                    value={newReturnStatus}
                    onChange={(e) => setNewReturnStatus(e.target.value as string)}
                    label="Return Status"
                    disabled={!validTransitions || validTransitions.length === 0}
                  >
                    <MenuItem value="">
                      <em>Select Status</em>
                    </MenuItem>
                    {validTransitions?.map((status) => (
                      <MenuItem key={status} value={status}>
                        {statusConfig[status]?.label || status}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
              {newReturnStatus === "Refunded" && (
                <TextField
                  label="Refund Reason"
                  fullWidth
                  multiline
                  rows={3}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  margin="normal"
                  required
                />
              )}
            </>
          ) : (
            <TextField
              label="Return Reason"
              fullWidth
              multiline
              rows={3}
              value={returnReason}
              onChange={(e) => setReturnReason(e.target.value)}
              margin="normal"
              required
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          {returnReason ? (
            <Button
              onClick={handleUpdateReturnStatus}
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={isUpdatingReturn || !newReturnStatus || (newReturnStatus === "Refunded" && !refundReason) || isLoadingTransitions}
            >
              {isUpdatingReturn ? <CircularProgress size={24} /> : "Update Return"}
            </Button>
          ) : (
            <Button
              onClick={handleRequestReturn}
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={isRequestingReturn || !returnReason}
            >
              {isRequestingReturn ? <CircularProgress size={24} /> : "Request Return"}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      {/* Order Details Dialog */}
      {selectedOrder && <OrderDetailsDialog order={selectedOrder} />}
    </Box>
  );
}