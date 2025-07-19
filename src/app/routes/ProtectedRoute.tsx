import { Navigate } from "react-router-dom";
import { useAppSelector } from "../store/store";
import { JSX } from "react";
import { CircularProgress } from "@mui/material";

interface ProtectedRouteProps {
  children: JSX.Element;
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, loading, user } = useAppSelector((state) => state.auth);

  if (loading) {
    return (
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", height: "100vh" }}>
        <CircularProgress />
      </div>
    );
  }

  if (!isAuthenticated || !user?.roles?.includes("Admin")) {
    console.log("ProtectedRoute: Redirecting to signin due to missing Admin role or unauthenticated state");
    return <Navigate to="/signin" replace />;
  }

  return children;
};

export default ProtectedRoute;