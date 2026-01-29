import { useState } from 'react';
import { useAccount } from 'wagmi';
import { useIsMounted } from '../hooks/useIsMounted';

export function SwapInterface() {
    const isMounted = useIsMounted();
    const { isConnected } = useAccount();
    const [sellAmount, setSellAmount] = useState('');
    const [buyAmount, setBuyAmount] = useState('');

    // Mock conversion for display only
    const handleSellChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        setSellAmount(val);
        setBuyAmount(val ? (parseFloat(val) * 1.5).toString() : ''); // Mock rate
    };

    return (
        <div className="w-full max-w-md p-6 bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Swap</h2>
                <span className="text-sm text-gray-500">Slippage 0.5%</span>
            </div>

            <div className="space-y-4">
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">You Pay</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={sellAmount}
                            onChange={handleSellChange}
                            placeholder="0.0"
                            className="w-full bg-transparent text-2xl font-bold text-gray-900 outline-none placeholder:text-gray-300"
                        />
                        <button className="bg-white hover:bg-gray-50 text-gray-900 font-semibold py-1.5 px-3 rounded-full shadow-sm border border-gray-200 text-sm flex items-center gap-1 transition-colors">
                            <span className="w-5 h-5 rounded-full bg-blue-500 block"></span>
                            ETH
                        </button>
                    </div>
                </div>

                <div className="flex justify-center -my-3 relative z-10">
                    <div className="bg-white rounded-full p-2 shadow-sm border border-gray-100 hover:rotate-180 transition-transform cursor-pointer">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                    </div>
                </div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">You Receive</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={buyAmount}
                            readOnly
                            placeholder="0.0"
                            className="w-full bg-transparent text-2xl font-bold text-gray-900 outline-none placeholder:text-gray-300"
                        />
                        <button className="bg-white hover:bg-gray-50 text-gray-900 font-semibold py-1.5 px-3 rounded-full shadow-sm border border-gray-200 text-sm flex items-center gap-1 transition-colors">
                            <span className="w-5 h-5 rounded-full bg-purple-500 block"></span>
                            USDC
                        </button>
                    </div>
                </div>

                <button
                    disabled={!isMounted || !isConnected}
                    className={`w-full py-4 text-lg font-bold text-white rounded-xl shadow-md transition-all transform active:scale-[0.98] ${isMounted && isConnected
                        ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25'
                        : 'bg-gray-300 cursor-not-allowed text-gray-500'
                        }`}
                >
                    {isMounted && isConnected ? 'Swap' : 'Connect Wallet to Swap'}
                </button>
            </div>
            {isMounted && isConnected && (
                <div className="mt-4 p-3 bg-blue-50 rounded-lg text-sm text-blue-700 flex justify-between items-center">
                    <span>Rate</span>
                    <span className="font-semibold">1 ETH = 1,500 USDC</span>
                </div>
            )}
        </div>
    );
}
