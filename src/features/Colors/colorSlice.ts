import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { ColorParams } from "../../app/models/params/colorParams";

interface ColorState {
  params: ColorParams;
  selectedColorId: string | null;
  isCreateFormOpen: boolean;
  isDeleteDialogOpen: boolean;
}

const initialState: ColorState = {
  params: { pageNumber: 1, pageSize: 10 },
  selectedColorId: null,
  isCreateFormOpen: false,
  isDeleteDialogOpen: false,
};

const colorSlice = createSlice({
  name: "color",
  initialState,
  reducers: {
    setParams: (state, action: PayloadAction<Partial<ColorParams>>) => {
      state.params = { ...state.params, ...action.payload, pageNumber: 1 };
    },
    setPageNumber: (state, action: PayloadAction<number>) => {
      state.params.pageNumber = action.payload;
    },
    setSelectedColorId: (state, action: PayloadAction<string | null>) => {
      state.selectedColorId = action.payload;
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
  setSelectedColorId,
  setCreateFormOpen,
  setDeleteDialogOpen,
  resetParams,
} = colorSlice.actions;

export default colorSlice.reducer;