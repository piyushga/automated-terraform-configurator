import { useEffect, useRef, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../utils/appStore";
import LoadingOverlay from "./LoadingOverlay";
import { useNavigate } from "react-router-dom";

const ProviderPanel = () => {
    const BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const navigate = useNavigate();

    const [regions, setRegions] = useState<string[]>([]);
    const [instances, setInstances] = useState<{ instanceType: string; vcpus: number; memoryGiB: number }[]>([]);
    const [selectedRegion, setSelectedRegion] = useState<string>("");
    const [selectedInstance, setSelectedInstance] = useState<string>("");
    const [price, setPrice] = useState("-");

    const [loadingPrice, setLoadingPrice] = useState(false);
    const [loadingInstances, setLoadingInstances] = useState(false);
    const [regionsError, setRegionsError] = useState("");
    const [instancesError, setInstancesError] = useState("");

    // loader state (replaces old modal)
    const [creating, setCreating] = useState(false);
    const regionsAbortRef = useRef<AbortController | null>(null);
    const instancesAbortRef = useRef<AbortController | null>(null);
    const priceAbortRef = useRef<AbortController | null>(null);

    // redux values
    const vcpu = useSelector((store: RootState) => store.form.vcpu);
    const ramGB = useSelector((store: RootState) => store.form.ramGB);

    useEffect(() => {
        getRegions();
    }, []);

    useEffect(() => {
        return () => {
            regionsAbortRef.current?.abort();
            instancesAbortRef.current?.abort();
            priceAbortRef.current?.abort();
        };
    }, []);

    // Reset instance + price on vcpu/ram changes (same UX as GCP)
    useEffect(() => {
        setSelectedInstance("");
        setPrice("-");
        setInstances([]);
        if (selectedRegion) getInstances(selectedRegion);
    }, [vcpu, ramGB]);

    const getRegions = async () => {
        const controller = new AbortController();
        regionsAbortRef.current?.abort();
        regionsAbortRef.current = controller;

        try {
            setRegionsError("");
            const resp = await fetch(`${BASE_URL}/aws/regions`, { signal: controller.signal });
            const data = await resp.json();
            if (regionsAbortRef.current === controller) {
                setRegions(data?.regions ?? []);
            }
        } catch (err) {
            if (controller.signal.aborted) return;
            console.error("Failed to load regions", err);
            setRegions([]);
            setRegionsError("Failed to load regions.");
        }
    };

    const getInstances = async (region: string) => {
        const controller = new AbortController();
        instancesAbortRef.current?.abort();
        instancesAbortRef.current = controller;

        try {
            setLoadingInstances(true);
            setInstancesError("");
            const resp = await fetch(
                `${BASE_URL}/aws/instance-types?region=${region}&vcpu=${vcpu}&ram_gb=${ramGB}`,
                { signal: controller.signal }
            );
            const data = await resp.json();
            if (instancesAbortRef.current === controller) {
                setInstances(data?.items ?? []);
            }
        } catch (err) {
            if (controller.signal.aborted) return;
            console.error("Failed to load instances", err);
            setInstances([]);
            setInstancesError("Failed to load instance types.");
        } finally {
            if (instancesAbortRef.current === controller) {
                setLoadingInstances(false);
            }
        }
    };

    const fetchPrice = async (region: string, instanceType: string) => {
        const controller = new AbortController();
        priceAbortRef.current?.abort();
        priceAbortRef.current = controller;

        try {
            setLoadingPrice(true);
            const res = await fetch(
                `${BASE_URL}/aws/price?region=${region}&instance_type=${instanceType}`,
                { signal: controller.signal }
            );
            const data = await res.json();
            if (priceAbortRef.current === controller) {
                if (data.ok) setPrice(`${data.monthlyUSD} USD/Monthly`);
                else setPrice("-");
            }
        } catch (err) {
            if (controller.signal.aborted) return;
            console.error("Error fetching price:", err);
            setPrice("-");
        } finally {
            if (priceAbortRef.current === controller) {
                setLoadingPrice(false);
            }
        }
    };

    const isReady = !!selectedRegion && !!selectedInstance && price !== "-" && !loadingPrice && !loadingInstances;

    // NEW: create and redirect to result page with returned outputs
    const handleCreate = async () => {
        if (!isReady) return;
        setCreating(true);

        try {
            const payload = {
                region: selectedRegion,
                instance_type: selectedInstance,
                vcpu,
                ram_gb: ramGB,
            };

            const res = await fetch(`${BASE_URL}/terraform/aws/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            // hide loader first
            setCreating(false);

            if (res.ok && data.ok) {
                // Navigate to /aws/result and pass payload + outputs via state
                navigate("/aws/result", {
                    state: {
                        region: selectedRegion,
                        instance_type: selectedInstance,
                        vcpu,
                        ram_gb: ramGB,
                        jobId: data.jobId,
                        outputs: data.outputs ?? null,
                        raw: data,
                        createdAt: new Date().toISOString(),
                    },
                });
            } else {
                // Res.ok false or data.ok false -> show error page (redirect with error)
                const error = (data && (data.error || data.detail)) || `HTTP ${res.status}`;
                navigate("/aws/result", {
                    state: {
                        ok: false,
                        error,
                        region: selectedRegion,
                        instance_type: selectedInstance,
                        vcpu,
                        ram_gb: ramGB,
                        createdAt: new Date().toISOString(),
                    },
                });
            }
        } catch (err: unknown) {
            setCreating(false);
            navigate("/aws/result", {
                state: {
                    ok: false,
                    error: err instanceof Error ? err.message : String(err),
                    region: selectedRegion,
                    instance_type: selectedInstance,
                    vcpu,
                    ram_gb: ramGB,
                    createdAt: new Date().toISOString(),
                },
            });
        }
    };

    return (
        <>
            <div className="bg-white shadow-lg rounded-t-2xl p-4 mt-10 w-full max-w-3xl mx-auto border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">AWS</h2>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 items-end">
                    {/* Region */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1 text-center">Region</label>
                        <select
                            className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={selectedRegion}
                            onChange={(e) => {
                                const region = e.target.value;
                                setSelectedRegion(region);
                                getInstances(region);
                                setSelectedInstance("");
                                setPrice("-");
                            }}
                        >
                            <option value="">Select Region</option>
                            {regions.map((region) => (
                                <option key={region} value={region}>
                                    {region}
                                </option>
                            ))}
                        </select>
                        {regionsError && (
                            <div className="mt-1 text-xs text-red-600 flex items-center justify-between gap-2">
                                <span>{regionsError}</span>
                                <button
                                    type="button"
                                    onClick={getRegions}
                                    className="underline"
                                >
                                    Retry
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Instance */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1 text-center">Instance Type</label>
                        <select
                            className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={selectedInstance}
                            onChange={(e) => {
                                const instanceType = e.target.value;
                                setSelectedInstance(instanceType);
                                if (selectedRegion && instanceType) {
                                    fetchPrice(selectedRegion, instanceType);
                                }
                            }}
                        >
                            <option value="">Select Instance</option>
                            {loadingInstances ? (
                                <option disabled>Loading instances...</option>
                            ) : (
                                instances.map((instance) => (
                                    <option key={instance.instanceType} value={instance.instanceType}>
                                        {instance.instanceType}
                                    </option>
                                ))
                            )}
                        </select>
                        {instancesError && (
                            <div className="mt-1 text-xs text-red-600 flex items-center justify-between gap-2">
                                <span>{instancesError}</span>
                                {selectedRegion && (
                                    <button
                                        type="button"
                                        onClick={() => getInstances(selectedRegion)}
                                        className="underline"
                                    >
                                        Retry
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    {/* Price */}
                    <div className="text-center">
                        <label className="block text-sm font-medium text-gray-600 mb-1 text-center">
                            Price
                        </label>
                        <div className="w-full border border-gray-300 py-2 rounded-lg">
                            {loadingPrice ? "Fetching..." : price}
                        </div>
                    </div>

                    {/* Create */}
                    <div className="text-center sm:text-left">
                        <label className="block text-sm font-medium text-gray-600 mb-1 text-center">Action</label>
                        <button
                            disabled={!isReady}
                            onClick={handleCreate}
                            className={`w-full font-semibold py-2 px-4 rounded-lg shadow-sm transition duration-200 ${isReady ? "bg-blue-600 hover:bg-blue-700 text-white" : "bg-gray-300 cursor-not-allowed text-gray-500"
                                }`}
                        >
                            Create Resource
                        </button>
                    </div>
                </div>
            </div>

            {/* Loading overlay while creating */}
            {creating && <LoadingOverlay message="Creating resource… this may take a few minutes." />}
        </>
    );
};

export default ProviderPanel;
