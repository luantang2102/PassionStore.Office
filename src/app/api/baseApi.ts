import { BaseQueryApi, FetchArgs, fetchBaseQuery } from "@reduxjs/toolkit/query";
import { setLoading } from "../layout/uiSlice";
import { toast } from "react-toastify";
import { router } from "../routes/Routes";
import { Mutex } from "async-mutex";

const mutex = new Mutex();

const customBaseQuery = fetchBaseQuery({
  // baseUrl: "https://localhost:5001/api",
  baseUrl: "https://passionstore-hwajfcfqb8gbbng8.southeastasia-01.azurewebsites.net/api",
  credentials: "include",
});

interface ErrorResponse {
  title?: string;
  errors?: string[];
  detail?: string;
}

export const baseQueryWithErrorHandling = async (
  args: string | FetchArgs,
  api: BaseQueryApi,
  extraOptions: object
) => {
  await mutex.waitForUnlock();
  api.dispatch(setLoading(true));

  const url = typeof args === "string" ? args : args.url;
  const isAuthEndpoint = url.toLowerCase().includes("auth/");
  const isLoginEndpoint = url.toLowerCase() === "auth/login";

  let result = await customBaseQuery(args, api, extraOptions);

  // Skip token refresh for auth endpoints
  if (result.error && result.error.status === 401 && !isAuthEndpoint) {
    if (!mutex.isLocked()) {
      const release = await mutex.acquire();
      try {
        console.log("401 error detected, attempting token refresh for endpoint:", url);
        const refreshResult = await customBaseQuery(
          { url: "Auth/refresh-token", method: "GET" }, // Match backend case
          api,
          extraOptions
        );

        if (refreshResult.data) {
          console.log("Token refresh successful, retrying original request");
          result = await customBaseQuery(args, api, extraOptions);
        } else {
          console.log("Token refresh failed:", refreshResult.error);
          toast.error("Session expired. Please log in again.");
          router.navigate("/signin"); // Match redirect to /signin
        }
      } catch (refreshError) {
        console.log("Refresh token request failed:", refreshError);
        toast.error("Session expired. Please log in again.");
        router.navigate("/signin");
      } finally {
        release();
      }
    } else {
      await mutex.waitForUnlock();
      result = await customBaseQuery(args, api, extraOptions);
    }
  }

  api.dispatch(setLoading(false));

  if (result.error) {
    const originalStatus =
      result.error.status === "PARSING_ERROR" && result.error.originalStatus
        ? result.error.originalStatus
        : result.error.status;

    const resData = result.error.data as ErrorResponse;

    switch (originalStatus) {
      case 400:
        if (resData.detail) toast.error(resData.detail);
        else if (resData.errors) {
          throw Object.values(resData.errors).flat().join(", ");
        } else if (resData.title) toast.error(resData.title);
        break;
      case 401:
        if (isLoginEndpoint) {
          console.log("Login failed with 401, passing error to component");
          return result;
        } else if (isAuthEndpoint) {
          console.log("Auth endpoint failed with 401, skipping toast");
          return result; // Let authSlice handle the error
        } else if (resData.title) {
          toast.error(resData.title);
        }
        break;
      case 403:
        toast.error("You are not authorized to perform this action.");
        break;
      case 404:
        if (url === "Auth/refresh-token") {
          console.log("Refresh token endpoint not found, redirecting to signin");
          toast.error("Authentication service unavailable. Please log in again.");
          router.navigate("/signin");
        } else if (resData.title) {
          router.navigate("/not-found");
        }
        break;
      case 500:
        router.navigate("/server-error", { state: { error: resData } });
        break;
      default:
        break;
    }
  }

  return result;
};