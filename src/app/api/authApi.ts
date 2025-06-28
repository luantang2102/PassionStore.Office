import { createApi } from "@reduxjs/toolkit/query/react";
import { baseQueryWithErrorHandling } from "./baseApi";
import { User } from "../models/responses/user";
import { ChangePasswordRequest } from "../models/requests/changePasswordRequest";
import { EmailRequest } from "../models/requests/emailRequest";
import { VerifyEmailRequest } from "../models/requests/verifyEmailRequest";
import { GoogleLoginRequest } from "../models/requests/googleLoginRequest";


export const authApi = createApi({
  reducerPath: "authApi",
  baseQuery: baseQueryWithErrorHandling,
  endpoints: (builder) => ({
    login: builder.mutation<User, FormData>({
      query: (formData) => ({
        url: "Auth/login",
        method: "POST",
        body: formData,
      }),
    }),
    register: builder.mutation<User, FormData>({
      query: (formData) => ({
        url: "Auth/register",
        method: "POST",
        body: formData,
      }),
    }),
    refreshToken: builder.query<User, void>({
      query: () => ({
        url: "Auth/refresh-token",
        method: "GET",
      }),
    }),
    checkAuth: builder.query<User, void>({
      query: () => ({
        url: "Auth/check",
        method: "GET",
      }),
    }),
    logout: builder.mutation<void, void>({
      query: () => ({
        url: "Auth/logout",
        method: "POST",
      }),
    }),
    changePassword: builder.mutation<void, ChangePasswordRequest>({
      query: (data) => {
        const formData = new FormData();
        formData.append("CurrentPassword", data.currentPassword);
        formData.append("NewPassword", data.newPassword);
        return {
          url: "Auth/change-password",
          method: "POST",
          body: formData,
        };
      },
    }),
    sendVerificationCode: builder.mutation<void, EmailRequest>({
      query: (data) => ({
        url: "Auth/send-verification-code",
        method: "POST",
        body: data,
      }),
    }),
    verifyEmail: builder.mutation<User, VerifyEmailRequest>({
      query: (data) => ({
        url: "Auth/verify-email",
        method: "POST",
        body: data,
      }),
    }),
    googleLogin: builder.mutation<User, GoogleLoginRequest>({
      query: (data) => ({
        url: "Auth/google",
        method: "POST",
        body: data,
      }),
    }),
  }),
});

export const {
  useLoginMutation,
  useRegisterMutation,
  useRefreshTokenQuery,
  useCheckAuthQuery,
  useLogoutMutation,
  useChangePasswordMutation,
  useSendVerificationCodeMutation,
  useVerifyEmailMutation,
  useGoogleLoginMutation,
} = authApi;