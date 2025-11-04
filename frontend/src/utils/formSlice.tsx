import { createSlice } from "@reduxjs/toolkit";

type FormState = {
  vcpu: number;
  ramGB: number;
  storageGB: number;
};

const initialState: FormState = {
  vcpu: 1,
  ramGB: 1,
  storageGB: 30,
};

const formSlice = createSlice({
  name: "form",
  initialState,
  reducers: {
    vcpuGB(state, action) {
      state.vcpu = action.payload;
    },
    ramGB(state, action) {
      state.ramGB = action.payload;
    },
    storageGB(state, action) {
      state.storageGB = action.payload;
    },
  },
});

export const { vcpuGB, ramGB, storageGB } = formSlice.actions;
export default formSlice.reducer;
