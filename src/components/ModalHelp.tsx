import type { ReactNode } from "react";

interface ModalHelpProps {
    open: boolean;
    onClose: () => void;
    title: string;
    bgColor?: string;
    titleColor?: string;
    buttonColor?: string;
    maxWidth?: string;
    children: ReactNode;
}

export default function ModalHelp({
    open,
    onClose,
    title,
    bgColor = "#111827",
    titleColor = "#ffffff",
    buttonColor = "bg-indigo-500 hover:bg-indigo-400",
    maxWidth = "max-w-2xl",
    children,
}: ModalHelpProps) {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm"
            onClick={onClose}
        >
            <div
                className={`border border-white/20 rounded-2xl ${maxWidth} w-[90%] p-6 shadow-2xl`}
                style={{ backgroundColor: bgColor }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold" style={{ color: titleColor }}>{title}</h2>
                    <button
                        onClick={onClose}
                        className="w-8 h-8 rounded-full bg-white/10 text-white/70 flex items-center justify-center hover:bg-white/20 transition-all"
                    >
                        ✕
                    </button>
                </div>

                {children}

                <button
                    onClick={onClose}
                    className={`mt-5 w-full py-2.5 rounded-xl text-white font-bold text-sm active:scale-95 transition-all ${buttonColor}`}
                >
                    Entendido
                </button>
            </div>
        </div>
    );
}
