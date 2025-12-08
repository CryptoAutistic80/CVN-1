"use client";

import { useState, useEffect } from "react";

interface VaultBalance {
    faMetadataAddr: string;
    balance: bigint;
    symbol: string;
}

interface VaultDisplayProps {
    nftAddress: string;
}

// Mock data for demo - would query from Cedra GraphQL
const mockBalances: VaultBalance[] = [
    { faMetadataAddr: "0xced...", balance: BigInt(50000000), symbol: "CEDRA" },
];

export default function VaultDisplay({ nftAddress }: VaultDisplayProps) {
    const [balances, setBalances] = useState<VaultBalance[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Simulate API call
        const timer = setTimeout(() => {
            setBalances(mockBalances);
            setLoading(false);
        }, 1000);
        return () => clearTimeout(timer);
    }, [nftAddress]);

    if (loading) {
        return (
            <div className="animate-pulse bg-gray-800/50 rounded-xl p-6">
                <div className="h-6 bg-gray-700 rounded w-1/3 mb-4"></div>
                <div className="h-10 bg-gray-700 rounded"></div>
            </div>
        );
    }

    const totalValue = balances.reduce((sum, b) => sum + b.balance, BigInt(0));

    return (
        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                <span>💰</span>
                Vault Contents
            </h3>

            {balances.length === 0 ? (
                <div className="text-gray-400 text-center py-8">
                    <span className="text-4xl mb-2 block">🏦</span>
                    <p>Vault is empty</p>
                    <p className="text-sm mt-1">Deposit tokens to add value</p>
                </div>
            ) : (
                <>
                    {/* Total value */}
                    <div className="bg-gradient-to-r from-purple-500/20 to-pink-500/20 rounded-lg p-4 mb-4">
                        <div className="text-sm text-gray-400 mb-1">Total Value</div>
                        <div className="text-2xl font-bold text-white">
                            {(Number(totalValue) / 1e8).toFixed(2)} CEDRA
                        </div>
                    </div>

                    {/* Individual balances */}
                    <div className="space-y-2">
                        {balances.map((balance) => (
                            <div
                                key={balance.faMetadataAddr}
                                className="flex items-center justify-between bg-gray-900/50 rounded-lg p-3"
                            >
                                <span className="text-gray-400">{balance.symbol}</span>
                                <span className="text-white font-mono">
                                    {(Number(balance.balance) / 1e8).toFixed(2)}
                                </span>
                            </div>
                        ))}
                    </div>
                </>
            )}

            {/* Actions */}
            <div className="mt-6 grid grid-cols-2 gap-3">
                <button className="py-2 px-4 rounded-lg bg-gray-700 hover:bg-gray-600 text-white text-sm transition-colors">
                    Deposit
                </button>
                <button className="py-2 px-4 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-400 text-sm transition-colors">
                    Burn & Redeem
                </button>
            </div>
        </div>
    );
}
