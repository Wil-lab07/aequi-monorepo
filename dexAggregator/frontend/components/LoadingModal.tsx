
interface LoadingModalProps {
    isOpen: boolean;
    status: 'confirming' | 'processing';
}

export function LoadingModal({ isOpen, status }: LoadingModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full mx-4 text-center">
                {/* Simple Spinner */}
                <div className="w-12 h-12 border-4 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4"></div>

                <h3 className="text-lg font-bold text-gray-800">
                    {status === 'confirming' ? 'Confirm Request' : 'Processing...'}
                </h3>
                <p className="text-gray-500 text-sm mt-1">
                    {status === 'confirming'
                        ? 'Check your wallet...'
                        : 'Waiting for blockchain confirmation'}
                </p>
            </div>
        </div>
    );
}
