import { useState, useEffect, useRef } from "react";
import { DarkMode, LightMode, Menu, Notifications } from "@mui/icons-material";
import { styled } from '@mui/material/styles';
import {
  Box,
  IconButton,
  LinearProgress,
  Toolbar,
  Badge,
  Menu as MuiMenu,
  MenuItem,
  Typography,
  Divider,
  InputBase,
} from "@mui/material";
import { Search } from "lucide-react";
import MuiAppBar, { AppBarProps as MuiAppBarProps } from '@mui/material/AppBar';
import { NavLink } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../store/store";
import { setSidebarOpen, toggleDarkMode } from "../uiSlice";
import MoodButton from "../../../features/Gadgets/MoodButton";
import Clock from "../../../features/Gadgets/Clock";
import * as signalR from "@microsoft/signalr";
import {
  useFetchNotificationsQuery,
  useMarkNotificationAsReadMutation,
} from "../../api/notificationApi";
import { NotificationResponse } from "../../models/responses/notification";

interface AppBarProps extends MuiAppBarProps {
    open?: boolean;
}

const AppBar = styled(MuiAppBar, {
    shouldForwardProp: (prop) => prop !== 'open',
})<AppBarProps>(({ theme }) => ({
    zIndex: theme.zIndex.drawer + 1,
    transition: theme.transitions.create(['width', 'margin'], {
        easing: theme.transitions.easing.sharp,
        duration: theme.transitions.duration.leavingScreen,
    }),
    marginLeft: 0,
    width: '100%',
}));

export default function NavBar() {
    const { isLoading, darkMode, openSideBar } = useAppSelector(state => state.ui);
    const { isAuthenticated, user } = useAppSelector((state) => state.auth);
    const dispatch = useAppDispatch();

    const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
    const [notifications, setNotifications] = useState<NotificationResponse[]>([]);
    const [searchTerm, setSearchTerm] = useState("");
    const connectionRef = useRef<signalR.HubConnection | null>(null);

    const { data: notificationsData, refetch } = useFetchNotificationsQuery(
        { pageNumber: 1, pageSize: 10, isRead: false, searchTerm },
        { skip: !isAuthenticated }
    );
    const [markNotificationAsRead] = useMarkNotificationAsReadMutation();

    const handleToggleSidebar = () => {
        dispatch(setSidebarOpen(!openSideBar));
    };

    const handleOpenNotifications = (event: React.MouseEvent<HTMLElement>) => {
        setAnchorEl(event.currentTarget);
    };

    const handleCloseNotifications = () => {
        setAnchorEl(null);
    };

    const handleMarkNotificationAsRead = async (notificationId: string) => {
        try {
            await markNotificationAsRead(notificationId).unwrap();
            setNotifications((prev) =>
                prev.map((n) => (n.id === notificationId ? { ...n, isRead: true } : n))
            );
        } catch (err) {
            console.error("Failed to mark notification as read:", err);
        }
    };

    // Initialize SignalR connection
    useEffect(() => {
        if (!isAuthenticated) return;

        const connection = new signalR.HubConnectionBuilder()
            .withUrl("https://passionstore-hwajfcfqb8gbbng8.southeastasia-01.azurewebsites.net/chatHub", { withCredentials: true })
            .withAutomaticReconnect()
            .build();

        connectionRef.current = connection;

        connection.on("ReceiveNotification", (objectId: string, content: string) => {
            setNotifications((prev) => [
                ...prev,
                {
                    id: crypto.randomUUID(),
                    userId: user?.id || "",
                    objectId,
                    objectType: "ChatMessage",
                    content,
                    isRead: false,
                    createdDate: new Date().toISOString(),
                },
            ]);
            refetch();
        });

        connection.start().catch((err) => {
            console.error("SignalR Connection Error:", err);
        });

        return () => {
            connection.stop();
        };
    }, [isAuthenticated, user?.id, refetch]);

    // Update notifications when API data changes
    useEffect(() => {
        if (notificationsData?.items) {
            setNotifications(notificationsData.items);
        }
    }, [notificationsData]);

    return (
        <AppBar
            position='fixed'
            color='default'
            open={openSideBar}
            elevation={0}
            sx={{ borderBottom: 1, borderColor: 'divider', backgroundColor: darkMode ? "#121212" : "rgb(125, 166, 254)" }}
        >
            <Toolbar variant='regular' sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Box display='flex' alignItems='center'>
                    <IconButton
                        color="inherit"
                        aria-label="open drawer"
                        onClick={handleToggleSidebar}
                        edge="start"
                        sx={{ marginRight: 2 }}
                    >
                        <Menu />
                    </IconButton>
                    <NavLink to="/" style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Box
                            sx={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                transition: 'transform 0.3s ease-in-out',
                                '&:hover': {
                                    transform: 'scale(1.05)',
                                },
                            }}
                        >
                            <div
                                style={{
                                    fontFamily: 'Arial, sans-serif',
                                    fontSize: '2rem',
                                    fontWeight: 'bold',
                                    background: 'linear-gradient(to right, #3B82F6, #A855F7, #EC4899)',
                                    WebkitBackgroundClip: 'text',
                                    backgroundClip: 'text',
                                    color: 'transparent',
                                    textShadow: '2px 2px 4px rgba(0, 0, 0, 0.1)',
                                    padding: '4px 8px',
                                }}
                            >
                                Passion
                            </div>
                        </Box>
                    </NavLink>
                    <IconButton onClick={() => dispatch(toggleDarkMode())}>
                        {darkMode ? <DarkMode /> : <LightMode />}
                    </IconButton>
                </Box>

                <Box display='flex' alignItems='center'>
                    <IconButton onClick={handleOpenNotifications}>
                        <Badge
                            badgeContent={notifications.filter((n) => !n.isRead).length}
                            color="error"
                        >
                            <Notifications />
                        </Badge>
                    </IconButton>
                    <MoodButton />
                    <Clock />
                </Box>
            </Toolbar>
            {isLoading && (
                <Box sx={{ width: '100%' }}>
                    <LinearProgress color='info' />
                </Box>
            )}

            {/* Notification Dropdown */}
            <MuiMenu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={handleCloseNotifications}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                sx={{
                    '& .MuiPaper-root': {
                        backgroundColor: darkMode ? '#1f2937' : '#ffffff',
                        color: darkMode ? '#e5e7eb' : '#111827',
                        minWidth: '300px',
                        maxWidth: '400px',
                        maxHeight: '400px',
                        overflowY: 'auto',
                    },
                }}
            >
                <Box sx={{ p: 2 }}>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                        Notifications
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, position: 'relative' }}>
                        <Search
                            style={{
                                position: 'absolute',
                                left: '10px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: darkMode ? '#9ca3af' : '#6b7280',
                                width: '20px',
                                height: '20px',
                            }}
                        />
                        <InputBase
                            placeholder="Search notifications..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            sx={{
                                width: '100%',
                                pl: 5,
                                pr: 2,
                                py: 1,
                                borderRadius: '9999px',
                                backgroundColor: darkMode ? '#374151' : '#f3f4f6',
                                color: darkMode ? '#e5e7eb' : '#111827',
                                '& .MuiInputBase-input': {
                                    fontSize: '0.875rem',
                                },
                            }}
                        />
                    </Box>
                    <Divider sx={{ mb: 2, bgcolor: darkMode ? '#4b5563' : '#e5e7eb' }} />
                    {notifications.length > 0 ? (
                        notifications.map((notification) => (
                            <MenuItem
                                key={notification.id}
                                onClick={() => handleMarkNotificationAsRead(notification.id)}
                                sx={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'flex-start',
                                    py: 1.5,
                                    bgcolor: notification.isRead
                                        ? darkMode
                                            ? '#374151'
                                            : '#f3f4f6'
                                        : darkMode
                                        ? '#1e40af'
                                        : '#dbeafe',
                                    '&:hover': {
                                        bgcolor: darkMode ? '#4b5563' : '#e5e7eb',
                                    },
                                }}
                            >
                                <Typography variant="body2">
                                    {notification.content}
                                </Typography>
                                <Typography
                                    variant="caption"
                                    sx={{ color: darkMode ? '#9ca3af' : '#6b7280' }}
                                >
                                    {new Date(notification.createdDate).toLocaleString()}
                                </Typography>
                            </MenuItem>
                        ))
                    ) : (
                        <MenuItem>
                            <Typography variant="body2" sx={{ color: darkMode ? '#9ca3af' : '#6b7280' }}>
                                No notifications available
                            </Typography>
                        </MenuItem>
                    )}
                </Box>
            </MuiMenu>
        </AppBar>
    );
}