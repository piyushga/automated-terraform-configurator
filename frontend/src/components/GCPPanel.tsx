import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../utils/appStore";
import { updateGcp } from "../utils/cloudSlice";

const GCPPanel = () => {
    const BASE_URL = import.meta.env.VITE_API_BASE_URL;
    const dispatch = useDispatch();

    const [regions, setRegions] = useState<string[]>([]);
    const [instances, setInstances] = useState<{ machineType: string; vcpus: number; memoryGB: number }[]>([]);
    const [selectedRegion, setSelectedRegion] = useState<string>("");
    const [selectedInstance, setSelectedInstance] = useState<string>("");
    const [price, setPrice] = useState("-");
    const [loadingPrice, setLoadingPrice] = useState(false);
    const [loadingInstances, setLoadingInstances] = useState(false);

    const vcpu = useSelector((store: RootState) => store.form.vcpu);
    const ramGB = useSelector((store: RootState) => store.form.ramGB);

    useEffect(() => { getRegions(); }, []);

    const getRegions = async () => {
        try {
            const resp = await fetch(`${BASE_URL}/gcp/regions`);
            const data = await resp.json();
            setRegions(data?.regions ?? []);
        } catch (err) {
            console.error("Failed to load GCP regions", err);
        }
    };

    const getInstances = async (region: string) => {
        try {
            setLoadingInstances(true);
            const resp = await fetch(`${BASE_URL}/gcp/instance-types?region=${region}&vcpu=${vcpu}&ram_gb=${ramGB}`);
            const data = await resp.json();
            setInstances(data?.items ?? []);
        } catch (err) {
            console.error("Failed to load GCP instances", err);
            setInstances([]);
        } finally {
            setLoadingInstances(false);
        }
    };

    // ✅ NEW — Reset instance + price when vCPU or RAM changes
    useEffect(() => {
        if (!selectedRegion) return;

        setSelectedInstance("");
        setPrice("-");
        setInstances([]);
        dispatch(updateGcp({ instance: "", price: null }));

        getInstances(selectedRegion); // reload instance list
    }, [vcpu, ramGB]); // ✅ watches form changes

    const fetchPrice = async (region: string, machineType: string) => {
        try {
            setLoadingPrice(true);
            const res = await fetch(`${BASE_URL}/gcp/price?region=${region}&machine_type=${machineType}&vcpus=${vcpu}&ram_gb=${ramGB}`);
            const data = await res.json();
            if (data.ok) {
                const numeric = Number(data.monthlyUSD);
                setPrice(`${numeric} USD/Monthly`);
                dispatch(updateGcp({ price: Number.isFinite(numeric) ? numeric : null }));
            } else {
                setPrice("-");
                dispatch(updateGcp({ price: null }));
            }
        } catch (err) {
            console.error("Error fetching GCP price:", err);
            setPrice("-");
            dispatch(updateGcp({ price: null }));
        } finally {
            setLoadingPrice(false);
        }
    };

    return (
        <div className="bg-white shadow-lg p-6 w-full max-w-4xl mx-auto border border-gray-100">
            <h2 className="text-xl font-semibold text-gray-800 mb-6 text-center">GCP Configuration</h2>

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
                            dispatch(updateGcp({ region, instance: "", price: null }));
                            getInstances(region);
                            setSelectedInstance("");
                            setPrice("-");
                        }}
                    >
                        <option value="">Select Region</option>
                        {regions.map((region) => (
                            <option key={region} value={region}>{region}</option>
                        ))}
                    </select>
                </div>

                {/* Machine Type */}
                <div>
                    <label className="block text-sm font-medium text-gray-600 mb-1 text-center">Machine Type</label>
                    <select
                        className="w-full border border-gray-300 rounded-lg py-2 px-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={selectedInstance}
                        onChange={(e) => {
                            const mt = e.target.value;
                            setSelectedInstance(mt);
                            dispatch(updateGcp({ instance: mt, price: null }));
                            if (selectedRegion && mt) fetchPrice(selectedRegion, mt);
                        }}
                    >
                        <option value="">Select Machine</option>
                        {loadingInstances
                            ? <option disabled>Loading...</option>
                            : instances.map((i) => (
                                <option key={i.machineType} value={i.machineType}>
                                    {i.machineType}
                                </option>
                            ))
                        }
                    </select>
                </div>

                {/* Price */}
                <div className="text-center sm:text-left">
                    <label className="block text-sm font-medium text-gray-600 mb-1 text-center">Price</label>
                    <button className="w-full border border-gray-300 text-gray-600 font-semibold py-2 px-4 rounded-lg">
                        {loadingPrice ? "Fetching..." : price}
                    </button>
                </div>

                {/* Action */}
                <div className="text-center sm:text-left">
                    <label className="block text-sm font-medium text-gray-600 mb-1 text-center">Action</label>
                    <button
                        disabled={!selectedRegion || !selectedInstance || price === "-"}
                        className={`w-full font-semibold py-2 px-4 rounded-lg shadow-sm transition duration-200 
                            ${!selectedRegion || !selectedInstance || price === "-"
                                ? "bg-gray-300 cursor-not-allowed text-gray-500"
                                : "bg-blue-600 hover:bg-blue-700 text-white"}`}
                    >
                        Create Resource
                    </button>
                </div>
            </div>
        </div>
    );
};

export default GCPPanel;
