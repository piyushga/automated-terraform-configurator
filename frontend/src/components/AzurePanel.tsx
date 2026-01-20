import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import type { RootState } from "../utils/appStore";
import LoadingOverlay from "./LoadingOverlay";

const AzurePanel = () => {
    const BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const navigate = useNavigate();

    const [regions, setRegions] = useState<string[]>([]);
    const [instances, setInstances] = useState<
        { instanceType: string; vcpus: number; memoryGiB: number }[]
    >([]);

    const [selectedRegion, setSelectedRegion] = useState("");
    const [selectedInstance, setSelectedInstance] = useState("");
    const [price, setPrice] = useState("-");

    const [loadingInstances, setLoadingInstances] = useState(false);
    const [loadingPrice, setLoadingPrice] = useState(false);
    const [creating, setCreating] = useState(false);

    const vcpu = useSelector((store: RootState) => store.form.vcpu);
    const ramGB = useSelector((store: RootState) => store.form.ramGB);

    useEffect(() => {
        getRegions();
    }, []);

    useEffect(() => {
        setSelectedInstance("");
        setPrice("-");
        setInstances([]);
        if (selectedRegion) getInstances(selectedRegion);
    }, [vcpu, ramGB]);

    const getRegions = async () => {
        try {
            const res = await fetch(`${BASE_URL}/azure/regions`);
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
                `${BASE_URL}/azure/instance-types?region=${region}&vcpu=${vcpu}&ram_gb=${ramGB}`
            );
            const data = await res.json();
            setInstances(data?.items ?? []);
        } catch {
            setInstances([]);
        } finally {
            setLoadingInstances(false);
        }
    };

    const fetchPrice = async (region: string, vmSize: string) => {
        try {
            setLoadingPrice(true);
            const res = await fetch(
                `${BASE_URL}/azure/price?region=${region}&vm_size=${vmSize}`
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
            const res = await fetch(`${BASE_URL}/terraform/azure/create`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    region: selectedRegion,
                    instance_type: selectedInstance
                }),
            });

            const data = await res.json();
            setCreating(false);

            navigate("/azure/result", {
                state: {
                    ok: res.ok && data.ok,
                    region: selectedRegion,
                    instanceType: selectedInstance,
                    vcpu,
                    ramGB,
                    jobId: data.jobId,
                    outputs: data.outputs,
                    createdAt: new Date().toISOString()
                },
            });
        } catch (err: any) {
            setCreating(false);
            navigate("/azure/result", {
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
            <div className="bg-white shadow-lg rounded-t-2xl p-6 mt-10 w-full max-w-4xl mx-auto border border-gray-100">
                <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
                    Azure Configuration
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
                            VM Size
                        </label>
                        <select
                            className="w-full border border-gray-300 rounded-lg py-2 px-3"
                            value={selectedInstance}
                            onChange={(e) => {
                                const vm = e.target.value;
                                setSelectedInstance(vm);
                                if (selectedRegion && vm) {
                                    fetchPrice(selectedRegion, vm);
                                }
                            }}
                        >
                            <option value="">Select VM</option>
                            {loadingInstances
                                ? <option disabled>Loading...</option>
                                : instances.map((i) => (
                                    <option key={i.instanceType} value={i.instanceType}>
                                        {i.instanceType}
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

export default AzurePanel;

