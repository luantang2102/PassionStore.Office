/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable prefer-const */
import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  Tooltip,
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
  Receipt as ReceiptIcon,
  Delete,
} from "@mui/icons-material";
import { useAppDispatch, useAppSelector } from "../../app/store/store";
import {
  useFetchAllOrdersQuery,
  useUpdateOrderStatusMutation,
  useRequestReturnMutation,
  useUpdateReturnStatusMutation,
  useFetchValidStatusTransitionsQuery,
  useDeleteCancelledOrderMutation,
} from "../../app/api/orderApi";
import { format } from "date-fns";
import { Order } from "../../app/models/responses/order";
import { PaginationParams } from "../../app/models/params/pagination";
import { OrderStatusRequest } from "../../app/models/requests/orderStatusRequest";
import { ReturnRequest, ReturnStatusRequest } from "../../app/models/requests/returnRequest";
import { debounce } from "lodash";
import { setPageNumber, setParams, setReturnDialogOpen, setReturnReason, setSelectedOrderId } from "./orderSlice";
import * as XLSX from "xlsx";
import jsPDF from "jspdf";

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
  const { user } = useAppSelector((state) => state.auth);
  const { data, isLoading, error, refetch, isFetching } = useFetchAllOrdersQuery(params);
  const [updateOrderStatus, { isLoading: isUpdating }] = useUpdateOrderStatusMutation();
  const [requestReturn, { isLoading: isRequestingReturn }] = useRequestReturnMutation();
  const [updateReturnStatus, { isLoading: isUpdatingReturn }] = useUpdateReturnStatusMutation();
  const [deleteCancelledOrder, { isLoading: isDeleting }] = useDeleteCancelledOrderMutation();
  const [sortBy, setSortBy] = useState("orderDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState<string | null>(null);
  const [search, setSearch] = useState(params.searchTerm || "");
  const [statusFilter, setStatusFilter] = useState<string>(params.status || "");
  const [newReturnStatus, setNewReturnStatus] = useState<string>("");
  const [refundReason, setRefundReason] = useState<string>("");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  const [localReturnReason, setLocalReturnReason] = useState<string>("");
  const [isNewReturn, setIsNewReturn] = useState<boolean>(true);
  const returnReasonInputRef = useRef<HTMLInputElement>(null);

  const isAdmin = useMemo(() => user?.roles?.includes("Admin") || false, [user]);

  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  });

  const debouncedSearch = useCallback(
    debounce((value: string) => {
      dispatch(setParams({ searchTerm: value.trim() || undefined }));
      dispatch(setPageNumber(1));
    }, 500),
    [dispatch]
  );

  useEffect(() => {
    setSearch(params.searchTerm || "");
    setStatusFilter(params.status || "");
  }, [params.searchTerm, params.status]);

  useEffect(() => {
    if (isReturnDialogOpen) {
      setNewReturnStatus("");
      setRefundReason("");
      setInputError(null);
      if (isNewReturn) {
        setLocalReturnReason("");
        dispatch(setReturnReason(""));
        setTimeout(() => {
          if (returnReasonInputRef.current) {
            returnReasonInputRef.current.focus();
          }
        }, 0);
      } else {
        setLocalReturnReason(returnReason);
      }
    }
  }, [isReturnDialogOpen, isNewReturn, returnReason, dispatch]);

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
        } else if (sortBy === "note" || sortBy === "senderFullName") {
          aValue = aValue || "";
          bValue = bValue || "";
        } else if (sortBy === "recipientFullName") {
          aValue = a.userProfile.fullName || "";
          bValue = b.userProfile.fullName || "";
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

  const handleExportXLS = () => {
    if (!data?.items) return;

    const exportData = data.items.map((order) => ({
      "Order ID": order.id,
      Recipient: order.userProfile.fullName,
      Sender: order.senderFullName || "N/A",
      Status: statusConfig[order.status]?.label || order.status,
      "Total Amount": order.totalAmount.toLocaleString("vi-VN", { style: "currency", currency: "VND" }),
      "Order Date": formatDate(order.orderDate),
      "Shipping Method": order.shippingMethod,
      Items: order.orderItems.map((item) => `${item.productName} (x${item.quantity})`).join(", "),
      Note: order.note || "N/A",
      "Tracking Number": order.trackingNumber || "N/A",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Orders");
    XLSX.writeFile(workbook, `orders_export_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
    setNotification({
      open: true,
      message: "Orders exported successfully",
      severity: "success",
    });
  };

  const handleGenerateReceipt = (order: Order) => {
    const doc = new jsPDF();
    doc.setFontSize(16);
    doc.text("Order Receipt", 20, 20);
    
    doc.setFontSize(12);
    doc.text(`Order ID: ${order.id}`, 20, 30);
    doc.text(`Recipient: ${order.userProfile.fullName}`, 20, 40);
    doc.text(`Sender: ${order.senderFullName || "N/A"}`, 20, 50);
    doc.text(`Status: ${statusConfig[order.status]?.label || order.status}`, 20, 60);
    doc.text(`Order Date: ${formatDate(order.orderDate)}`, 20, 70);
    doc.text(`Shipping Method: ${order.shippingMethod}`, 20, 80);
    doc.text(`Total: ${order.totalAmount.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}`, 20, 90);

    doc.setFontSize(14);
    doc.text("Items:", 20, 100);
    let yPos = 110;
    order.orderItems.forEach((item, index) => {
      doc.setFontSize(10);
      doc.text(
        `${index + 1}. ${item.productName} (x${item.quantity}) - ${item.price.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}`,
        20,
        yPos
      );
      yPos += 10;
      if (item.color?.name && item.color.name !== "None") {
        doc.text(`   Color: ${item.color.name}`, 20, yPos);
        yPos += 10;
      }
      if (item.size?.name && item.size.name !== "None") {
        doc.text(`   Size: ${item.size.name}`, 20, yPos);
        yPos += 10;
      }
    });

    doc.setFontSize(12);
    doc.text(`Note: ${order.note || "N/A"}`, 20, yPos);
    yPos += 10;
    doc.text(`Tracking Number: ${order.trackingNumber || "N/A"}`, 20, yPos);

    doc.save(`receipt_${order.id}_${format(new Date(), "yyyy-MM-dd")}.pdf`);
    setNotification({
      open: true,
      message: "Receipt generated successfully",
      severity: "success",
    });
  };

  const handleDeleteClick = (orderId: string) => {
    setOrderToDelete(orderId);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!orderToDelete) return;

    try {
      await deleteCancelledOrder(orderToDelete).unwrap();
      setNotification({
        open: true,
        message: "Order deleted successfully",
        severity: "success",
      });
      setDeleteDialogOpen(false);
      setOrderToDelete(null);
    } catch (err) {
      console.error("Failed to delete order:", err);
      setNotification({
        open: true,
        message: "Failed to delete order",
        severity: "error",
      });
    }
  };

  const handleDeleteDialogClose = () => {
    setDeleteDialogOpen(false);
    setOrderToDelete(null);
  };

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
    setIsNewReturn(false);
    dispatch(setReturnDialogOpen(true));
  };

  const handleRequestReturnClick = (id: string) => {
    dispatch(setSelectedOrderId(id));
    dispatch(setReturnReason(""));
    setIsNewReturn(true);
    dispatch(setReturnDialogOpen(true));
  };

  const handleViewOrder = (order: Order) => {
    setSelectedOrder(order);
  };

  const handleCloseDialog = () => {
    dispatch(setReturnDialogOpen(false));
    dispatch(setSelectedOrderId(null));
    dispatch(setReturnReason(""));
    setLocalReturnReason("");
    setIsNewReturn(true);
    setInputError(null);
    setSelectedOrder(null);
  };

  const handleRequestReturn = async () => {
    if (!selectedOrderId || !localReturnReason) {
      setNotification({
        open: true,
        message: "Please provide a return reason.",
        severity: "error",
      });
      return;
    }

    try {
      dispatch(setReturnReason(localReturnReason));
      const returnRequest: ReturnRequest = { reason: localReturnReason };
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

  const truncateText = (text: string | null | undefined, maxLength: number = 50) => {
    if (!text) return "N/A";
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
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
      ? getValidTransitions(order)
      : validTransitions || [];

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
            <Tab value="customer" label="Recipient" />
            <Tab value="shipping" label="Shipping" />
          </Tabs>
          {tab === "overview" && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 }}>
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
                      {order.note ? `Order Note: ${order.note}` : ""}
                      {order.note && order.returnReason ? <br /> : ""}
                      {order.returnReason ? `Return Reason: ${order.returnReason}` : ""}
                      {!order.note && !order.returnReason ? "No notes available" : ""}
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
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography variant="subtitle2" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {item.productName}
                        </Typography>
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
              <CardHeader title={<Typography variant="subtitle1">Recipient Information</Typography>} />
              <CardContent>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Avatar>{order.userProfile.fullName?.split(" ").map((n) => n[0]).join("") || "N/A"}</Avatar>
                    <Box>
                      <Typography variant="subtitle2">Recipient: {order.userProfile.fullName}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        Phone: {order.userProfile.phoneNumber}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Sender: {order.senderFullName || "N/A"}
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
                    <Typography variant="body2">Sender: {order.senderFullName || "N/A"}</Typography>
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
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, flexWrap: "wrap", gap: 2 }}>
          <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2, flex: 1 }}>
            <TextField
              label="Search Orders"
              value={search}
              onChange={handleSearchChange}
              variant="outlined"
              size="small"
              sx={{ width: { xs: "100%", md: "300px" } }}
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
                <MenuItem value="recipientFullName">Recipient</MenuItem>
                <MenuItem value="senderFullName">Sender</MenuItem>
                <MenuItem value="note">Note</MenuItem>
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
              onClick={handleExportXLS}
              startIcon={<DownloadIcon />}
              sx={{ borderRadius: "8px", textTransform: "none" }}
            >
              Export XLS
            </Button>
          </Box>
        </Box>
        <Divider sx={{ mb: 2 }} />
        <TableContainer component={Paper} elevation={0} sx={{ mb: 2, overflowX: "auto", maxWidth: "100%" }}>
          <Table sx={{ minWidth: 1000, tableLayout: "fixed" }}>
            <TableHead>
              <TableRow>
                <TableCell sx={{ width: "10%", minWidth: 120 }}>Sender</TableCell>
                <TableCell sx={{ width: "20%", minWidth: 200 }}>Status</TableCell>
                <TableCell sx={{ width: "40%", minWidth: 300 }}>Items</TableCell>
                <TableCell sx={{ width: "10%", minWidth: 120 }}>Shipping Method</TableCell>
                <TableCell sx={{ width: "10%", minWidth: 100 }}>Total</TableCell>
                <TableCell sx={{ width: "10%", minWidth: 140 }}>Date</TableCell>
                <TableCell sx={{ width: "5%", minWidth: 50 }}>Notes</TableCell>
                <TableCell sx={{ width: "15%", minWidth: 140 }} align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredOrders.map((order) => {
                const canRequestReturn = getValidTransitions(order).includes("ReturnRequested");
                const maxItemsToShow = 2;
                const visibleItems = order.orderItems.slice(0, maxItemsToShow);
                const hasMoreItems = order.orderItems.length > maxItemsToShow;
                return (
                  <TableRow key={order.id}>
                    <TableCell sx={{ maxWidth: 120, overflow: "hidden" }}>
                      <Tooltip title={order.senderFullName || "N/A"}>
                        <Typography
                          variant="body2"
                          sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        >
                          {truncateText(order.senderFullName, 20)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={order.status} orderId={order.id} />
                    </TableCell>
                    <TableCell sx={{ maxWidth: 300, overflow: "hidden" }}>
                      <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                        {visibleItems.map((item, index) => (
                          <Tooltip
                            key={index}
                            title={`${item.productName}\nColor: ${item.color?.name || "N/A"}\nSize: ${item.size?.name || "N/A"}\nQuantity: ${item.quantity}\nPrice: ${item.price.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}`}
                          >
                            <Box
                              sx={{
                                display: "flex",
                                alignItems: "center",
                                gap: 1,
                                backgroundColor: index % 2 === 0 ? "#f5f7fa" : "#e3f2fd",
                                borderRadius: 1,
                                px: 1,
                                py: 0.5,
                              }}
                            >
                              <Box
                                sx={{
                                  minWidth: 100,
                                  maxWidth: 150,
                                  overflow: "hidden",
                                  textOverflow: "ellipsis",
                                  whiteSpace: "nowrap",
                                  cursor: "pointer",
                                }}
                              >
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  + {truncateText(item.productName, 20)}
                                </Typography>
                              </Box>
                              {item.color?.name && item.color.name !== "None" && (
                                <Chip
                                  label={truncateText(item.color.name, 10)}
                                  size="small"
                                  sx={{
                                    backgroundColor: (theme) => theme.palette.augmentColor({ color: { main: item.color.hexCode } }).light,
                                    color: item.color.hexCode === "#000000" ? "#fff" : "#000",
                                  }}
                                />
                              )}
                              {item.size?.name && item.size.name !== "None" && (
                                <Chip label={truncateText(item.size.name, 10)} size="small" />
                              )}
                              <Chip
                                label={"x" + item.quantity}
                                size="small"
                                sx={{ backgroundColor: "#31ddc4ff", color: "#000" }}
                              />
                            </Box>
                          </Tooltip>
                        ))}
                        {hasMoreItems && (
                          <Tooltip
                            title={order.orderItems
                              .slice(maxItemsToShow)
                              .map(
                                (item) =>
                                  `${item.productName}\nColor: ${item.color?.name || "N/A"}\nSize: ${item.size?.name || "N/A"}\nQuantity: ${item.quantity}`
                              )
                              .join("\n\n")}
                          >
                            <Typography variant="caption" color="primary" sx={{ cursor: "pointer" }}>
                              + {order.orderItems.length - maxItemsToShow} more
                            </Typography>
                          </Tooltip>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 120, overflow: "hidden" }}>
                      <Tooltip title={order.shippingMethod}>
                        <Typography
                          variant="body2"
                          sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        >
                          {truncateText(order.shippingMethod, 20)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ fontWeight: "medium" }}>
                      {order.totalAmount.toLocaleString("vi-VN", { style: "currency", currency: "VND" })}
                    </TableCell>
                    <TableCell sx={{ maxWidth: 140, overflow: "hidden" }}>
                      <Tooltip title={formatDate(order.orderDate)}>
                        <Typography
                          variant="body2"
                          sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        >
                          {formatDate(order.orderDate)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 140, overflow: "hidden" }}>
                      <Tooltip title={order.note || "N/A"}>
                        <Typography
                          variant="body2"
                          color="text.secondary"
                          sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}
                        >
                          {truncateText(order.note, 20)}
                        </Typography>
                      </Tooltip>
                    </TableCell>
                    <TableCell align="center">
                      <Box sx={{ display: "flex", flexDirection: { xs: "column", sm: "row" }, justifyContent: "center", gap: 1 }}>
                        <Button variant="outlined" size="small" onClick={() => handleViewOrder(order)}>
                          <EyeIcon sx={{ fontSize: 16 }} />
                        </Button>
                        {canRequestReturn && (
                          <IconButton color="warning" onClick={() => handleRequestReturnClick(order.id)}>
                            <ReturnIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        )}
                        {(order.status === "ReturnRequested" || order.status === "Returned") && (
                          <IconButton color="warning" onClick={() => handleReturnClick(order.id, order.returnReason)}>
                            <ReturnIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        )}
                        {order.status === "Delivered" && (
                          <IconButton color="info" onClick={() => handleGenerateReceipt(order)}>
                            <ReceiptIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        )}
                        {isAdmin && order.status === "Cancelled" && (
                          <IconButton
                            color="error"
                            onClick={() => handleDeleteClick(order.id)}
                            disabled={isDeleting}
                          >
                            <Delete sx={{ fontSize: 16 }} />
                          </IconButton>
                        )}
                      </Box>
                    </TableCell>
                  </TableRow>
                );
              })}
              {(!filteredOrders || filteredOrders.length === 0) && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
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

      <OrdersView />

      <Dialog open={isReturnDialogOpen} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>{isNewReturn ? "Request Return" : "Manage Return"}</DialogTitle>
        <DialogContent>
          {inputError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {inputError}
            </Alert>
          )}
          {isNewReturn ? (
            <TextField
              inputRef={returnReasonInputRef}
              label="Return Reason"
              fullWidth
              multiline
              rows={3}
              value={localReturnReason}
              onChange={(e) => {
                setLocalReturnReason(e.target.value);
                setInputError(null);
              }}
              margin="normal"
              required
              error={!!inputError}
              helperText={inputError}
            />
          ) : (
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
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDialog}>Cancel</Button>
          {isNewReturn ? (
            <Button
              onClick={handleRequestReturn}
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={isRequestingReturn || !localReturnReason}
            >
              {isRequestingReturn ? <CircularProgress size={24} /> : "Request Return"}
            </Button>
          ) : (
            <Button
              onClick={handleUpdateReturnStatus}
              variant="contained"
              startIcon={<SaveIcon />}
              disabled={isUpdatingReturn || !newReturnStatus || (newReturnStatus === "Refunded" && !refundReason) || isLoadingTransitions}
            >
              {isUpdatingReturn ? <CircularProgress size={24} /> : "Update Return"}
            </Button>
          )}
        </DialogActions>
      </Dialog>

      <Dialog open={deleteDialogOpen} onClose={handleDeleteDialogClose} fullWidth maxWidth="sm">
        <DialogTitle>Confirm Delete Order</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete this canceled order? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose}>Cancel</Button>
          <Button
            onClick={handleDeleteConfirm}
            variant="contained"
            color="error"
            startIcon={isDeleting ? <CircularProgress size={24} /> : <Delete />}
            disabled={isDeleting}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {selectedOrder && <OrderDetailsDialog order={selectedOrder} />}
    </Box>
  );
}