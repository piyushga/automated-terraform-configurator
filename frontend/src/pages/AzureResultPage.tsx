import { useLocation, useNavigate } from "react-router-dom";

export default function AzureResultPage() {
    const { state } = useLocation();
    const navigate = useNavigate();

    // HARD GUARD — prevents empty page
    if (!state) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-100">
                <div className="bg-white p-6 rounded-xl shadow text-center">
                    <h2 className="text-xl font-semibold mb-3">No result available</h2>
                    <button
                        onClick={() => navigate("/")}
                        className="px-4 py-2 bg-blue-600 text-white rounded"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    const ok = state.ok === true;

    // SAFELY extract outputs
    const vmId =
        state.outputs?.vm_id?.value ??
        state.outputs?.vm_id ??
        "N/A";

    const errorMessage =
        state.error ??
        state.raw?.error ??
        state.raw ??
        "Unknown error occurred";

    return (
        <div className="min-h-screen bg-slate-100 py-10 px-4">
            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6">
                <h1 className="text-2xl font-semibold mb-4">
                    {ok ? "Resource created successfully" : "Resource creation failed"}
                </h1>

                {/* METADATA */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                        <div className="text-xs text-gray-500">Region</div>
                        <div className="font-medium">{state.region}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">VM Size</div>
                        <div className="font-medium">{state.instanceType}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">vCPU</div>
                        <div className="font-medium">{state.vcpu}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">RAM (GiB)</div>
                        <div className="font-medium">{state.ramGB}</div>
                    </div>
                </div>

                {/* RESULT */}
                {ok ? (
                    <div className="rounded border p-4 bg-green-50 mb-4">
                        <div className="text-sm text-gray-600">VM ID</div>
                        <div className="font-medium break-all">{vmId}</div>

                        <div className="mt-3 text-sm text-gray-600">Job ID</div>
                        <div className="font-medium">{state.jobId}</div>

                        <div className="mt-3 text-sm text-gray-600">Created At</div>
                        <div className="font-medium">{state.createdAt}</div>
                    </div>
                ) : (
                    <div className="rounded border p-4 bg-red-50 mb-4">
                        <div className="text-sm font-semibold text-red-700 mb-2">
                            Error
                        </div>
                        <pre className="text-sm whitespace-pre-wrap text-gray-800">
                            {typeof errorMessage === "string"
                                ? errorMessage
                                : JSON.stringify(errorMessage, null, 2)}
                        </pre>
                    </div>
                )}

                {/* ACTIONS */}
                <div className="flex gap-3 justify-end">
                    {state.jobId && (
                        <a
                            href={`${import.meta.env.VITE_API_BASE_URL}/terraform/azure/${state.jobId}/download`}
                            className="px-4 py-2 rounded bg-gray-800 text-white"
                        >
                            Download Terraform
                        </a>
                    )}
                    <button
                        onClick={() => navigate("/")}
                        className="px-4 py-2 rounded bg-emerald-600 text-white"
                    >
                        Create Another Resource
                    </button>
                    <button
                        onClick={() => navigate("/")}
                        className="px-4 py-2 rounded border"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
