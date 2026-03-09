import React from "react";

export default function LoadingOverlay({ message = "Creating resource… please wait." }: { message?: string }) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" />
            <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-xl p-6">
                <div className="flex flex-col items-center gap-4">
                    <div className="animate-spin h-12 w-12 border-4 border-gray-200 border-t-gray-700 rounded-full" />
                    <div className="text-gray-700 text-center">{message}</div>
                </div>
            </div>
        </div>
    );
}
