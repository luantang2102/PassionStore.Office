import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { OrderParams } from "../../app/models/params/orderParams";

interface OrderState {
  params: OrderParams;
  selectedOrderId: string | null;
  isUpdateStatusDialogOpen: boolean;
  isCancelDialogOpen: boolean;
  isReturnDialogOpen: boolean;
  returnReason: string;
}

const initialState: OrderState = {
  params: { pageNumber: 1, pageSize: 10 },
  selectedOrderId: null,
  isUpdateStatusDialogOpen: false,
  isCancelDialogOpen: false,
  isReturnDialogOpen: false,
  returnReason: "",
};

const orderSlice = createSlice({
  name: "order",
  initialState,
  reducers: {
    setParams: (state, action: PayloadAction<Partial<OrderParams>>) => {
      state.params = { ...state.params, ...action.payload, pageNumber: 1 };
    },
    setPageNumber: (state, action: PayloadAction<number>) => {
      state.params.pageNumber = action.payload;
    },
    setSelectedOrderId: (state, action: PayloadAction<string | null>) => {
      state.selectedOrderId = action.payload;
    },
    setUpdateStatusDialogOpen: (state, action: PayloadAction<boolean>) => {
      state.isUpdateStatusDialogOpen = action.payload;
    },
    setCancelDialogOpen: (state, action: PayloadAction<boolean>) => {
      state.isCancelDialogOpen = action.payload;
    },
    setReturnDialogOpen: (state, action: PayloadAction<boolean>) => {
      state.isReturnDialogOpen = action.payload;
    },
    setReturnReason: (state, action: PayloadAction<string>) => {
      state.returnReason = action.payload;
    },
    resetParams: (state) => {
      state.params = { pageNumber: 1, pageSize: 10 };
    },
  },
});

export const {
  setParams,
  setPageNumber,
  setSelectedOrderId,
  setUpdateStatusDialogOpen,
  setCancelDialogOpen,
  setReturnDialogOpen,
  setReturnReason,
  resetParams,
} = orderSlice.actions;

export default orderSlice.reducer;