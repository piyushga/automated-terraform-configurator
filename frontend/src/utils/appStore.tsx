import { configureStore } from "@reduxjs/toolkit";
import formReducer from "./formSlice";
import cloudReducer from "./cloudSlice";

export const appStore = configureStore({
  reducer: {
    form: formReducer,
    cloud: cloudReducer,
  },
  devTools: true,
});

export type RootState = ReturnType<typeof appStore.getState>;
export type AppDispatch = typeof appStore.dispatch;

