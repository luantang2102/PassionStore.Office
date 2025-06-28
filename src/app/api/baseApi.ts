import { BaseQueryApi, FetchArgs, fetchBaseQuery } from "@reduxjs/toolkit/query";
import { setLoading } from "../layout/uiSlice";
import { toast } from "react-toastify";
import { router } from "../routes/Routes";
import { Mutex } from "async-mutex";

const mutex = new Mutex();

const customBaseQuery = fetchBaseQuery({
  baseUrl: "https://localhost:5001/api",
  credentials: "include", // Send cookies with requests
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

  let result = await customBaseQuery(args, api, extraOptions);

  if (result.error && result.error.status === 401 && !api.endpoint.includes("auth/")) {
    if (!mutex.isLocked()) {
      const release = await mutex.acquire();
      try {
        const refreshResult = await customBaseQuery(
          { url: "auth/refresh-token", method: "GET" },
          api,
          extraOptions
        );

        if (refreshResult.data) {
          result = await customBaseQuery(args, api, extraOptions);
        } else {
          toast.error("Session expired. Please log in again.");
          router.navigate("/login");
        }
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
        if (resData.title) toast.error(resData.title);
        break;
      case 403:
        toast.error("You are not authorized to perform this action.");
        break;
      case 404:
        if (resData.title) router.navigate("/not-found");
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