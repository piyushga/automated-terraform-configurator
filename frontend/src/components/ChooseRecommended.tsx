import { useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../utils/appStore";
import Modal from "./Modal";

export default function ChooseRecommended() {
    const { gcp } = useSelector((s: RootState) => s.cloud);

    // ✅ For now: allow choose recommended ONLY if GCP has valid price
    const isReady = gcp.region && gcp.instance && Number.isFinite(gcp.price ?? NaN);

    const [open, setOpen] = useState(false);

    return (
        <>
            <button
                disabled={!isReady}
                onClick={() => setOpen(true)}
                className={`w-full max-w-4xl mt-6 font-semibold py-2 px-4 rounded-lg shadow-sm transition
          ${isReady ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-gray-300 text-gray-500 cursor-not-allowed"}
        `}
            >
                Choose Recommended (Test Mode - GCP Only)
            </button>

            <Modal open={open} onClose={() => setOpen(false)} title="Recommended Option">
                {isReady ? (
                    <div className="space-y-4">
                        <div className="rounded-lg border border-gray-200 p-3">
                            <div className="text-sm text-gray-500">Provider • Region • Type</div>
                            <div className="text-base font-medium">
                                GCP • {gcp.region} • {gcp.instance}
                            </div>
                            <div className="text-lg font-semibold mt-1">
                                ${gcp.price?.toFixed(2)} / month
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg py-2 font-semibold">
                                Create This
                            </button>
                            <button
                                onClick={() => setOpen(false)}
                                className="flex-1 border border-gray-300 rounded-lg py-2 font-semibold text-gray-700 hover:bg-gray-100"
                            >
                                Choose Manually
                            </button>
                        </div>
                    </div>
                ) : (
                    <div className="text-sm text-gray-600">GCP not selected yet.</div>
                )}
            </Modal>
        </>
    );
}
