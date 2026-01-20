import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { RootState } from "../utils/appStore";
import LoadingOverlay from "./LoadingOverlay";

const GCPPanel = () => {
    const BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const navigate = useNavigate();

    const [regions, setRegions] = useState<string[]>([]);
    const [instances, setInstances] = useState<
        { machineType: string; vcpus: number; memoryGB: number }[]
    >([]);

    const [selectedRegion, setSelectedRegion] = useState("");
    const [selectedInstance, setSelectedInstance] = useState("");
    const [price, setPrice] = useState("-");

    const [loadingPrice, setLoadingPrice] = useState(false);
    const [loadingInstances, setLoadingInstances] = useState(false);
    const [creating, setCreating] = useState(false);

    const vcpu = useSelector((store: RootState) => store.form.vcpu);
    const ramGB = useSelector((store: RootState) => store.form.ramGB);

    useEffect(() => {
        getRegions();
    }, []);

    // reset instance + price on vcpu / ram change (same UX as AWS)
    useEffect(() => {
        setSelectedInstance("");
        setPrice("-");
        setInstances([]);
        if (selectedRegion) getInstances(selectedRegion);
    }, [vcpu, ramGB]);

    const getRegions = async () => {
        try {
            const res = await fetch(`${BASE_URL}/gcp/regions`);
            const data = await res.json();
            setRegions(data?.regions ?? []);
        } catch {
            setRegions([]);
        }
    };

    const getInstances = async (region: string) => {
        try {
            setLoadingInstances(true);
            const res = await fetch(
                `${BASE_URL}/gcp/instance-types?region=${region}&vcpu=${vcpu}&ram_gb=${ramGB}`
            );
            const data = await res.json();
            setInstances(data?.items ?? []);
        } catch {
            setInstances([]);
        } finally {
            setLoadingInstances(false);
        }
    };

    const fetchPrice = async (region: string, machineType: string) => {
        try {
            setLoadingPrice(true);
            const res = await fetch(
                `${BASE_URL}/gcp/price?region=${region}&machine_type=${machineType}&vcpus=${vcpu}&ram_gb=${ramGB}`
            );
            const data = await res.json();
            if (data.ok) setPrice(`${data.monthlyUSD} USD/Monthly`);
            else setPrice("-");
        } catch {
            setPrice("-");
        } finally {
            setLoadingPrice(false);
        }
    };

    const isReady =
        selectedRegion &&
        selectedInstance &&
        price !== "-" &&
        !loadingPrice &&
        !loadingInstances;

    const handleCreate = async () => {
        if (!isReady) return;
        setCreating(true);

        try {
            const res = await fetch(`${BASE_URL}/terraform/gcp/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    project_id: import.meta.env.VITE_GCP_PROJECT_ID,
                    region: selectedRegion,
                    instance_type: selectedInstance
                }),
            });

            const data = await res.json();
            setCreating(false);

            if (res.ok && data.ok) {
                navigate("/gcp/result", {
                    state: {
                        region: selectedRegion,
                        instanceType: selectedInstance,
                        vcpu,
                        ramGB,
                        jobId: data.jobId,
                        outputs: data.outputs,
                        createdAt: new Date().toISOString()
                    },
                });
            } else {
                navigate("/gcp/result", {
                    state: {
                        ok: false,
                        error: data.error || "Provisioning failed",
                        region: selectedRegion,
                        instanceType: selectedInstance,
                        vcpu,
                        ramGB,
                        createdAt: new Date().toISOString()
                    },
                });
            }
        } catch (err: any) {
            setCreating(false);
            navigate("/gcp/result", {
                state: {
                    ok: false,
                    error: err.message,
                    region: selectedRegion,
                    instanceType: selectedInstance,
                    vcpu,
                    ramGB,
                    createdAt: new Date().toISOString()
                },
            });
        }
    };

    return (
        <>
            <div className="bg-white shadow-lg p-4 w-full max-w-3xl mx-auto border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
                    GCP
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 items-end">
                    {/* Region */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1 text-center">
                            Region
                        </label>
                        <select
                            className="w-full border border-gray-300 rounded-lg py-2 px-3"
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
                            {regions.map((r) => (
                                <option key={r} value={r}>{r}</option>
                            ))}
                        </select>
                    </div>

                    {/* Instance */}
                    <div>
                        <label className="block text-sm font-medium text-gray-600 mb-1 text-center">
                            Machine Type
                        </label>
                        <select
                            className="w-full border border-gray-300 rounded-lg py-2 px-3"
                            value={selectedInstance}
                            onChange={(e) => {
                                const mt = e.target.value;
                                setSelectedInstance(mt);
                                if (selectedRegion && mt) {
                                    fetchPrice(selectedRegion, mt);
                                }
                            }}
                        >
                            <option value="">Select Machine</option>
                            {loadingInstances
                                ? <option disabled>Loading...</option>
                                : instances.map((i) => (
                                    <option key={i.machineType} value={i.machineType}>
                                        {i.machineType}
                                    </option>
                                ))}
                        </select>
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

                    {/* Action */}
                    <div className="text-center">
                        <label className="block text-sm font-medium text-gray-600 mb-1 text-center">
                            Action
                        </label>
                        <button
                            disabled={!isReady}
                            onClick={handleCreate}
                            className={`w-full py-2 rounded-lg font-semibold transition
                                ${isReady
                                    ? "bg-blue-600 hover:bg-blue-700 text-white"
                                    : "bg-gray-300 cursor-not-allowed text-gray-500"
                                }`}
                        >
                            Create Resource
                        </button>
                    </div>
                </div>
            </div>

            {creating && (
                <LoadingOverlay message="Creating resource… this may take a few minutes." />
            )}
        </>
    );
};

export default GCPPanel;
