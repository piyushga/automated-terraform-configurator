import { useLocation, useNavigate } from "react-router-dom";

export default function AwsResultPage() {
    const loc = useLocation();
    const nav = useNavigate();
    const state: any = loc.state ?? null;

    if (!state) {
        return (
            <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
                <div className="bg-white rounded-xl shadow p-6 max-w-xl w-full text-center">
                    <h2 className="text-xl font-semibold mb-3">No result available</h2>
                    <p className="text-sm text-gray-600 mb-4">
                        This page expects result data from the create flow.
                    </p>
                    <button
                        onClick={() => nav("/")}
                        className="px-4 py-2 rounded bg-blue-600 text-white"
                    >
                        Go Home
                    </button>
                </div>
            </div>
        );
    }

    const ok = state.ok !== false;
    const outputs = state.outputs ?? state.raw?.outputs ?? null;

    const instanceId =
        outputs?.instance_id?.value ??
        outputs?.instance_id ??
        "N/A";

    const publicIp =
        outputs?.public_ip?.value ??
        outputs?.public_ip ??
        "N/A";

    const errorMessage =
        state.error ??
        state.raw ??
        "Unknown error occurred";

    const terraformDownloadUrl =
        state.jobId
            ? `${import.meta.env.VITE_API_BASE_URL}/terraform/aws/${state.jobId}/download`
            : null;

    return (
        <div className="min-h-screen bg-slate-100 py-10 px-4">
            <div className="max-w-3xl mx-auto bg-white rounded-xl shadow p-6">
                <h1 className="text-2xl font-semibold mb-4">
                    {ok ? "Resource created successfully" : "Resource creation failed"}
                </h1>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                    <div>
                        <div className="text-xs text-gray-500">Region</div>
                        <div className="font-medium">{state.region ?? "—"}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">Instance Type</div>
                        <div className="font-medium">{state.instance_type ?? "—"}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">vCPU</div>
                        <div className="font-medium">{state.vcpu ?? "—"}</div>
                    </div>
                    <div>
                        <div className="text-xs text-gray-500">RAM (GiB)</div>
                        <div className="font-medium">{state.ram_gb ?? "—"}</div>
                    </div>
                </div>

                {ok ? (
                    <div className="rounded border p-4 bg-green-50 mb-4">
                        <div className="text-sm text-gray-600">Instance ID</div>
                        <div className="font-medium break-all">{instanceId}</div>

                        <div className="mt-3 text-sm text-gray-600">Public IP</div>
                        <div className="font-medium">{publicIp}</div>

                        <div className="mt-3 text-sm text-gray-600">Block Storage</div>
                        <div className="font-medium">30 GB</div>

                        <div className="mt-3 text-sm text-gray-600">Job ID</div>
                        <div className="font-medium">{state.jobId ?? "—"}</div>

                        <div className="mt-3 text-sm text-gray-600">Created At</div>
                        <div className="font-medium">{state.createdAt ?? "—"}</div>
                    </div>
                ) : (
                    <div className="rounded border p-4 bg-red-50 mb-4">
                        <div className="text-sm text-red-700 font-semibold mb-2">
                            Error
                        </div>
                        <pre className="text-sm text-gray-800 whitespace-pre-wrap">
                            {typeof errorMessage === "string"
                                ? errorMessage
                                : JSON.stringify(errorMessage, null, 2)}
                        </pre>
                    </div>
                )}

                <div className="flex gap-3 justify-end">
                    {terraformDownloadUrl && (
                        <a
                            href={terraformDownloadUrl}
                            className="px-4 py-2 rounded bg-gray-800 text-white"
                        >
                            Download Terraform
                        </a>
                    )}
                    <button
                        onClick={() => nav("/")}
                        className="px-4 py-2 rounded bg-emerald-600 text-white"
                    >
                        Create Another Resource
                    </button>
                    <button
                        onClick={() => nav("/")}
                        className="px-4 py-2 rounded border"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
