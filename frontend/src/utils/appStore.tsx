import { configureStore } from "@reduxjs/toolkit";
import formReducer from "./formSlice";

export const appStore = configureStore({
  reducer: {
    form: formReducer,
  },
  devTools: true,
});

export type RootState = ReturnType<typeof appStore.getState>;
export type AppDispatch = typeof appStore.dispatch;

