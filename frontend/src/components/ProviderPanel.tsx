import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import type { RootState } from "../utils/appStore";

const ProviderPanel = () => {
    const BASE_URL = import.meta.env.VITE_API_BASE_URL;

    const [regions, setRegions] = useState<string[]>([]);
    const [instances, setInstances] = useState<{ instanceType: string; vcpus: number; memoryGiB: number }[]>([]);
    const [selectedRegion, setSelectedRegion] = useState<string>("");
    const [selectedInstance, setSelectedInstance] = useState<string>("");
    const [price, setPrice] = useState("-");
    const [loadingPrice, setLoadingPrice] = useState(false);
    const [loadingInstances, setLoadingInstances] = useState(false);

    // redux values (same as GCP)
    const vcpu = useSelector((store: RootState) => store.form.vcpu);
    const ramGB = useSelector((store: RootState) => store.form.ramGB);

    // Load AWS regions on mount
    useEffect(() => {
        getRegions();
    }, []);

    // Reset Instance + Price when common form changes (just like GCP)
    useEffect(() => {
        setSelectedInstance("");
        setPrice("-");
        setInstances([]);     // clear old instance list
        if (selectedRegion) {
            getInstances(selectedRegion);
        }
    }, [vcpu, ramGB]);

    const getRegions = async () => {
        try {
            const resp = await fetch(`${BASE_URL}/aws/regions`);
            const data = await resp.json();
            setRegions(data?.regions ?? []);
        } catch (err) {
            console.error("Failed to load regions", err);
            setRegions([]);
        }
    };

    const getInstances = async (region: string) => {
        try {
            setLoadingInstances(true);
            const resp = await fetch(`${BASE_URL}/aws/instance-types?region=${region}&vcpu=${vcpu}&ram_gb=${ramGB}`);
            const data = await resp.json();
            setInstances(data?.items ?? []);
        } catch (err) {
            console.error("Failed to load instances", err);
            setInstances([]);
        } finally {
            setLoadingInstances(false);
        }
    };

    const fetchPrice = async (region: string, instanceType: string) => {
        try {
            setLoadingPrice(true);
            const res = await fetch(`${BASE_URL}/aws/price?region=${region}&instance_type=${instanceType}`);
            const data = await res.json();
            if (data.ok) {
                setPrice(`${data.monthlyUSD} USD/Monthly`);
            } else {
                setPrice("-");
            }
        } catch (err) {
            console.error("Error fetching price:", err);
            setPrice("-");
        } finally {
            setLoadingPrice(false);
        }
    };

    // Enable create button only when everything is selected (same as GCP)
    const isReady =
        selectedRegion &&
        selectedInstance &&
        price !== "-" &&
        !loadingPrice &&
        !loadingInstances;

    return (
        <div className="bg-white shadow-lg rounded-t-2xl p-6 mt-10 w-full max-w-4xl mx-auto border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">
                AWS Configuration
            </h2>

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
                            <option disabled>Loading...</option>
                        ) : (
                            instances.map((i) => (
                                <option key={i.instanceType} value={i.instanceType}>
                                    {i.instanceType}
                                </option>
                            ))
                        )}
                    </select>
                </div>

                {/* Price */}
                <div className="text-center sm:text-left">
                    <label className="block text-sm font-medium text-gray-600 mb-1 text-center">Price</label>
                    <button className="w-full border border-gray-300 text-gray-600 font-semibold py-2 px-4 rounded-lg">
                        {loadingPrice ? "Fetching price..." : price}
                    </button>
                </div>

                {/* Create button with same behavior as GCP */}
                <div className="text-center sm:text-left">
                    <label className="block text-sm font-medium text-gray-600 mb-1 text-center">Action</label>
                    <button
                        disabled={!isReady}
                        className={`w-full font-semibold py-2 px-4 rounded-lg shadow-sm transition duration-200 
                            ${isReady
                                ? "bg-blue-600 hover:bg-blue-700 text-white"
                                : "bg-gray-300 cursor-not-allowed text-gray-500"
                            }
                        `}
                    >
                        Create Resource
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ProviderPanel;
