import React from "react";

type Props = { open: boolean; onClose: () => void; title?: string; children: React.ReactNode; };

export default function Modal({ open, onClose, title, children }: Props) {
    if (!open) return null;
    return (
        <div className=" fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/40" onClick={onClose} />
            <div className="relative z-10 w-full max-w-md rounded-xl bg-white shadow-xl p-5">
                {title && <h3 className="text-lg font-semibold text-gray-800 mb-3">{title}</h3>}
                {children}
            </div>
        </div>
    );
}
