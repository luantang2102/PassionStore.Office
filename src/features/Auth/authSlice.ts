import { createSlice } from "@reduxjs/toolkit";
import { authApi } from "../../app/api/authApi";
import { User } from "../../app/models/responses/user";

interface AuthState {
  isAuthenticated: boolean;
  user: null | User;
  loading: boolean;
}

const initialState: AuthState = {
  isAuthenticated: false,
  user: null,
  loading: true,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setAuth: (state, action) => {
      console.log("setAuth called with payload:", action.payload);
      state.isAuthenticated = true;
      state.user = action.payload;
      state.loading = false;
    },
    clearAuth: (state) => {
      console.log("clearAuth called");
      state.isAuthenticated = false;
      state.user = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    // Handle checkAuth query
    builder.addMatcher(
      authApi.endpoints.checkAuth.matchFulfilled,
      (state, { payload }) => {
        console.log("checkAuth response:", payload);
        if (payload?.roles?.includes("Admin")) {
          state.isAuthenticated = true;
          state.user = payload;
          state.loading = false;
        } else {
          console.log("Non-Admin user detected, clearing auth state");
          state.isAuthenticated = false;
          state.user = null;
          state.loading = false;
        }
      }
    );
    builder.addMatcher(authApi.endpoints.checkAuth.matchRejected, (state, { error }) => {
      console.log("checkAuth rejected:", error);
      state.isAuthenticated = false;
      state.user = null;
      state.loading = false;
    });
    // Handle login
    builder.addMatcher(authApi.endpoints.login.matchFulfilled, (state, { payload }) => {
      console.log("login response:", payload);
      if (payload?.roles?.includes("Admin")) {
        state.isAuthenticated = true;
        state.user = payload;
        state.loading = false;
      } else {
        console.log("Non-Admin login attempt, clearing auth state");
        state.isAuthenticated = false;
        state.user = null;
        state.loading = false;
      }
    });
    builder.addMatcher(authApi.endpoints.login.matchRejected, (state, { error }) => {
      console.log("login rejected:", error);
      state.isAuthenticated = false;
      state.user = null;
      state.loading = false;
    });
    // Handle register
    builder.addMatcher(authApi.endpoints.register.matchFulfilled, (state, { payload }) => {
      console.log("register response:", payload);
      if (payload?.roles?.includes("Admin")) {
        state.isAuthenticated = true;
        state.user = payload;
        state.loading = false;
      } else {
        console.log("Non-Admin register attempt, clearing auth state");
        state.isAuthenticated = false;
        state.user = null;
        state.loading = false;
      }
    });
    // Handle logout
    builder.addMatcher(authApi.endpoints.logout.matchFulfilled, (state) => {
      console.log("logout successful");
      state.isAuthenticated = false;
      state.user = null;
      state.loading = false;
    });
    builder.addMatcher(authApi.endpoints.logout.matchRejected, (state, { error }) => {
      console.log("logout failed:", error);
      state.isAuthenticated = false;
      state.user = null;
      state.loading = false;
    });
  },
});

export const { setAuth, clearAuth } = authSlice.actions;
export default authSlice.reducer;