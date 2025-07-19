import { createBrowserRouter, Navigate } from "react-router-dom";
import App from "../layout/App";
import ServerError from "../errors/ServerError";
import NotFound from "../errors/NotFound";
import Dashboard from "../../features/Dashboard";
import Products from "../../features/Products";
import Categories from "../../features/Categories";
import Users from "../../features/Users";
import ProtectedRoute from "./ProtectedRoute";
import AuthLayout from "../layout/Auth";
import SignIn from "../../features/Auth/SignIn";
import ColorList from "../../features/Colors";
import BrandList from "../../features/Brands";
import SizeList from "../../features/Sizes";
import OrderList from "../../features/Orders";
import ChatList from "../../features/Chat";

export const router = createBrowserRouter([
  {
    path: "/",
    element: <App />,
    children: [
      {
        path: "",
        element: <Navigate replace to="/dashboard" />,
      },
      {
        path: "dashboard",
        element: <ProtectedRoute><Dashboard /></ProtectedRoute>,
      },
      {
        path: "products",
        element: <ProtectedRoute><Products /></ProtectedRoute>,
      },
      {
        path: "orders",
        element: <ProtectedRoute><OrderList /></ProtectedRoute>,
      },
      {
        path: "categories",
        element: <ProtectedRoute><Categories /></ProtectedRoute>,
      },
      {
        path: "colors",
        element: <ProtectedRoute><ColorList /></ProtectedRoute>,
      },
      {
        path: "sizes",
        element: <ProtectedRoute><SizeList /></ProtectedRoute>,
      },
      {
        path: "brands",
        element: <ProtectedRoute><BrandList /></ProtectedRoute>,
      },
      {
        path: "customers",
        element: <ProtectedRoute><Users /></ProtectedRoute>,
      },
      {
        path: "chats",
        element: <ProtectedRoute><ChatList /></ProtectedRoute>,
      },
      {
        path: "server-error",
        element: <ServerError />,
      },
      {
        path: "not-found",
        element: <NotFound />,
      },
      {
        path: "/*",
        element: <Navigate replace to="/not-found" />,
      },
    ],
  },
  {
    path: "/",
    element: <AuthLayout />,
    children: [
      {
        path: "signin",
        element: <SignIn />,
      }
    ],
  },
]);