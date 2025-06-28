import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { BrandParams } from "../../app/models/params/brandParams";

interface BrandState {
  params: BrandParams;
  selectedBrandId: string | null;
  isCreateFormOpen: boolean;
  isDeleteDialogOpen: boolean;
}

const initialState: BrandState = {
  params: { pageNumber: 1, pageSize: 10 },
  selectedBrandId: null,
  isCreateFormOpen: false,
  isDeleteDialogOpen: false,
};

const brandSlice = createSlice({
  name: "brand",
  initialState,
  reducers: {
    setParams: (state, action: PayloadAction<Partial<BrandParams>>) => {
      state.params = { ...state.params, ...action.payload, pageNumber: 1 };
    },
    setPageNumber: (state, action: PayloadAction<number>) => {
      state.params.pageNumber = action.payload;
    },
    setSelectedBrandId: (state, action: PayloadAction<string | null>) => {
      state.selectedBrandId = action.payload;
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
  setSelectedBrandId,
  setCreateFormOpen,
  setDeleteDialogOpen,
  resetParams,
} = brandSlice.actions;

export default brandSlice.reducer;