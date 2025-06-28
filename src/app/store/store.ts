
import { configureStore } from "@reduxjs/toolkit";
import { productApi } from "../api/productApi";
import { categoryApi } from "../api/categoryApi";
import { userApi } from "../api/userApi";
import { authApi } from "../api/authApi";
import { brandApi } from "../api/brandApi";
import { sizeApi } from "../api/sizeApi";
import { colorApi } from "../api/colorApi";
import productReducer from "../../features/Products/productsSlice";
import categoryReducer from "../../features/Categories/categoriesSlice";
import userReducer from "../../features/Users/userSlice";
import authReducer from "../../features/Auth/authSlice";
import colorReducer from "../../features/Colors/colorSlice";
import brandReducer from "../../features/Brands/brandSlice";
import sizeReducer from "../../features/Sizes/sizeSlice";
import { uiSlice } from "../layout/uiSlice";
import { useDispatch, useSelector } from "react-redux";
import { productVariantApi } from "../api/productVariantApi";

export const store = configureStore({
  reducer: {
    ui: uiSlice.reducer,
    [productApi.reducerPath]: productApi.reducer,
    [productVariantApi.reducerPath]: productVariantApi.reducer,
    [categoryApi.reducerPath]: categoryApi.reducer,
    [userApi.reducerPath]: userApi.reducer,
    [authApi.reducerPath]: authApi.reducer,
    [brandApi.reducerPath]: brandApi.reducer,
    [sizeApi.reducerPath]: sizeApi.reducer,
    [colorApi.reducerPath]: colorApi.reducer,
    product: productReducer,
    category: categoryReducer,
    color: colorReducer,
    brand: brandReducer,
    size: sizeReducer,
    user: userReducer,
    auth: authReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware().concat([
      productApi.middleware,
      productVariantApi.middleware,
      categoryApi.middleware,
      userApi.middleware,
      authApi.middleware,
      brandApi.middleware,
      sizeApi.middleware,
      colorApi.middleware,
    ]),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = useDispatch.withTypes<AppDispatch>();
export const useAppSelector = useSelector.withTypes<RootState>();

export default store;
