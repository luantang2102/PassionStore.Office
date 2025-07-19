import { createSlice, PayloadAction } from "@reduxjs/toolkit";
import { UserParams } from "../../app/models/params/userParams";

interface UserState {
  params: UserParams;
  selectedUserId: string | null;
  isCreateFormOpen: boolean;
  isDeleteDialogOpen: boolean;
  selectedUserIds: string[];
}

const initialState: UserState = {
  params: { pageNumber: 1, pageSize: 10, orderBy: "createddateasc" },
  selectedUserId: null,
  isCreateFormOpen: false,
  isDeleteDialogOpen: false,
  selectedUserIds: [],
};

const userSlice = createSlice({
  name: "user",
  initialState,
  reducers: {
    setParams: (state, action: PayloadAction<Partial<UserParams>>) => {
      state.params = { ...state.params, ...action.payload, pageNumber: 1 };
    },
    setPageNumber: (state, action: PayloadAction<number>) => {
      state.params.pageNumber = action.payload;
    },
    setSelectedUserId: (state, action: PayloadAction<string | null>) => {
      state.selectedUserId = action.payload;
    },
    setCreateFormOpen: (state, action: PayloadAction<boolean>) => {
      state.isCreateFormOpen = action.payload;
    },
    setDeleteDialogOpen: (state, action: PayloadAction<boolean>) => {
      state.isDeleteDialogOpen = action.payload;
    },
    setSelectedUserIds: (state, action: PayloadAction<string[]>) => {
      state.selectedUserIds = action.payload;
    },
    resetParams: (state) => {
      state.params = { pageNumber: 1, pageSize: 10, orderBy: "createddateasc" };
    },
  },
});

export const {
  setParams,
  setPageNumber,
  setSelectedUserId,
  setCreateFormOpen,
  setDeleteDialogOpen,
  setSelectedUserIds,
  resetParams,
} = userSlice.actions;

export default userSlice.reducer;