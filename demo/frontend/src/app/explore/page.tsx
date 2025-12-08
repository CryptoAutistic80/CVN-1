"use client";

import { useState } from "react";
import Link from "next/link";
import { ConnectButton } from "@/components/ConnectButton";

export default function ExplorePage() {
    const [nftAddress, setNftAddress] = useState("");
    const [loading, setLoading] = useState(false);
    const [vaultData, setVaultData] = useState<{
        exists: boolean;
        balances: { symbol: string; amount: number }[];
        isRedeemable: boolean;
    } | null>(null);

    const handleSearch = async () => {
        if (!nftAddress) return;
        setLoading(true);
        await new Promise(resolve => setTimeout(resolve, 1000));

        // Mock vault data
        setVaultData({
            exists: true,
            balances: [
                { symbol: "CEDRA", amount: 50 },
                { symbol: "USDC", amount: 25 },
            ],
            isRedeemable: true,
        });
        setLoading(false);
    };

    const [depositAmount, setDepositAmount] = useState("");
    const [depositing, setDepositing] = useState(false);

    const handleDeposit = async () => {
        if (!depositAmount) return;
        setDepositing(true);
        await new Promise(resolve => setTimeout(resolve, 1500));

        if (vaultData) {
            setVaultData({
                ...vaultData,
                balances: vaultData.balances.map(b =>
                    b.symbol === "CEDRA"
                        ? { ...b, amount: b.amount + Number(depositAmount) }
                        : b
                ),
            });
        }
        setDepositAmount("");
        setDepositing(false);
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* Header */}
            <header className="border-b border-gray-700/50 backdrop-blur-sm bg-gray-900/50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <span className="text-2xl">💎</span>
                        <span className="text-xl font-bold text-white">CVN-1 Playground</span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/create" className="text-gray-400 hover:text-white">Create</Link>
                        <Link href="/mint" className="text-gray-400 hover:text-white">Mint</Link>
                        <ConnectButton />
                    </div>
                </div>
            </header>

            <div className="max-w-2xl mx-auto px-6 py-12">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-white mb-2">Explore Vault</h1>
                    <p className="text-gray-400">Enter an NFT address to view and interact with its vault</p>
                </div>

                {/* Search */}
                <div className="flex gap-3 mb-8">
                    <input
                        type="text"
                        placeholder="0x... NFT address"
                        value={nftAddress}
                        onChange={e => setNftAddress(e.target.value)}
                        className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-white focus:border-purple-500 focus:outline-none font-mono text-sm"
                    />
                    <button
                        onClick={handleSearch}
                        disabled={loading || !nftAddress}
                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-medium hover:opacity-90 disabled:opacity-50"
                    >
                        {loading ? "..." : "Search"}
                    </button>
                </div>

                {/* Vault Display */}
                {vaultData && (
                    <div className="space-y-6">
                        {/* Status */}
                        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                            <div className="flex items-center justify-between mb-4">
                                <h2 className="text-lg font-semibold text-white">Vault Status</h2>
                                <span className={`px-3 py-1 rounded-full text-xs font-medium ${vaultData.isRedeemable
                                    ? "bg-green-500/20 text-green-400"
                                    : "bg-red-500/20 text-red-400"
                                    }`}>
                                    {vaultData.isRedeemable ? "Redeemable" : "Locked"}
                                </span>
                            </div>
                            <div className="text-sm text-gray-400 font-mono">{nftAddress}</div>
                        </div>

                        {/* Balances */}
                        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                            <h2 className="text-lg font-semibold text-white mb-4">💰 Vault Contents</h2>

                            {vaultData.balances.length === 0 ? (
                                <div className="text-center text-gray-400 py-8">
                                    <p>Vault is empty</p>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {vaultData.balances.map((balance) => (
                                        <div
                                            key={balance.symbol}
                                            className="flex items-center justify-between bg-gray-900/50 rounded-lg p-4"
                                        >
                                            <span className="text-gray-300">{balance.symbol}</span>
                                            <span className="font-bold text-white">{balance.amount}</span>
                                        </div>
                                    ))}
                                </div>
                            )}

                            {/* Total */}
                            <div className="mt-4 pt-4 border-t border-gray-700">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Total Value</span>
                                    <span className="font-bold text-purple-400">
                                        {vaultData.balances.reduce((sum, b) => sum + b.amount, 0)} CEDRA
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                            <h2 className="text-lg font-semibold text-white mb-4">Actions</h2>

                            {/* Deposit */}
                            <div className="flex gap-3 mb-4">
                                <input
                                    type="number"
                                    placeholder="Amount"
                                    value={depositAmount}
                                    onChange={e => setDepositAmount(e.target.value)}
                                    className="flex-1 px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                                />
                                <button
                                    onClick={handleDeposit}
                                    disabled={depositing || !depositAmount}
                                    className="px-6 py-2 bg-green-500 hover:bg-green-600 rounded-lg text-white font-medium disabled:opacity-50"
                                >
                                    {depositing ? "..." : "Deposit CEDRA"}
                                </button>
                            </div>

                            {/* Redeem */}
                            {vaultData.isRedeemable && (
                                <button
                                    className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 font-medium"
                                >
                                    🔥 Burn & Redeem All
                                </button>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
