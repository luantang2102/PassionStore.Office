import { useState, useEffect, useRef, useCallback } from "react";
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
  Card,
  CardContent,
  Divider,
  CircularProgress,
  Alert,
  Snackbar,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import {
  Search as SearchIcon,
  Refresh as RefreshIcon,
  Clear as ClearIcon,
  Send as SendIcon,
  Delete as DeleteIcon,
} from "@mui/icons-material";
import * as signalR from "@microsoft/signalr";
import { debounce } from "lodash";
import { useAppSelector } from "../../app/store/store";
import {
  useFetchChatsQuery,
  useFetchMessagesQuery,
  useSendMessageMutation,
  useDeleteChatMutation,
} from "../../app/api/chatApi";
import { ChatResponse, MessageParams, MessageResponse } from "../../app/models/responses/chat";
import { format } from "date-fns";
import { PaginationParams } from "../../app/models/params/pagination";

export default function ChatList() {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const { darkMode } = useAppSelector((state) => state.ui);
  const [selectedChat, setSelectedChat] = useState<ChatResponse | null>(null);
  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<MessageResponse[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [deleteChatId, setDeleteChatId] = useState<string | null>(null); // For confirmation dialog
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const { data: chatsData, isLoading, error, refetch, isFetching } = useFetchChatsQuery(
    { currentPage, pageSize: 100, totalPages: 0, totalCount: 0 },
    { skip: !isAuthenticated }
  );

  const { data: messagesData } = useFetchMessagesQuery(
    {
      chatId: selectedChat?.id || "",
      params: { pageNumber: 1, pageSize: 20, orderBy: "createdDate_asc" } as MessageParams,
    },
    { skip: !selectedChat || !isAuthenticated }
  );

  const [sendMessage, { isLoading: isSending }] = useSendMessageMutation();
  const [deleteChat, { isLoading: isDeleting }] = useDeleteChatMutation();

  // Notification state for errors and feedback
  const [notification, setNotification] = useState({
    open: false,
    message: "",
    severity: "success" as "success" | "error" | "info" | "warning",
  });

  // Debounced search handler
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setSearchTerm(value.trim() || "");
      setCurrentPage(1);
    }, 500),
    []
  );

  // Initialize SignalR connection
  useEffect(() => {
    if (!isAuthenticated || !chatsData?.items) return;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl("https://passionstore-hwajfcfqb8gbbng8.southeastasia-01.azurewebsites.net/chatHub", { withCredentials: true })
      .withAutomaticReconnect()
      .build();

    connectionRef.current = connection;

    connection.on("ReceiveMessage", (chatId: string, userId: string, content: string) => {
      console.log(`Received message for chat: ${chatId}`);
      if (chatId === selectedChat?.id) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            chatId,
            content,
            isUserMessage: userId !== user?.id,
            createdDate: new Date().toISOString(),
          },
        ]);
      }
      refetch();
    });

    connection.on("ReceiveNewChat", (chatId: string, topic: string) => {
      console.log(`Received new chat: ${chatId}, topic: ${topic}`);
      setSearchTerm("");
      refetch();
      connection.invoke("AddToGroup", chatId).catch(() => {
        // setNotification({
        //   open: true,
        //   message: "Failed to join chat group",
        //   severity: "error",
        // });
      });
    });

    connection.on("ReceiveChatDeleted", (chatId: string) => {
      console.log(`Chat deleted: ${chatId}`);
      if (selectedChat?.id === chatId) {
        setSelectedChat(null);
        setMessages([]);
      }
      refetch();
    });

    const joinChatGroups = async () => {
      await connection.start().catch(() => {
        // console.error("SignalR Connection Error:", err);
        // setNotification({
        //   open: true,
        //   message: "Failed to connect to chat server",
        //   severity: "error",
        // });
      });
      await connection.invoke("AddToGroup", "Admins").catch(() => {
        // console.error("Failed to join Admins group:", err);
        // setNotification({
        //   open: true,
        //   message: "Failed to join Admins group",
        //   severity: "error",
        // });
      });
      chatsData.items.forEach((chat) => {
        connection.invoke("AddToGroup", chat.id).catch(() => {
        //   console.error("Failed to join chat group:", err);
        //   setNotification({
        //     open: true,
        //     message: `Failed to join chat group: ${chat.id}`,
        //     severity: "error",
        //   });
        });
      });
    };

    joinChatGroups();

    return () => {
      connection.stop();
    };
  }, [isAuthenticated, user?.id, selectedChat?.id, refetch, chatsData?.items]);

  // Update messages when API data changes
  useEffect(() => {
    if (messagesData?.items) {
      setMessages(messagesData.items);
    }
  }, [messagesData]);

  // Scroll to the latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle sending a message
  const handleSendMessage = async () => {
    if (!message.trim() || !selectedChat) return;
    try {
      await sendMessage({ chatId: selectedChat.id, messageRequest: { content: message } }).unwrap();
      setMessage("");
    } catch (err) {
      console.error("Failed to send message:", err);
      setNotification({
        open: true,
        message: "Failed to send message",
        severity: "error",
      });
    }
  };

  // Handle delete chat
  const handleDeleteChat = async () => {
    if (!deleteChatId) return;
    try {
      await deleteChat(deleteChatId).unwrap();
      setNotification({
        open: true,
        message: "Chat deleted successfully",
        severity: "success",
      });
      if (selectedChat?.id === deleteChatId) {
        setSelectedChat(null);
        setMessages([]);
      }
      setDeleteChatId(null);
    } catch (err) {
      console.error("Failed to delete chat:", err);
      setNotification({
        open: true,
        message: "Failed to delete chat",
        severity: "error",
      });
    }
  };

  // Search handler
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSearchTerm(value);
    debouncedSearch(value);
  };

  const handleClearSearch = () => {
    setSearchTerm("");
    setCurrentPage(1);
  };

  // Pagination handler
  const handlePageChange = (_: React.ChangeEvent<unknown>, page: number) => {
    setCurrentPage(page);
  };

  // Chat selection handler
  const handleChatSelect = (chat: ChatResponse) => {
    setSelectedChat(chat);
    setMessages([]);
    connectionRef.current?.invoke("AddToGroup", chat.id).catch(() => {
    //   console.error("Failed to join chat group:", err);
    //   setNotification({
    //     open: true,
    //     message: "Failed to join chat group",
    //     severity: "error",
    //   });
    });
  };

  // Notification close handler
  const handleCloseNotification = () => {
    setNotification({ ...notification, open: false });
  };

  // Handle open/close delete confirmation dialog
  const handleOpenDeleteDialog = (chatId: string) => {
    setDeleteChatId(chatId);
  };

  const handleCloseDeleteDialog = () => {
    setDeleteChatId(null);
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "MMM dd, yyyy HH:mm");
  };

  const calculateStartIndex = (pagination: PaginationParams) => {
    return (pagination.currentPage - 1) * pagination.pageSize + 1;
  };

  const calculateEndIndex = (pagination: PaginationParams) => {
    const endIndex = pagination.currentPage * pagination.pageSize;
    return endIndex > pagination.totalCount ? pagination.totalCount : endIndex;
  };

  if (!isAuthenticated) {
    return null; // Handled by App component redirect
  }

  if (isLoading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", p: 5 }}>
        <CircularProgress />
        <Typography variant="h6" sx={{ ml: 2 }}>
          Loading chats...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Card sx={{ p: 3, m: 2, bgcolor: "#fff4f4" }}>
        <CardContent>
          <Typography variant="h6" color="error">
            Error loading chats
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

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={!!deleteChatId}
        onClose={handleCloseDeleteDialog}
        aria-labelledby="delete-chat-dialog-title"
      >
        <DialogTitle id="delete-chat-dialog-title">Delete Chat</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this chat? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleCloseDeleteDialog} color="primary">
            Cancel
          </Button>
          <Button onClick={handleDeleteChat} color="error" disabled={isDeleting}>
            {isDeleting ? <CircularProgress size={24} /> : "Delete"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Page Header */}
      <Typography variant="h5" sx={{ mb: 3, fontWeight: 500 }}>
        Chat Management
      </Typography>

      {/* Main Content */}
      <Box sx={{ display: "flex", gap: 3, height: "calc(100vh - 150px)" }}>
        {/* Chat List */}
        <Paper elevation={2} sx={{ p: 3, flex: 1, minWidth: 0 }}>
          {isFetching && (
            <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
              <CircularProgress size={24} />
              <Typography variant="body2" sx={{ ml: 1 }}>
                Refreshing chats...
              </Typography>
            </Box>
          )}
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
            <TextField
              label="Search Chats"
              value={searchTerm}
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
                endAdornment: searchTerm && (
                  <InputAdornment position="end">
                    <IconButton size="small" onClick={handleClearSearch}>
                      <ClearIcon />
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              disabled={isFetching}
            />
            <Button
              variant="contained"
              color="primary"
              onClick={() => {
                setSearchTerm("");
                refetch();
              }}
              startIcon={<RefreshIcon />}
              sx={{ borderRadius: "8px", textTransform: "none" }}
              disabled={isFetching}
            >
              Refresh
            </Button>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <TableContainer component={Paper} elevation={0} sx={{ mb: 2, maxHeight: "60vh", overflowY: "auto" }}>
            <Table sx={{ minWidth: 400 }} stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Topic</TableCell>
                  <TableCell>Username</TableCell>
                  <TableCell>Created Date</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {chatsData?.items.map((chat) => (
                  <TableRow
                    key={chat.id}
                    onClick={() => handleChatSelect(chat)}
                    sx={{
                      cursor: "pointer",
                      backgroundColor: selectedChat?.id === chat.id ? (darkMode ? "#424242" : "#f0f0f0") : "inherit",
                      "&:hover": { backgroundColor: darkMode ? "#424242" : "#f9f9f9" },
                    }}
                  >
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
                        {chat.topic}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{chat.userName}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(chat.createdDate)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip
                        label="Active"
                        size="small"
                        color="success"
                        variant="outlined"
                      />
                    </TableCell>
                    <TableCell>
                      <IconButton
                        color="error"
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent row click from selecting chat
                          handleOpenDeleteDialog(chat.id);
                        }}
                      >
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
                {(!chatsData?.items || chatsData.items.length === 0) && (
                  <TableRow>
                    <TableCell colSpan={5} align="center" sx={{ py: 3 }}>
                      <Typography variant="body1" color="textSecondary">
                        {searchTerm ? `No chats found for "${searchTerm}"` : "No chats found"}
                      </Typography>
                      {searchTerm && (
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

          {chatsData?.pagination && chatsData.items.length > 0 && (
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 3 }}>
              <Typography variant="body2" color="textSecondary">
                Showing {calculateStartIndex(chatsData.pagination)} - {calculateEndIndex(chatsData.pagination)} of{" "}
                {chatsData.pagination.totalCount} chats
              </Typography>
              <Pagination
                count={chatsData.pagination.totalPages}
                page={chatsData.pagination.currentPage}
                onChange={handlePageChange}
                color="primary"
                shape="rounded"
              />
            </Box>
          )}
        </Paper>

        {/* Chat Messages */}
        {selectedChat && (
          <Paper elevation={2} sx={{ p: 3, flex: 2, minWidth: 0, display: "flex", flexDirection: "column" }}>
            <Typography variant="h6" sx={{ mb: 2 }}>
              {selectedChat.topic}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ flex: 1, maxHeight: "60vh", overflowY: "auto", mb: 2 }}>
              {messages.map((msg) => (
                <Box
                  key={msg.id}
                  sx={{
                    mb: 2,
                    display: "flex",
                    justifyContent: msg.isUserMessage ? "flex-start" : "flex-end",
                  }}
                >
                  <Card
                    sx={{
                      maxWidth: "70%",
                      bgcolor: msg.isUserMessage
                        ? darkMode
                          ? "#424242"
                          : "#f0f0f0"
                        : darkMode
                        ? "#1976d2"
                        : "#1976d2",
                      color: msg.isUserMessage ? "inherit" : "#ffffff",
                      p: 2,
                      borderRadius: "12px",
                    }}
                  >
                    <Typography variant="body2">{msg.content}</Typography>
                    <Typography variant="caption" sx={{ mt: 1, display: "block", opacity: 0.7 }}>
                      {formatDate(msg.createdDate)}
                    </Typography>
                  </Card>
                </Box>
              ))}
              <div ref={messagesEndRef} />
            </Box>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder="Type your message..."
                variant="outlined"
                size="small"
                fullWidth
                sx={{
                  bgcolor: darkMode ? "#424242" : "#ffffff",
                  "& .MuiOutlinedInput-root": {
                    "& fieldset": { borderColor: darkMode ? "#616161" : "#e0e0e0" },
                    "&:hover fieldset": { borderColor: darkMode ? "#757575" : "#bdbdbd" },
                    "&.Mui-focused fieldset": { borderColor: "#1976d2" },
                  },
                }}
              />
              <Button
                variant="contained"
                color="primary"
                onClick={handleSendMessage}
                disabled={isSending || !message.trim()}
                startIcon={<SendIcon />}
                sx={{ borderRadius: "8px", textTransform: "none" }}
              >
                {isSending ? <CircularProgress size={24} color="inherit" /> : "Send"}
              </Button>
            </Box>
          </Paper>
        )}
      </Box>
    </Box>
  );
}