/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import { Button, TextField, Typography, Box, CircularProgress } from "@mui/material";
import { useForm, Controller } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../../../app/store/store";
import { useLoginMutation } from "../../../app/api/authApi";
import { setAuth, clearAuth } from "../authSlice";
import { useEffect, useCallback } from "react";
import { toast } from "react-toastify";

interface SignInForm {
  email: string;
  password: string;
}

const SignIn = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const { isAuthenticated } = useAppSelector((state) => state.auth);
  const [login, { isLoading, error }] = useLoginMutation();
  const { control, handleSubmit, formState: { errors } } = useForm<SignInForm>({
    defaultValues: {
      email: "",
      password: "",
    },
  });

  // Redirect authenticated users to dashboard
  useEffect(() => {
    if (isAuthenticated) {
      console.log("User is authenticated, redirecting to dashboard");
      navigate("/dashboard", { replace: true });
    }
  }, [isAuthenticated, navigate]);

  const onSubmit = useCallback(
    async (data: SignInForm) => {
      const formData = new FormData();
      formData.append("email", data.email);
      formData.append("password", data.password);

      try {
        const response = await login(formData).unwrap();
        console.log("Login response:", response);
        if (response?.roles?.includes("Admin")) {
          dispatch(setAuth(response));
          navigate("/dashboard", { replace: true });
        } else {
          dispatch(clearAuth());
          toast.error("Access denied: Admin role required");
        }
      } catch (error: any) {
        dispatch(clearAuth());
        let errorMessage = "Login failed. Please try again.";
        if (error.status === 400 || error.status === 401) {
          if (error.data?.title) {
            errorMessage = error.data.title;
          } else if (error.data?.errors) {
            errorMessage = Object.values(error.data.errors).flat().join(", ");
          } else if (typeof error.data === "string") {
            errorMessage = error.data;
          }
        }
        console.error("Login error:", error);
        toast.error(errorMessage);
      }
    },
    [dispatch, login, navigate]
  );

  // Render nothing while redirecting
  if (isAuthenticated) {
    return null;
  }

  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        p: 4,
        borderRadius: 2,
        boxShadow: 3,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <Typography variant="h4" gutterBottom>
        Sign In
      </Typography>
      <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ width: "100%", mt: 2 }}>
        <Controller
          name="email"
          control={control}
          rules={{
            required: "Email is required",
            pattern: {
              value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
              message: "Invalid email address",
            },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              label="Email"
              fullWidth
              margin="normal"
              error={!!errors.email}
              helperText={errors.email?.message}
              disabled={isLoading}
            />
          )}
        />
        <Controller
          name="password"
          control={control}
          rules={{
            required: "Password is required",
            minLength: { value: 6, message: "Password must be at least 6 characters" },
          }}
          render={({ field }) => (
            <TextField
              {...field}
              label="Password"
              type="password"
              fullWidth
              margin="normal"
              error={!!errors.password}
              helperText={errors.password?.message}
              disabled={isLoading}
            />
          )}
        />
        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          sx={{ mt: 3, mb: 2 }}
          disabled={isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : null}
        >
          Sign In
        </Button>
      </Box>
    </Box>
  );
};

export default SignIn;