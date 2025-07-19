import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Box, Container, createTheme, CssBaseline, Fab, ThemeProvider } from "@mui/material";
import { Outlet } from "react-router-dom";
import { KeyboardArrowUp } from "@mui/icons-material";
import { useAppSelector, useAppDispatch } from "../store/store";
import SideBar from "./Sidebar";
import NavBar from "./Navbar";
import { useCheckAuthQuery, useLogoutMutation } from "../api/authApi";
import { clearAuth } from "../../features/Auth/authSlice";

function App() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { darkMode } = useAppSelector((state) => state.ui);
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const { data: authData, isSuccess, isError, isLoading } = useCheckAuthQuery(undefined, {
    refetchOnMountOrArgChange: true, // Ensure fresh data
  });
  const [logout] = useLogoutMutation();

  // Handle non-Admin users and redirect to signin
  useEffect(() => {
    if (isSuccess && authData) {
      console.log("checkAuth data:", authData);
      if (!authData.roles.includes("Admin")) {
        console.log("Non-Admin user detected, triggering logout");
        logout()
          .unwrap()
          .then(() => {
            console.log("Logout successful, clearing auth state");
            dispatch(clearAuth());
            navigate("/signin", { replace: true });
          })
          .catch((error) => {
            console.error("Logout failed:", error);
            dispatch(clearAuth());
            navigate("/signin", { replace: true });
          });
      }
    } else if (isError) {
      console.log("checkAuth failed, redirecting to signin");
      dispatch(clearAuth());
      navigate("/signin", { replace: true });
    }
  }, [authData, isSuccess, isError, logout, dispatch, navigate]);

  // Redirect if state indicates not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log("User not authenticated, redirecting to signin");
      navigate("/signin", { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate]);

  const theme = createTheme({
    palette: {
      mode: darkMode ? "dark" : "light",
      background: {
        default: darkMode ? "#121212" : "#eaeaea",
      },
    },
    components: {
      MuiTableHead: {
        defaultProps: {
          sx: {
            backgroundColor: darkMode ? "#424242" : "#f5f5f5",
          },
        },
      },
      MuiTableRow: {
        defaultProps: {
          sx: {
            "&:hover": {
              backgroundColor: darkMode ? "#424242" : "#f9f9f9",
            },
          },
        },
      },
    },
  });

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <NavBar />
      <Box
        sx={{
          minHeight: "100vh",
          background: darkMode
            ? "radial-gradient(circle, rgb(62, 66, 86), #111B27)"
            : "rgb(227, 236, 255)",
          display: "flex",
        }}
      >
        <SideBar />
        <Container maxWidth="xl" sx={{ mt: 8, flexGrow: 1 }}>
          <Outlet />
        </Container>
        <Fab
          color="info"
          onClick={scrollToTop}
          sx={{
            position: "fixed",
            bottom: 16,
            right: 16,
            zIndex: 1000,
          }}
        >
          <KeyboardArrowUp />
        </Fab>
      </Box>
    </ThemeProvider>
  );
}

export default App;