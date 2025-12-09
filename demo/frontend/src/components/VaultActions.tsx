"use client";

import { useState } from "react";

interface VaultActionsProps {
    nftAddr: string;
    isOwner: boolean;
    isRedeemable: boolean;
    onDepositCore: (amount: bigint, faAddr: string) => Promise<void>;
    onDepositRewards: (amount: bigint, faAddr: string) => Promise<void>;
    onClaimRewards: () => Promise<void>;
    onBurnAndRedeem: () => Promise<void>;
}

export function VaultActions({
    nftAddr,
    isOwner,
    isRedeemable,
    onDepositCore,
    onDepositRewards,
    onClaimRewards,
    onBurnAndRedeem,
}: VaultActionsProps) {
    const [depositAmount, setDepositAmount] = useState("");
    const [depositTarget, setDepositTarget] = useState<"core" | "rewards">("rewards");
    const [depositing, setDepositing] = useState(false);
    const [claiming, setClaiming] = useState(false);
    const [burning, setBurning] = useState(false);
    const [showBurnConfirm, setShowBurnConfirm] = useState(false);

    // Default FA (CEDRA on testnet)
    const defaultFa = "0x1::cedra_coin::CedraCoin";

    const handleDeposit = async () => {
        if (!depositAmount || isNaN(Number(depositAmount))) return;
        setDepositing(true);
        try {
            const amount = BigInt(Math.floor(Number(depositAmount) * 1e8));
            if (depositTarget === "core") {
                await onDepositCore(amount, defaultFa);
            } else {
                await onDepositRewards(amount, defaultFa);
            }
            setDepositAmount("");
        } catch (e) {
            console.error("Deposit failed:", e);
        } finally {
            setDepositing(false);
        }
    };

    const handleClaim = async () => {
        setClaiming(true);
        try {
            await onClaimRewards();
        } catch (e) {
            console.error("Claim failed:", e);
        } finally {
            setClaiming(false);
        }
    };

    const handleBurn = async () => {
        setBurning(true);
        try {
            await onBurnAndRedeem();
        } catch (e) {
            console.error("Burn failed:", e);
        } finally {
            setBurning(false);
            setShowBurnConfirm(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Deposit Section */}
            <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                    <span>💰</span> Deposit to Vault
                </h3>

                <div className="flex gap-2 mb-3">
                    <button
                        onClick={() => setDepositTarget("core")}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${depositTarget === "core"
                                ? "bg-indigo-600 text-white"
                                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
                    >
                        🔒 Core
                    </button>
                    <button
                        onClick={() => setDepositTarget("rewards")}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${depositTarget === "rewards"
                                ? "bg-emerald-600 text-white"
                                : "bg-gray-700 text-gray-300 hover:bg-gray-600"
                            }`}
                    >
                        🎁 Rewards
                    </button>
                </div>

                <div className="flex gap-2">
                    <input
                        type="number"
                        value={depositAmount}
                        onChange={(e) => setDepositAmount(e.target.value)}
                        placeholder="Amount (CEDRA)"
                        className="flex-1 bg-gray-900 border border-gray-600 rounded-lg px-3 py-2 text-white placeholder-gray-500 focus:border-purple-500 focus:outline-none"
                    />
                    <button
                        onClick={handleDeposit}
                        disabled={depositing || !depositAmount}
                        className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-lg text-white font-medium transition-colors"
                    >
                        {depositing ? "..." : "Deposit"}
                    </button>
                </div>
            </div>

            {/* Owner Actions */}
            {isOwner && (
                <div className="bg-gray-800/50 rounded-xl p-5 border border-gray-700/50">
                    <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                        <span>⚡</span> Owner Actions
                    </h3>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            onClick={handleClaim}
                            disabled={claiming}
                            className="py-3 bg-emerald-600 hover:bg-emerald-500 disabled:bg-gray-600 rounded-lg text-white font-medium transition-colors"
                        >
                            {claiming ? "Claiming..." : "🎁 Claim Rewards"}
                        </button>

                        {isRedeemable && (
                            <button
                                onClick={() => setShowBurnConfirm(true)}
                                disabled={burning}
                                className="py-3 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 rounded-lg text-white font-medium transition-colors"
                            >
                                {burning ? "Burning..." : "🔥 Burn & Redeem"}
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* Burn Confirmation Modal */}
            {showBurnConfirm && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
                    <div className="bg-gray-800 rounded-xl p-6 max-w-md mx-4 border border-red-500/50">
                        <h3 className="text-xl font-bold text-white mb-2">⚠️ Confirm Burn</h3>
                        <p className="text-gray-300 mb-4">
                            This will <strong>permanently destroy</strong> your NFT and transfer all assets from both Core and Rewards vaults to your wallet.
                        </p>
                        <p className="text-red-400 text-sm mb-6">
                            This action cannot be undone!
                        </p>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowBurnConfirm(false)}
                                className="flex-1 py-2 bg-gray-600 hover:bg-gray-500 rounded-lg text-white font-medium"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleBurn}
                                disabled={burning}
                                className="flex-1 py-2 bg-red-600 hover:bg-red-500 disabled:bg-gray-600 rounded-lg text-white font-medium"
                            >
                                {burning ? "Burning..." : "Confirm Burn"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
