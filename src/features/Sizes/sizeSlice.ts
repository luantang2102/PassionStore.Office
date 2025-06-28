import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { SizeParams } from "../../app/models/params/sizeParams";

interface SizeState {
  params: SizeParams;
  selectedSizeId: string | null;
  isCreateFormOpen: boolean;
  isDeleteDialogOpen: boolean;
}

const initialState: SizeState = {
  params: { pageNumber: 1, pageSize: 10 },
  selectedSizeId: null,
  isCreateFormOpen: false,
  isDeleteDialogOpen: false,
};

const sizeSlice = createSlice({
  name: "size",
  initialState,
  reducers: {
    setParams: (state, action: PayloadAction<Partial<SizeParams>>) => {
      state.params = { ...state.params, ...action.payload, pageNumber: 1 };
    },
    setPageNumber: (state, action: PayloadAction<number>) => {
      state.params.pageNumber = action.payload;
    },
    setSelectedSizeId: (state, action: PayloadAction<string | null>) => {
      state.selectedSizeId = action.payload;
    },
    setCreateFormOpen: (state, action: PayloadAction<boolean>) => {
      state.isCreateFormOpen = action.payload;
    },
    setDeleteDialogOpen: (state, action: PayloadAction<boolean>) => {
      state.isDeleteDialogOpen = action.payload;
    },
    resetParams: (state) => {
      state.params = { pageNumber: 1, pageSize: 10 };
    },
  },
});

export const {
  setParams,
  setPageNumber,
  setSelectedSizeId,
  setCreateFormOpen,
  setDeleteDialogOpen,
  resetParams,
} = sizeSlice.actions;

export default sizeSlice.reducer;