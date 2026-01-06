
import React, { useState } from "react";
import { useDispatch } from "react-redux";
import { vcpuGB, ramGB, storageGB } from "../utils/formSlice";


const CommonForm: React.FC = () => {
  const [vcpu, setVcpu] = useState("");
  const [memory, setMemory] = useState("");
  const [storage, setStorage] = useState("");
  const dispatch = useDispatch();

  return (
    <div className="bg-white shadow-md rounded-xl p-6 mt-10 w-full max-w-3xl">
      <h2 className="text-xl font-semibold mb-4 text-gray-700 text-center">
        Configure Your Resources
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* vCPU */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            vCPUs
          </label>
          <select
            value={vcpu}
            onChange={(e) => {
              const value = e.target.value;
              setVcpu(value);
              dispatch(vcpuGB(Number(value)));

            }}
            className="w-full border border-gray-300 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {/* <option value="">Select vCPUs</option> */}
            {[1, 2, 4, 8, 16].map((num) => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>

        {/* Memory */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Memory (GB)
          </label>
          <select
            value={memory}
            onChange={(e) => {
              const value = e.target.value;
              setMemory(value);
              dispatch(ramGB(Number(value)));
            }}
            className="w-full border border-gray-300 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700"

          >
            {/* <option value="">Select RAM</option> */}
            {[1, 2, 4, 8, 16, 32, 64].map((num) => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>

        {/* Storage */}
        {/* <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Storage (GB)
          </label>
          <select
            value={storage}
            onChange={(e) =>{ 
                const value = e.target.value;               
                 setStorage(value)
                 dispatch(storageGB(Number(value)));
         }}
            className="w-full border border-gray-300 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">Select</option>
            {[10, 20].map((num) => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div> */}
      </div>
    </div>
  );
};

export default CommonForm;
