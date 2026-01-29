import { useAccount, useConnect, useDisconnect } from 'wagmi';
import { useIsMounted } from '../hooks/useIsMounted';

export function WalletConnect() {
    const isMounted = useIsMounted();
    const { address, isConnected } = useAccount();
    const { connectors, connect } = useConnect();
    const { disconnect } = useDisconnect();

    if (!isMounted) return null;

    if (isConnected) {
        return (
            <div className="flex items-center gap-4">
                <span className="text-sm font-medium text-gray-700">
                    {address?.slice(0, 6)}...{address?.slice(-4)}
                </span>
                <button
                    onClick={() => disconnect()}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 transition-colors"
                >
                    Disconnect
                </button>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2">
            {connectors
                .filter((connector) => connector.name === 'MetaMask')
                .map((connector) => (
                    <button
                        key={connector.uid}
                        onClick={() => connect({ connector })}
                        className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-colors shadow-sm text-nowrap"
                    >
                        Connect {connector.name}
                    </button>
                ))}
        </div>
    );
}
