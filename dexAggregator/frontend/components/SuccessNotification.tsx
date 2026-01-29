import { useEffect } from 'react';

interface SuccessNotificationProps {
    txHash: string;
    onClose: () => void;
}

export function SuccessNotification({ txHash, onClose }: SuccessNotificationProps) {
    useEffect(() => {
        const timer = setTimeout(onClose, 10000); // Auto close after 10s
        return () => clearTimeout(timer);
    }, [onClose]);

    return (
        <div className="fixed bottom-4 right-4 z-50 animate-slide-up">
            <div className="bg-white rounded-xl shadow-2xl border border-green-100 p-4 max-w-sm flex items-start gap-3">
                <div className="flex-shrink-0 bg-green-100 p-2 rounded-full">
                    <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-gray-900">Transaction Submitted!</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Your swap has been submitted to the network.
                    </p>
                    <a
                        href={`https://sepolia.etherscan.io/tx/${txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-sm font-semibold text-blue-600 hover:text-blue-700 mt-2 group"
                    >
                        View on Etherscan
                        <svg className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                    </a>
                </div>
                <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>
        </div>
    );
}
