import { createSlice, PayloadAction } from "@reduxjs/toolkit";

export type CloudConfig = {
    region: string;
    instance: string;   // instanceType / machineType
    price: number | null; // monthly price as number; null when unknown
};

type CloudState = {
    aws: CloudConfig;
    gcp: CloudConfig;
    azure: CloudConfig;
};

const initialOne: CloudConfig = { region: "", instance: "", price: null };

const initialState: CloudState = {
    aws: { ...initialOne },
    gcp: { ...initialOne },
    azure: { ...initialOne },
};

const cloudSlice = createSlice({
    name: "cloud",
    initialState,
    reducers: {
        updateAws(state, action: PayloadAction<Partial<CloudConfig>>) {
            state.aws = { ...state.aws, ...action.payload };
        },
        updateGcp(state, action: PayloadAction<Partial<CloudConfig>>) {
            state.gcp = { ...state.gcp, ...action.payload };
        },
        updateAzure(state, action: PayloadAction<Partial<CloudConfig>>) {
            state.azure = { ...state.azure, ...action.payload };
        },
        resetClouds() {
            return initialState;
        },
    },
});

export const { updateAws, updateGcp, updateAzure, resetClouds } = cloudSlice.actions;
export default cloudSlice.reducer;
