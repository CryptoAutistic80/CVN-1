"use client";

import { VaultBalance, formatBalance } from "@/lib/cvn1";

interface DualVaultDisplayProps {
    coreBalances: VaultBalance[];
    rewardsBalances: VaultBalance[];
    isOwner?: boolean;
    onClaimRewards?: () => void;
    claiming?: boolean;
}

export function DualVaultDisplay({
    coreBalances,
    rewardsBalances,
    isOwner = false,
    onClaimRewards,
    claiming = false,
}: DualVaultDisplayProps) {
    const coreTotal = coreBalances.reduce((sum, b) => sum + b.balance, 0n);
    const rewardsTotal = rewardsBalances.reduce((sum, b) => sum + b.balance, 0n);

    return (
        <div className="grid md:grid-cols-2 gap-4">
            {/* Core Vault */}
            <div className="bg-gradient-to-br from-indigo-900/40 to-purple-900/40 rounded-xl p-5 border border-indigo-500/30">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">🔒</span>
                    <div>
                        <h3 className="font-bold text-white">Core Vault</h3>
                        <p className="text-xs text-indigo-300">Long-term • Burn to redeem</p>
                    </div>
                </div>

                {coreBalances.length === 0 ? (
                    <p className="text-gray-500 text-sm">Empty</p>
                ) : (
                    <div className="space-y-2">
                        {coreBalances.map((b, i) => (
                            <div key={i} className="flex justify-between items-center bg-black/20 rounded-lg px-3 py-2">
                                <span className="text-gray-400 text-sm font-mono truncate max-w-[120px]">
                                    {b.faMetadataAddr.slice(0, 8)}...
                                </span>
                                <span className="text-white font-semibold">
                                    {formatBalance(b.balance)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-4 pt-3 border-t border-indigo-500/20">
                    <div className="flex justify-between">
                        <span className="text-indigo-300 text-sm">Total</span>
                        <span className="text-white font-bold">{formatBalance(coreTotal)}</span>
                    </div>
                </div>
            </div>

            {/* Rewards Vault */}
            <div className="bg-gradient-to-br from-emerald-900/40 to-teal-900/40 rounded-xl p-5 border border-emerald-500/30">
                <div className="flex items-center gap-2 mb-4">
                    <span className="text-2xl">🎁</span>
                    <div>
                        <h3 className="font-bold text-white">Rewards Vault</h3>
                        <p className="text-xs text-emerald-300">Short-term • Claim anytime</p>
                    </div>
                </div>

                {rewardsBalances.length === 0 ? (
                    <p className="text-gray-500 text-sm">Empty</p>
                ) : (
                    <div className="space-y-2">
                        {rewardsBalances.map((b, i) => (
                            <div key={i} className="flex justify-between items-center bg-black/20 rounded-lg px-3 py-2">
                                <span className="text-gray-400 text-sm font-mono truncate max-w-[120px]">
                                    {b.faMetadataAddr.slice(0, 8)}...
                                </span>
                                <span className="text-white font-semibold">
                                    {formatBalance(b.balance)}
                                </span>
                            </div>
                        ))}
                    </div>
                )}

                <div className="mt-4 pt-3 border-t border-emerald-500/20">
                    <div className="flex justify-between items-center">
                        <span className="text-emerald-300 text-sm">Total</span>
                        <span className="text-white font-bold">{formatBalance(rewardsTotal)}</span>
                    </div>

                    {isOwner && rewardsTotal > 0n && onClaimRewards && (
                        <button
                            onClick={onClaimRewards}
                            disabled={claiming}
                            className="mt-3 w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-emerald-800 disabled:cursor-not-allowed rounded-lg text-white font-medium text-sm transition-colors"
                        >
                            {claiming ? "Claiming..." : "Claim Rewards"}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
