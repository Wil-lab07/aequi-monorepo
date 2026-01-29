import { useState, useEffect } from 'react';
import { formatUnits } from 'viem';
import { useAccount } from 'wagmi';
import { useIsMounted } from '../hooks/useIsMounted';
import { useTokens, Token } from '../hooks/useTokens';
import { useQuote } from '../hooks/useQuote';
import { useDebounce } from '../hooks/useDebounce';

import { useTokenAllowance } from '../hooks/useTokenAllowance';

export function SwapInterface() {
    const isMounted = useIsMounted();
    const { isConnected, chainId, address } = useAccount();
    const { data: tokens } = useTokens(chainId);

    const [sellAmount, setSellAmount] = useState('');
    const debouncedSellAmount = useDebounce(sellAmount, 500);

    const [buyAmount, setBuyAmount] = useState('');
    const [sellToken, setSellToken] = useState<Token | null>(null);
    const [buyToken, setBuyToken] = useState<Token | null>(null);
    const [showOffers, setShowOffers] = useState(false);

    // Set default tokens when loaded
    useEffect(() => {
        if (tokens && tokens.length >= 2) {
            if (!sellToken) setSellToken(tokens[0]);
            if (!buyToken) setBuyToken(tokens[1]);
        }
    }, [tokens]);

    // Fetch Quote
    const { data: quoteData, isLoading: isQuoteLoading, error: quoteError } = useQuote({
        chain: 'sepolia',
        tokenA: sellToken?.address || '',
        tokenB: buyToken?.address || '',
        amount: debouncedSellAmount,
        recipient: address || '',
    }, !!(isConnected && sellToken && buyToken && debouncedSellAmount && parseFloat(debouncedSellAmount) > 0 && address));

    // Allowance Check
    const spender = quoteData?.transaction?.spender;
    const amountIn = quoteData?.transaction?.amountIn;
    // Assume ETH is Native (symbol 'ETH' or address ending in 'eee' depending on config, but symbol is safer for frontend display checks usually)
    // Actually, asking backend might be better, but standard convention:
    const isNative = sellToken?.symbol === 'ETH'; // Simple check for Sepolia

    const { allowance, approve, isApproving, isApproved } = useTokenAllowance(
        isNative ? undefined : sellToken?.address,
        address,
        spender
    );

    const needsApproval = !isNative && isConnected && quoteData && allowance !== undefined && amountIn && allowance < BigInt(amountIn);

    // Update UI with calculated amount output - ONLY IF Approved or Native
    useEffect(() => {
        if (!debouncedSellAmount) {
            setBuyAmount('');
            return;
        }

        if (quoteData && quoteData.amountOutMinFormatted) {
            if (needsApproval) {
                setBuyAmount('---'); // Hide amount if approval needed
            } else {
                setBuyAmount(parseFloat(quoteData.amountOutMinFormatted).toFixed(6));
            }
        }
    }, [quoteData, debouncedSellAmount, needsApproval]);

    const handleSellChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value;
        if (parseFloat(val) < 0) return;
        setSellAmount(val);
    };

    const handleApprove = async () => {
        if (approve) await approve();
    };

    return (
        <div className="w-full max-w-md p-6 bg-white rounded-xl shadow-lg border border-gray-100">
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-bold text-gray-800">Swap</h2>
                <span className="text-sm text-gray-500">Slippage 0.5%</span>
            </div>

            <div className="space-y-4">
                {/* Sell Input */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">You Pay</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="number"
                            value={sellAmount}
                            onChange={handleSellChange}
                            placeholder="0.0"
                            className="w-full bg-transparent text-2xl font-bold text-gray-900 outline-none placeholder:text-gray-300 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        {tokens ? (
                            <select
                                value={sellToken?.symbol || ''}
                                onChange={(e) => setSellToken(tokens.find(t => t.symbol === e.target.value) || null)}
                                className="bg-white hover:bg-gray-50 text-gray-900 font-semibold py-1.5 px-2 rounded-lg shadow-sm border border-gray-200 text-sm outline-none cursor-pointer"
                            >
                                {tokens.map(t => <option key={t.address} value={t.symbol}>{t.symbol}</option>)}
                            </select>
                        ) : (
                            <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
                        )}
                    </div>
                </div>

                <div className="flex justify-center -my-3 relative z-10">
                    <div className="bg-white rounded-full p-2 shadow-sm border border-gray-100 hover:rotate-180 transition-transform cursor-pointer">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-500"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
                    </div>
                </div>

                {/* Buy Input */}
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-transparent transition-all">
                    <label className="block text-xs font-semibold text-gray-500 mb-1 uppercase tracking-wide">You Receive</label>
                    <div className="flex items-center gap-2">
                        <input
                            type="text" // Changed to text to support '---'
                            value={buyAmount}
                            readOnly
                            placeholder="0.0"
                            className={`w-full bg-transparent text-2xl font-bold outline-none placeholder:text-gray-300 ${isQuoteLoading ? 'animate-pulse text-gray-400' : 'text-gray-900'}`}
                        />
                        {tokens ? (
                            <select
                                value={buyToken?.symbol || ''}
                                onChange={(e) => setBuyToken(tokens.find(t => t.symbol === e.target.value) || null)}
                                className="bg-white hover:bg-gray-50 text-gray-900 font-semibold py-1.5 px-2 rounded-lg shadow-sm border border-gray-200 text-sm outline-none cursor-pointer"
                            >
                                {tokens.map(t => <option key={t.address} value={t.symbol}>{t.symbol}</option>)}
                            </select>
                        ) : (
                            <div className="w-16 h-8 bg-gray-200 rounded animate-pulse"></div>
                        )}
                    </div>
                </div>

                {/* Action Button */}
                {needsApproval ? (
                    <button
                        onClick={handleApprove}
                        disabled={isApproving}
                        className="w-full py-4 text-lg font-bold text-white rounded-xl shadow-md transition-all transform active:scale-[0.98] bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 shadow-orange-500/25"
                    >
                        {isApproving ? 'Approving...' : `Approve ${sellToken?.symbol}`}
                    </button>
                ) : (
                    <button
                        disabled={!isMounted || !isConnected || isQuoteLoading || !!quoteError || needsApproval}
                        className={`w-full py-4 text-lg font-bold text-white rounded-xl shadow-md transition-all transform active:scale-[0.98] ${isMounted && isConnected && !quoteError
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 shadow-blue-500/25'
                            : 'bg-gray-300 cursor-not-allowed text-gray-500'
                            }`}
                    >
                        {isQuoteLoading ? 'Fetching Quote...' : (quoteError ? 'No Route / Error' : (isMounted && isConnected ? 'Swap' : 'Connect Wallet to Swap'))}
                    </button>
                )}
            </div>

            {/* Info Section - Always show if we have data */}
            {isMounted && isConnected && sellToken && buyToken && quoteData && (
                <div className="mt-6 space-y-6">
                    {/* Routing Path */}
                    <div className="p-4 bg-gray-900 rounded-xl border border-gray-800 shadow-sm">
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Routing Path</h3>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-white">
                            {quoteData.quote.sources.map((source: any, i: number) => {
                                const version = quoteData.quote.hopVersions ? quoteData.quote.hopVersions[i] : (source.feeTier ? 'v3' : 'v2');
                                return (
                                    <div key={i} className="flex items-center gap-2">
                                        {/* Token Node */}
                                        <div className="px-3 py-1.5 bg-gray-800 rounded-lg border border-gray-700 font-bold shadow-sm">
                                            {quoteData.quote.path[i]?.symbol}
                                        </div>

                                        {/* Hop Arrow with DEX Info */}
                                        <div className="flex flex-col items-center px-1 group cursor-default relative">
                                            <span className="text-[9px] text-gray-500 uppercase tracking-tight mb-0.5 group-hover:text-blue-400 transition-colors">
                                                {source.dexId} {version}
                                            </span>
                                            <div className="w-12 h-0.5 bg-gradient-to-r from-gray-700 via-gray-500 to-gray-700 relative">
                                                <div className="absolute right-0 -top-1 w-2 h-2 border-t-2 border-r-2 border-gray-500 transform rotate-45"></div>
                                            </div>
                                            {source.feeTier && (
                                                <span className="text-[9px] text-gray-600 mt-0.5 group-hover:text-blue-400 transition-colors">
                                                    {source.feeTier / 10000}%
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                            {/* Final Token Node */}
                            <div className="px-3 py-1.5 bg-gray-800 rounded-lg border border-gray-700 font-bold shadow-sm">
                                {quoteData.quote.path[quoteData.quote.path.length - 1]?.symbol}
                            </div>
                        </div>
                    </div>

                    {/* Dashboard Grid */}
                    <div className="grid grid-cols-2 gap-4">
                        {/* Rate & Spread */}
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Rate & Spread</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">1 {sellToken.symbol} =</span>
                                    <span className="font-medium text-gray-900">
                                        {(Number(formatUnits(BigInt(quoteData.quote.amountOut), buyToken.decimals)) / Number(formatUnits(BigInt(quoteData.quote.amountIn), sellToken.decimals))).toFixed(4)} {buyToken.symbol}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Price Impact</span>
                                    <span className={`font-medium ${quoteData.quote.priceImpactBps > 100 ? 'text-red-500' : 'text-green-600'}`}>
                                        {(quoteData.quote.priceImpactBps / 100).toFixed(2)}%
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Realized Spread</span>
                                    <span className="font-medium text-gray-900">
                                        {/* Calc spread from midPrice vs executionPrice if available, else 0 */}
                                        {quoteData.quote.midPriceQ18 && quoteData.quote.executionPriceQ18
                                            ? ((1 - Number(quoteData.quote.executionPriceQ18) / Number(quoteData.quote.midPriceQ18)) * 100).toFixed(2)
                                            : '0.00'}%
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Network Costs */}
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-3">
                            <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Network Costs</h3>
                            <div className="space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Est. Gas Cost</span>
                                    <span className="font-medium text-gray-900">
                                        {quoteData.quote.estimatedGasCostWei ? formatUnits(BigInt(quoteData.quote.estimatedGasCostWei), 18).substring(0, 8) : '0'} ETH
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Gas Units</span>
                                    <span className="font-medium text-gray-900">
                                        {needsApproval ? 'Approve Needed' : (quoteData.transaction?.estimatedGas || quoteData.quote?.estimatedGasUnits || 'Unknown')}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-500">Gas Price</span>
                                    <span className="font-medium text-gray-900">
                                        {quoteData.quote.gasPriceWei ? formatUnits(BigInt(quoteData.quote.gasPriceWei), 9).substring(0, 4) : '0'} Gwei
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Route Comparison Table */}
                    <div className="border border-gray-200 rounded-xl overflow-hidden">
                        <div className="bg-gray-100 p-3 border-b border-gray-200">
                            <h3 className="text-xs font-bold text-gray-700 uppercase tracking-wider">Route Comparison</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs text-left">
                                <thead className="text-gray-500 bg-gray-50 uppercase font-semibold">
                                    <tr>
                                        <th className="px-3 py-2">Route</th>
                                        <th className="px-3 py-2 text-right">Fee</th>
                                        <th className="px-3 py-2 text-right">Output</th>
                                        <th className="px-3 py-2 text-right">Impact</th>
                                        <th className="px-3 py-2 text-right">Gas</th>
                                        <th className="px-3 py-2 text-center">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {/* Selected Route */}
                                    <tr className="bg-green-50/50">
                                        <td className="px-3 py-2">
                                            <div className="flex flex-col">
                                                <span className="font-bold text-gray-900">{quoteData.quote.sources.map((s: any) => s.dexId).join(' + ')}</span>
                                                <span className="text-[10px] text-gray-500">{quoteData.quote.sources.length} Hop{quoteData.quote.sources.length > 1 ? 's' : ''}</span>
                                            </div>
                                        </td>
                                        <td className="px-3 py-2 text-right text-gray-600">
                                            {quoteData.quote.sources.map((s: any) => s.feeTier ? `${s.feeTier / 10000}%` : 'V2').join(', ')}
                                        </td>
                                        <td className="px-3 py-2 text-right font-medium text-gray-900">
                                            {Number(formatUnits(BigInt(quoteData.quote.amountOut), buyToken.decimals)).toFixed(4)}
                                        </td>
                                        <td className="px-3 py-2 text-right text-gray-600">{(quoteData.quote.priceImpactBps / 100).toFixed(2)}%</td>
                                        <td className="px-3 py-2 text-right text-gray-600">
                                            {quoteData.quote.estimatedGasCostWei ? formatUnits(BigInt(quoteData.quote.estimatedGasCostWei), 18).substring(0, 6) : '0'}
                                        </td>
                                        <td className="px-3 py-2 text-center">
                                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800">
                                                SELECTED
                                            </span>
                                        </td>
                                    </tr>

                                    {/* Other Offers */}
                                    {quoteData.quote.offers && quoteData.quote.offers.map((offer: any, idx: number) => (
                                        <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-3 py-2">
                                                <div className="flex flex-col">
                                                    <span className="font-medium text-gray-700">{offer.sources.map((s: any) => s.dexId).join(' + ')}</span>
                                                    <span className="text-[10px] text-gray-400">{offer.sources.length} Hop{offer.sources.length > 1 ? 's' : ''}</span>
                                                </div>
                                            </td>
                                            <td className="px-3 py-2 text-right text-gray-500">
                                                {offer.sources.map((s: any) => s.feeTier ? `${s.feeTier / 10000}%` : 'V2').join(', ')}
                                            </td>
                                            <td className="px-3 py-2 text-right font-medium text-gray-700">
                                                {Number(formatUnits(BigInt(offer.amountOut), buyToken.decimals)).toFixed(4)}
                                            </td>
                                            <td className="px-3 py-2 text-right text-gray-500">{(offer.priceImpactBps / 100).toFixed(2)}%</td>
                                            <td className="px-3 py-2 text-right text-gray-500">
                                                {offer.estimatedGasCostWei ? formatUnits(BigInt(offer.estimatedGasCostWei), 18).substring(0, 6) : '0'}
                                            </td>
                                            <td className="px-3 py-2 text-center text-[10px] text-gray-400 italic">
                                                {BigInt(offer.amountOut) < BigInt(quoteData.quote.amountOut) ? 'Lower Output' : 'Available'}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* Approval Info Message */}
            {needsApproval && (
                <div className="mt-4 p-3 bg-amber-50 rounded-lg text-sm text-amber-700 text-center">
                    Please approve {sellToken?.symbol} to view swap details.
                </div>
            )}

            {quoteError && (
                <div className="mt-2 text-center text-xs text-red-500">
                    {(quoteError as Error).message}
                </div>
            )}
        </div>
    );
}
