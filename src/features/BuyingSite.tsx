// features/BuyingSite.tsx
import { Box, Typography, Button } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAppDispatch, useAppSelector } from "../app/store/store";
import { useLogoutMutation } from "../app/api/authApi";
import { clearAuth } from "./Auth/authSlice";

const BuyingSite = () => {
  const { isAuthenticated, user } = useAppSelector((state) => state.auth);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [logout, { isLoading }] = useLogoutMutation();

  const handleLogout = async () => {
    try {
      await logout().unwrap();
      dispatch(clearAuth());
      toast.success("Logged out successfully!");
      navigate("/", { replace: true });
    } catch (error) {
      toast.error("Logout failed. Please try again.");
      console.error("Logout failed:", error);
    }
  };

  return (
    <Box sx={{ py: 4, textAlign: "center" }}>
      <Typography variant="h4" gutterBottom>
        Welcome to the Buying Site
      </Typography>
      {isAuthenticated && user ? (
        <Box sx={{ mt: 2 }}>
          <Typography variant="h6">
            Hello, {user.email}
          </Typography>
          <Typography variant="body1">
            Role: {user.roles.join(", ")}
          </Typography>
          <Button
            variant="contained"
            color="secondary"
            onClick={handleLogout}
            disabled={isLoading}
            sx={{ mt: 2 }}
          >
            {isLoading ? "Logging out..." : "Logout"}
          </Button>
        </Box>
      ) : (
        <Box sx={{ mt: 2 }}>
          <Typography variant="body1">
            Please sign in to access your account.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate("/signin")}
            sx={{ mt: 2 }}
          >
            Sign In
          </Button>
        </Box>
      )}
    </Box>
  );
};

export default BuyingSite;