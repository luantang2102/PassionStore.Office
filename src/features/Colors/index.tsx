/* eslint-disable react-hooks/exhaustive-deps */
import { useState, useEffect, useCallback } from "react";
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
  Tooltip,
  Card,
  CardContent,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Switch,
  FormControlLabel,
  Grid,
  CircularProgress,
  Alert,
  Snackbar,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import {
  Search as SearchIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  AddCircle as AddCircleIcon,
  Refresh as RefreshIcon,
  Close as CloseIcon,
  Save as SaveIcon,
  ContentCopy as ContentCopyIcon,
  Clear as ClearIcon,
} from "@mui/icons-material";
import {
  setParams,
  setPageNumber,
  setCreateFormOpen,
  setSelectedColorId,
  setDeleteDialogOpen,
} from "./colorSlice";
import { useAppDispatch, useAppSelector } from "../../app/store/store";
import {
  useFetchColorsQuery,
  useFetchColorByIdQuery,
  useCreateColorMutation,
  useUpdateColorMutation,
  useDeleteColorMutation,
} from "../../app/api/colorApi";
import { format } from "date-fns";
import { Color } from "../../app/models/responses/color";
import { PaginationParams } from "../../app/models/params/pagination";
import { debounce } from "lodash";

export default function ColorList() {
  const dispatch = useAppDispatch();
  const { params, selectedColorId, isCreateFormOpen, isDeleteDialogOpen } = useAppSelector(
    (state) => state.color
  );
  const { data, isLoading, error, refetch, isFetching } = useFetchColorsQuery(params);
  const [search, setSearch] = useState(params.searchTerm || "");
  const [selectedColorIds, setSelectedColorIds] = useState<string[]>([]);

  const { data: selectedColor, isLoading: isLoadingColor } = useFetchColorByIdQuery(
    selectedColorId || "",
    {
      skip: !selectedColorId || isDeleteDialogOpen,
    }
  );

  const [createColor, { isLoading: isCreating }] = useCreateColorMutation();
  const [updateColor, { isLoading: isUpdating }] = useUpdateColorMutation();
  const [deleteColor, { isLoading: isDeleting }] = useDeleteColorMutation();

  // Form state
  const [formData, setFormData] = useState<Partial<Color>>({
    name: "",
    hexCode: "",
    isActive: true,
  });

  // Validation state
  const [errors, setErrors] = useState<{
    name?: string;
    hexCode?: string;
  }>({});

  // Notification state
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  });

  // Sorting state
  const [sortOption, setSortOption] = useState<string>(params.orderBy || "createddateasc");

  // Sorting options
  const sortOptions = [
    { value: "nameasc", label: "Name (A-Z)" },
    { value: "namedesc", label: "Name (Z-A)" },
    { value: "hexcodeasc", label: "Hex Code (A-Z)" },
    { value: "hexcodedesc", label: "Hex Code (Z-A)" },
    { value: "isactiveasc", label: "Status (Inactive to Active)" },
    { value: "isactivedesc", label: "Status (Active to Inactive)" },
    { value: "createddateasc", label: "Created Date (Oldest First)" },
    { value: "createddatedesc", label: "Created Date (Newest First)" },
    { value: "updateddateasc", label: "Updated Date (Oldest First)" },
    { value: "updateddatedesc", label: "Updated Date (Newest First)" },
  ];

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      dispatch(setParams({ searchTerm: value.trim() || undefined }));
      dispatch(setPageNumber(1));
    }, 500),
    [dispatch]
  );

  // Reset form and errors when dialog opens/closes or selected color changes
  useEffect(() => {
    if (isCreateFormOpen && selectedColorId && selectedColor) {
      setFormData({
        name: selectedColor.name,
        hexCode: selectedColor.hexCode,
        isActive: selectedColor.isActive,
      });
      setErrors({});
    } else if (isCreateFormOpen && !selectedColorId) {
      setFormData({
        name: "",
        hexCode: "",
        isActive: true,
      });
      setErrors({});
    }
  }, [isCreateFormOpen, selectedColorId, selectedColor]);

  // Sync search input and sort option with params
  useEffect(() => {
    setSearch(params.searchTerm || "");
    setSortOption(params.orderBy || "createddateasc");
  }, [params.searchTerm, params.orderBy]);

  // Form validation
  const validateForm = () => {
    const newErrors: typeof errors = {};

    // Name validation
    if (!formData.name?.trim()) {
      newErrors.name = "Color name is required.";
    }

    // HexCode validation
    if (!formData.hexCode?.trim()) {
      newErrors.hexCode = "Hex code is required.";
    } else if (!/^#[0-9A-Fa-f]{6}$/.test(formData.hexCode)) {
      newErrors.hexCode = "Hex code must be a valid 6-digit hexadecimal color (e.g., #FF0000).";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Form handlers
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: name === "hexCode" ? value.toUpperCase() : value,
    }));
    setErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSwitchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: checked,
    }));
  };

  const handleSortChange = (e: SelectChangeEvent<string>) => {
    const value = e.target.value as string;
    setSortOption(value);
    dispatch(setParams({ orderBy: value }));
    dispatch(setPageNumber(1));
  };

  // Copy ID handler
  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id).then(() => {
      setNotification({
        open: true,
        message: "Color ID copied to clipboard",
        severity: "info",
      });
    }).catch((err) => {
      console.error("Failed to copy ID:", err);
      setNotification({
        open: true,
        message: "Failed to copy ID",
        severity: "error",
      });
    });
  };

  // Form submission
  const handleSaveColor = async () => {
    if (!validateForm()) {
      setNotification({
        open: true,
        message: "Please fix the errors in the form before saving.",
        severity: "error",
      });
      return;
    }

    try {
      const colorFormData = new FormData();
      if (formData.name) colorFormData.append("name", formData.name);
      if (formData.hexCode) colorFormData.append("hexCode", formData.hexCode);
      colorFormData.append("isActive", (formData.isActive ?? true).toString());

      if (selectedColorId) {
        await updateColor({ id: selectedColorId, data: colorFormData }).unwrap();
        setNotification({
          open: true,
          message: "Color updated successfully",
          severity: "success",
        });
      } else {
        await createColor(colorFormData).unwrap();
        setNotification({
          open: true,
          message: "Color created successfully",
          severity: "success",
        });
      }

      handleCloseForm();
    } catch (err) {
      console.error("Failed to save color:", err);
      setNotification({
        open: true,
        message: "Failed to save color",
        severity: "error",
      });
    }
  };

  // Delete handlers
  const handleConfirmDelete = async () => {
    if (selectedColorId) {
      try {
        await deleteColor(selectedColorId).unwrap();
        dispatch(setSelectedColorId(null));
        setSelectedColorIds((prev) => prev.filter((id) => id !== selectedColorId));
        setNotification({
          open: true,
          message: "Color deleted successfully",
          severity: "success",
        });
        handleCloseDeleteDialog();
      } catch (err) {
        console.error("Failed to delete color:", err);
        setNotification({
          open: true,
          message: "Failed to delete color",
          severity: "error",
        });
      }
    }
  };

  const handleDeleteAllSelected = async () => {
    try {
      for (const id of selectedColorIds) {
        await deleteColor(id).unwrap();
      }
      setSelectedColorIds([]);
      setNotification({
        open: true,
        message: `${selectedColorIds.length} color(s) deleted successfully`,
        severity: "success",
      });
    } catch (err) {
      console.error("Failed to delete colors:", err);
      setNotification({
        open: true,
        message: "Failed to delete some colors",
        severity: "error",
      });
    }
  };

  const handleCheckboxChange = (id: string) => {
    setSelectedColorIds((prev) =>
      prev.includes(id) ? prev.filter((cid) => cid !== id) : [...prev, id]
    );
  };

  const handleSelectAllChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const allColorIds = data?.items.map((color) => color.id) || [];
      setSelectedColorIds(allColorIds);
    } else {
      setSelectedColorIds([]);
    }
  };

  // Search and pagination
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

  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    dispatch(setPageNumber(page));
  };

  // Dialog controls
  const handleCreateClick = () => {
    dispatch(setCreateFormOpen(true));
    dispatch(setSelectedColorId(null));
  };

  const handleEditClick = (id: string) => {
    dispatch(setSelectedColorId(id));
    dispatch(setCreateFormOpen(true));
  };

  const handleDeleteClick = (id: string) => {
    dispatch(setSelectedColorId(id));
    dispatch(setDeleteDialogOpen(true));
  };

  const handleCloseForm = () => {
    dispatch(setCreateFormOpen(false));
    dispatch(setSelectedColorId(null));
    setFormData({
      name: "",
      hexCode: "",
      isActive: true,
    });
    setErrors({});
  };

  const handleCloseDeleteDialog = () => {
    dispatch(setDeleteDialogOpen(false));
    dispatch(setSelectedColorId(null));
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const formatDate = (dateString: string | null) => {
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

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading colors...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Card sx={{ p: 3, m: 2, bgcolor: "#fff4f4" }}>
        <CardContent>
          <Typography variant="h6" color="error">
            Error loading colors
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            Please try again later or contact support.
          </Typography>
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            color="primary"
            sx={{ mt: 2 }}
            onClick={() => refetch()}
          >
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
        <Alert
          onClose={handleCloseNotification}
          severity={notification.severity}
          sx={{ width: "100%" }}
        >
          {notification.message}
        </Alert>
      </Snackbar>

      {/* Page Header */}
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 500 }}>
        Color Management
      </Typography>

      {/* Main Content */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        {/* Search, Sort, and Add Button */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2 }}>
          <TextField
            label="Search Colors"
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
          <FormControl sx={{ width: "200px" }} size="small">
            <InputLabel>Sort By</InputLabel>
            <Select
              value={sortOption}
              onChange={handleSortChange}
              label="Sort By"
            >
              {sortOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Box sx={{ display: "flex", gap: 1 }}>
            {selectedColorIds.length > 0 && (
              <Button
                variant="contained"
                color="error"
                onClick={handleDeleteAllSelected}
                startIcon={<DeleteIcon />}
                sx={{ borderRadius: "8px", textTransform: "none" }}
                disabled={isDeleting}
              >
                Delete Selected ({selectedColorIds.length})
              </Button>
            )}
            <Button
              variant="contained"
              color="primary"
              onClick={handleCreateClick}
              startIcon={<AddCircleIcon />}
              sx={{ borderRadius: "8px", textTransform: "none" }}
            >
              Add New Color
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Colors Table */}
        <TableContainer component={Paper} elevation={0} sx={{ mb: 2 }}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={
                      (data?.items?.length ?? 0) > 0 &&
                      selectedColorIds.length === data?.items.length
                    }
                    indeterminate={
                      selectedColorIds.length > 0 &&
                      selectedColorIds.length < (data?.items.length ?? 0)
                    }
                    onChange={handleSelectAllChange}
                  />
                </TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Hex Code</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Created Date</TableCell>
                <TableCell>Updated Date</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.items.map((color) => (
                <TableRow key={color.id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedColorIds.includes(color.id)}
                      onChange={() => handleCheckboxChange(color.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography
                      variant="body1"
                      sx={{
                        maxWidth: "150px",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {color.name}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                      <Box
                        sx={{
                          width: 20,
                          height: 20,
                          backgroundColor: color.hexCode,
                          border: "1px solid #ccc",
                          borderRadius: "4px",
                        }}
                      />
                      <Typography variant="body2">{color.hexCode}</Typography>
                    </Box>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={color.isActive ? "Active" : "Inactive"}
                      size="small"
                      color={color.isActive ? "success" : "error"}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{formatDate(color.createdDate)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{formatDate(color.updatedDate ?? null)}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
                      <Tooltip title="Copy ID">
                        <IconButton
                          size="small"
                          color="inherit"
                          onClick={() => handleCopyId(color.id)}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Edit">
                        <IconButton
                          size="small"
                          color="primary"
                          onClick={() => handleEditClick(color.id)}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteClick(color.id)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}

              {(!data?.items || data.items.length === 0) && (
                <TableRow>
                  <TableCell colSpan={7} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1" color="textSecondary">
                      {search ? `No colors found for "${search}"` : "No colors found"}
                    </Typography>
                    {search && (
                      <Button
                        startIcon={<ClearIcon />}
                        onClick={handleClearSearch}
                        sx={{ mt: 2 }}
                      >
                        Clear Search
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        {data?.pagination && data.items.length > 0 && (
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 3 }}>
            <Typography variant="body2" color="textSecondary">
              Showing {calculateStartIndex(data.pagination)} - {calculateEndIndex(data.pagination)} of{" "}
              {data.pagination.totalCount} colors
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

      {/* Create/Edit Form Dialog */}
      <Dialog open={isCreateFormOpen} onClose={handleCloseForm} fullWidth maxWidth="md">
        <DialogTitle>
          {selectedColorId ? "Edit Color" : "Create New Color"}
          <IconButton
            aria-label="close"
            onClick={handleCloseForm}
            sx={{ position: "absolute", right: 8, top: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers>
          {isLoadingColor ? (
            <Box sx={{ display: "flex", justifyContent: "center", p: 3 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Grid container spacing={3}>
              {selectedColorId && (
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Color ID"
                    fullWidth
                    value={selectedColorId}
                    margin="normal"
                    InputProps={{
                      readOnly: true,
                    }}
                  />
                </Grid>
              )}
              <Grid size={{ xs: 12, sm: 6 }}>
                <TextField
                  name="name"
                  label="Color Name"
                  fullWidth
                  required
                  value={formData.name || ""}
                  onChange={handleInputChange}
                  margin="normal"
                  error={!!errors.name}
                  helperText={errors.name}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mt: 2 }}>
                  <TextField
                    name="hexCode"
                    label="Hex Code"
                    required
                    value={formData.hexCode || ""}
                    onChange={handleInputChange}
                    error={!!errors.hexCode}
                    helperText={errors.hexCode}
                    sx={{ flex: 1 }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Box
                            sx={{
                              width: 20,
                              height: 20,
                              backgroundColor: formData.hexCode || "#000000",
                              border: "1px solid #ccc",
                              borderRadius: "4px",
                            }}
                          />
                        </InputAdornment>
                      ),
                    }}
                  />
                  <TextField
                    type="color"
                    name="hexCode"
                    value={formData.hexCode || "#000000"}
                    onChange={handleInputChange}
                    sx={{
                      width: 60,
                      height: 40,
                      padding: 0,
                      "& input": {
                        width: "100%",
                        height: "100%",
                        padding: 0,
                        border: "none",
                        cursor: "pointer",
                      },
                    }}
                    inputProps={{
                      style: { padding: 0 },
                    }}
                  />
                </Box>
              </Grid>
              <Grid size={{ xs: 12, sm: 6 }}>
                <FormControlLabel
                  control={
                    <Switch
                      name="isActive"
                      checked={formData.isActive || false}
                      onChange={handleSwitchChange}
                      color="primary"
                    />
                  }
                  label="Active"
                />
              </Grid>
            </Grid>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseForm}>Cancel</Button>
          <Button
            onClick={handleSaveColor}
            variant="contained"
            startIcon={<SaveIcon />}
            disabled={isCreating || isUpdating}
          >
            {(isCreating || isUpdating) ? (
              <CircularProgress size={24} color="inherit" />
            ) : selectedColorId ? (
              "Update"
            ) : (
              "Create"
            )}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onClose={handleCloseDeleteDialog}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete this color? This action cannot be undone.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog}>Cancel</Button>
          <Button
            onClick={handleConfirmDelete}
            color="error"
            variant="contained"
            disabled={isDeleting}
          >
            {isDeleting ? <CircularProgress size={24} color="inherit" /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}