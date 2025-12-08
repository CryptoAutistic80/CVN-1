"use client";

import { useWallet } from "@/components/wallet-provider";

export function ConnectButton() {
    const { connect, disconnect, connected, connecting, account, wallets } = useWallet();

    if (connected && account) {
        return (
            <button
                onClick={() => disconnect()}
                className="flex items-center gap-2 px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm transition-colors"
            >
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                {account.address?.toString().slice(0, 6)}...{account.address?.toString().slice(-4)}
            </button>
        );
    }

    if (connecting) {
        return (
            <button
                disabled
                className="px-4 py-2 bg-gray-700 rounded-lg text-gray-400 text-sm"
            >
                Connecting...
            </button>
        );
    }

    if (wallets.length === 0) {
        return (
            <a
                href="https://chromewebstore.google.com/detail/zedra-wallet/pbeefngmcchkcibdodceimammkigfanl"
                target="_blank"
                rel="noopener noreferrer"
                className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
            >
                Install Zedra Wallet
            </a>
        );
    }

    return (
        <div className="flex gap-2">
            {wallets.map((w) => (
                <button
                    key={w.name}
                    onClick={() => connect(w.name)}
                    className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white text-sm font-medium hover:opacity-90 transition-opacity"
                >
                    {w.icon && (
                        <img
                            src={w.icon}
                            alt={w.name}
                            className="w-5 h-5 rounded"
                        />
                    )}
                    Connect {w.name}
                </button>
            ))}
        </div>
    );
}
