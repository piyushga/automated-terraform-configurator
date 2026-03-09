import React from "react";
import { useDispatch, useSelector } from "react-redux";
import { vcpuGB, ramGB, storageGB } from "../utils/formSlice";
import type { RootState } from "../utils/appStore";


const CommonForm: React.FC = () => {
  const dispatch = useDispatch();
  const { vcpu, ramGB: memory, storageGB: storage } = useSelector(
    (store: RootState) => store.form
  );

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
              dispatch(vcpuGB(Number(e.target.value)));

            }}
            className="w-full border border-gray-300 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
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
              dispatch(ramGB(Number(e.target.value)));
            }}
            className="w-full border border-gray-300 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-gray-700"

          >

            {[1, 2, 4, 8, 16, 32, 64].map((num) => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>

        {/* Storage */}
        <div>
          <label className="block text-sm font-medium text-gray-600 mb-1">
            Storage (GB)
          </label>
          <select
            value={storage}
            onChange={(e) => {
              dispatch(storageGB(Number(e.target.value)));
            }}
            className="w-full border border-gray-300 rounded-lg py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {[30].map((num) => (
              <option key={num} value={num}>{num}</option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
};

export default CommonForm;
