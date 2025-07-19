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
  InputAdornment,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  CircularProgress,
  Alert,
  Snackbar,
  CardContent,
  Card,
  Divider,
  Tooltip,
  Checkbox,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  SelectChangeEvent,
} from "@mui/material";
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  ContentCopy as ContentCopyIcon,
  AddCircle as AddCircleIcon,
  Block as BlockIcon,
  CheckCircle as CheckCircleIcon,
} from "@mui/icons-material";
import { setParams, setPageNumber, setSelectedUserIds } from "./userSlice";
import { useAppDispatch, useAppSelector } from "../../app/store/store";
import { useFetchUsersQuery, useToggleUserDeactivationMutation } from "../../app/api/userApi";
import { format } from "date-fns";
import { debounce } from "lodash";
import { UserProfile } from "../../app/models/responses/userProfile";
import { PaginationParams } from "../../app/models/params/pagination";
import { User } from "../../app/models/responses/user";

export default function UserList() {
  const dispatch = useAppDispatch();
  const { params, selectedUserIds } = useAppSelector((state) => state.user);
  const { data, isLoading, error, refetch, isFetching } = useFetchUsersQuery(params);
  const [toggleUserDeactivation, { isLoading: isToggling }] = useToggleUserDeactivationMutation();
  const [search, setSearch] = useState(params.searchTerm || "");
  const [selectedProfile, setSelectedProfile] = useState<UserProfile | null>(null);
  const [isProfileDialogOpen, setIsProfileDialogOpen] = useState(false);
  const [sortOption, setSortOption] = useState<string>(params.orderBy || "createddateasc");

  // Notification state
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  });

  // Sorting options
  const sortOptions = [
    { value: "usernameasc", label: "Username (A-Z)" },
    { value: "usernamedesc", label: "Username (Z-A)" },
    { value: "emailasc", label: "Email (A-Z)" },
    { value: "emaildesc", label: "Email (Z-A)" },
    { value: "createddateasc", label: "Created Date (Oldest First)" },
    { value: "createddatedesc", label: "Created Date (Newest First)" },
    { value: "updateddateasc", label: "Updated Date (Oldest First)" },
    { value: "updateddatedesc", label: "Updated Date (Newest First)" },
    { value: "emailconfirmedasc", label: "Email Confirmed (False to True)" },
    { value: "emailconfirmeddesc", label: "Email Confirmed (True to False)" },
    { value: "isdeactivatedasc", label: "Status (Active to Deactivated)" },
    { value: "isdeactivateddesc", label: "Status (Deactivated to Active)" },
    { value: "rolesasc", label: "Roles (A-Z)" },
    { value: "rolesdesc", label: "Roles (Z-A)" },
  ];

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      dispatch(setParams({ searchTerm: value.trim() || undefined }));
      dispatch(setPageNumber(1));
    }, 500),
    [dispatch]
  );

  // Sync search input and sort option with params
  useEffect(() => {
    setSearch(params.searchTerm || "");
    setSortOption(params.orderBy || "createddateasc");
  }, [params.searchTerm, params.orderBy]);

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

  const handleSortChange = (e: SelectChangeEvent<string>) => {
    const value = e.target.value as string;
    setSortOption(value);
    dispatch(setParams({ orderBy: value }));
    dispatch(setPageNumber(1));
  };

  // Profile click handler
  const handleProfileClick = (profile: UserProfile) => {
    setSelectedProfile(profile);
    setIsProfileDialogOpen(true);
  };

  const handleCloseProfileDialog = () => {
    setIsProfileDialogOpen(false);
    setSelectedProfile(null);
  };

  // Copy ID handler
  const handleCopyId = (id: string) => {
    navigator.clipboard
      .writeText(id)
      .then(() => {
        setNotification({
          open: true,
          message: "User ID copied to clipboard",
          severity: "info",
        });
      })
      .catch((err) => {
        console.error("Failed to copy ID:", err);
        setNotification({
          open: true,
          message: "Failed to copy ID",
          severity: "error",
        });
      });
  };

  // Checkbox handlers
  const handleCheckboxChange = (id: string) => {
    dispatch(
      setSelectedUserIds(
        selectedUserIds.includes(id)
          ? selectedUserIds.filter((cid) => cid !== id)
          : [...selectedUserIds, id]
      )
    );
  };

  const handleSelectAllChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      const allUserIds = data?.items.map((user) => user.id) || [];
      dispatch(setSelectedUserIds(allUserIds));
    } else {
      dispatch(setSelectedUserIds([]));
    }
  };

  // Toggle deactivation handler
  const handleToggleDeactivation = async (user: User) => {
    try {
      await toggleUserDeactivation({ userId: user.id, isDeactivated: !user.isDeactivated }).unwrap();
      setNotification({
        open: true,
        message: `User ${user.isDeactivated ? "activated" : "deactivated"} successfully`,
        severity: "success",
      });
    } catch (err) {
      console.error("Failed to toggle deactivation:", err);
      setNotification({
        open: true,
        message: "Failed to toggle user deactivation",
        severity: "error",
      });
    }
  };

  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    try {
      return format(new Date(dateString), "MMM dd, yyyy HH:mm");
    } catch {
      return "N/A";
    }
  };

  const calculateStartIndex = (pagination: PaginationParams | null) => {
    if (!pagination) return 1;
    return (pagination.currentPage - 1) * pagination.pageSize + 1;
  };

  const calculateEndIndex = (pagination: PaginationParams | null) => {
    if (!pagination) return 0;
    const endIndex = pagination.currentPage * pagination.pageSize;
    return endIndex > pagination.totalCount ? pagination.totalCount : endIndex;
  };

  // Format user profiles for display
  const formatUserProfiles = (profiles: UserProfile[]) => {
    if (!profiles || profiles.length === 0) return "None";
    return profiles.map((profile, index) => (
      <Typography
        key={profile.id}
        component="span"
        sx={{
          color: "primary.main",
          cursor: "pointer",
          "&:hover": { textDecoration: "underline" },
          mr: profiles.length > 1 ? 0.5 : 0,
        }}
        onClick={() => handleProfileClick(profile)}
      >
        {`Profile ${index + 1}${index < profiles.length - 1 ? "," : ""}`}
      </Typography>
    ));
  };

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading users...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Card sx={{ p: 3, m: 2, bgcolor: "#fff4f4" }}>
        <CardContent>
          <Typography variant="h6" color="error">
            Error loading users
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
        User Management
      </Typography>

      {/* Main Content */}
      <Paper elevation={2} sx={{ p: 3, mb: 4 }}>
        {/* Search, Sort, and Add Button */}
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3, gap: 2 }}>
          <TextField
            label="Search Users"
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
            {selectedUserIds.length > 0 && (
              <Button
                variant="contained"
                color="error"
                disabled={true}
                startIcon={<ClearIcon />}
                sx={{ borderRadius: "8px", textTransform: "none" }}
              >
                Delete Selected ({selectedUserIds.length})
              </Button>
            )}
            <Button
              variant="contained"
              color="primary"
              disabled={true}
              startIcon={<AddCircleIcon />}
              sx={{ borderRadius: "8px", textTransform: "none" }}
            >
              Add New User
            </Button>
          </Box>
        </Box>

        <Divider sx={{ mb: 2 }} />

        {/* Users Table */}
        <TableContainer component={Paper} elevation={0} sx={{ mb: 2 }}>
          <Table sx={{ minWidth: 650 }}>
            <TableHead>
              <TableRow>
                <TableCell padding="checkbox">
                  <Checkbox
                    checked={
                      (data?.items?.length ?? 0) > 0 &&
                      selectedUserIds.length === data?.items.length
                    }
                    indeterminate={
                      selectedUserIds.length > 0 &&
                      selectedUserIds.length < (data?.items.length ?? 0)
                    }
                    onChange={handleSelectAllChange}
                  />
                </TableCell>
                <TableCell>Username</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Email Confirmed</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Roles</TableCell>
                <TableCell>User Profiles</TableCell>
                <TableCell>Created Date</TableCell>
                <TableCell>Updated Date</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data?.items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={selectedUserIds.includes(user.id)}
                      onChange={() => handleCheckboxChange(user.id)}
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{user.userName || "N/A"}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{user.email || "N/A"}</Typography>
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.emailConfirmed ? "Verified" : "Unverified"}
                      size="small"
                      color={user.emailConfirmed ? "success" : "error"}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.isDeactivated ? "Deactivated" : "Active"}
                      size="small"
                      color={user.isDeactivated ? "error" : "success"}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Chip
                      label={user.roles.join(", ") || "N/A"}
                      size="small"
                      color={user.roles.includes("Admin") ? "primary" : "default"}
                      variant="outlined"
                    />
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">
                      {formatUserProfiles(user.userProfiles)}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{formatDate(user.createdDate)}</Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{formatDate(user.updatedDate)}</Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: "flex", justifyContent: "center", gap: 1 }}>
                      <Tooltip title="Copy ID">
                        <IconButton
                          size="small"
                          color="inherit"
                          onClick={() => handleCopyId(user.id)}
                        >
                          <ContentCopyIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={user.isDeactivated ? "Activate" : "Deactivate"}>
                        <IconButton
                          size="small"
                          color={user.isDeactivated ? "success" : "error"}
                          onClick={() => handleToggleDeactivation(user)}
                          disabled={isToggling}
                        >
                          {user.isDeactivated ? (
                            <CheckCircleIcon fontSize="small" />
                          ) : (
                            <BlockIcon fontSize="small" />
                          )}
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
              {(!data?.items || data.items.length === 0) && (
                <TableRow>
                  <TableCell colSpan={9} align="center" sx={{ py: 3 }}>
                    <Typography variant="body1" color="textSecondary">
                      {search ? `No users found for "${search}"` : "No users found"}
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
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                mt: 3,
              }}
            >
              <Typography variant="body2" color="textSecondary">
                Showing {calculateStartIndex(data.pagination)} - {calculateEndIndex(data.pagination)} of{" "}
                {data.pagination.totalCount} users
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

        {/* User Profile Details Dialog */}
        <Dialog open={isProfileDialogOpen} onClose={handleCloseProfileDialog} fullWidth maxWidth="sm">
          <DialogTitle>User Profile Details</DialogTitle>
          <DialogContent dividers>
            {selectedProfile && (
              <Grid container spacing={2}>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Profile ID"
                    fullWidth
                    value={selectedProfile.id || "N/A"}
                    InputProps={{ readOnly: true }}
                    margin="normal"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Full Name"
                    fullWidth
                    value={selectedProfile.fullName || "N/A"}
                    InputProps={{ readOnly: true }}
                    margin="normal"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Phone Number"
                    fullWidth
                    value={selectedProfile.phoneNumber || "N/A"}
                    InputProps={{ readOnly: true }}
                    margin="normal"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Address"
                    fullWidth
                    value={
                      selectedProfile.specificAddress
                        ? `${selectedProfile.specificAddress}, ${selectedProfile.ward || ""}, ${selectedProfile.district || ""}, ${selectedProfile.province || ""}`
                        : "N/A"
                    }
                    InputProps={{ readOnly: true }}
                    margin="normal"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Is Default"
                    fullWidth
                    value={selectedProfile.isDefault ? "Yes" : "No"}
                    InputProps={{ readOnly: true }}
                    margin="normal"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Created Date"
                    fullWidth
                    value={formatDate(selectedProfile.createdDate)}
                    InputProps={{ readOnly: true }}
                    margin="normal"
                  />
                </Grid>
                <Grid size={{ xs: 12 }}>
                  <TextField
                    label="Updated Date"
                    fullWidth
                    value={formatDate(selectedProfile.updatedDate)}
                    InputProps={{ readOnly: true }}
                    margin="normal"
                  />
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCloseProfileDialog}>Close</Button>
          </DialogActions>
        </Dialog>
      </Box>
    );
}