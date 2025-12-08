"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ConnectButton } from "@/components/ConnectButton";
import { useWallet } from "@/components/wallet-provider";
import { CVN1_ADDRESS, getVaultBalances, vaultExists, getWalletNfts, NFT, formatAddress } from "@/lib/cvn1";

// CEDRA native coin FA metadata address
const CEDRA_FA = "0xa";

export default function ExplorePage() {
    const { connected, account, signAndSubmitTransaction } = useWallet();
    const [nftAddress, setNftAddress] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [vaultData, setVaultData] = useState<{
        exists: boolean;
        balances: { symbol: string; amount: number }[];
        isRedeemable: boolean;
    } | null>(null);

    const [walletNfts, setWalletNfts] = useState<NFT[]>([]);
    const [loadingNfts, setLoadingNfts] = useState(false);

    // Fetch NFTs when connected
    useEffect(() => {
        if (connected && account?.address) {
            setLoadingNfts(true);
            getWalletNfts(account.address.toString())
                .then(setWalletNfts)
                .catch(err => console.error("Failed to load NFTs", err))
                .finally(() => setLoadingNfts(false));
        } else {
            setWalletNfts([]);
        }
    }, [connected, account]);

    const handleSearch = async (addr: string = nftAddress) => {
        if (!addr) return;
        // update address if passed explicitly (e.g. from click)
        if (addr !== nftAddress) setNftAddress(addr);

        setLoading(true);
        setError(null);

        try {
            const exists = await vaultExists(addr);
            if (!exists) {
                setVaultData({ exists: false, balances: [], isRedeemable: false });
                setLoading(false);
                return;
            }

            const balances = await getVaultBalances(addr);
            setVaultData({
                exists: true,
                balances: balances.map(b => ({
                    symbol: "CEDRA",
                    amount: Number(b.balance) / 1e8,
                })),
                isRedeemable: true,
            });
        } catch (err) {
            console.error("Search failed:", err);
            setError(err instanceof Error ? err.message : "Search failed");
        } finally {
            setLoading(false);
        }
    };

    const handleNftClick = (nft: NFT) => {
        setNftAddress(nft.address);
        handleSearch(nft.address);
    };

    const [depositAmount, setDepositAmount] = useState("");
    const [depositing, setDepositing] = useState(false);

    const handleDeposit = async () => {
        if (!depositAmount || !connected) {
            setError("Please connect wallet and enter amount");
            return;
        }
        setDepositing(true);
        setError(null);

        try {
            await signAndSubmitTransaction({
                data: {
                    function: `${CVN1_ADDRESS}::vaulted_collection::deposit_to_vault`,
                    typeArguments: [],
                    functionArguments: [
                        nftAddress,
                        CEDRA_FA,
                        (Number(depositAmount) * 1e8).toString(),
                    ],
                },
            });

            // Refresh balances
            await handleSearch(nftAddress);
        } catch (err) {
            console.error("Deposit failed:", err);
            setError(err instanceof Error ? err.message : "Deposit failed");
        } finally {
            setDepositAmount("");
            setDepositing(false);
        }
    };

    const [redeeming, setRedeeming] = useState(false);

    const handleRedeem = async () => {
        if (!connected) {
            setError("Please connect wallet first");
            return;
        }
        setRedeeming(true);
        setError(null);

        try {
            await signAndSubmitTransaction({
                data: {
                    function: `${CVN1_ADDRESS}::vaulted_collection::burn_and_redeem`,
                    typeArguments: [],
                    functionArguments: [nftAddress],
                },
            });

            setVaultData(null);
            setNftAddress("");
            // Refresh NFT list
            if (account?.address) {
                getWalletNfts(account.address.toString()).then(setWalletNfts);
            }
        } catch (err) {
            console.error("Redeem failed:", err);
            setError(err instanceof Error ? err.message : "Redeem failed");
        } finally {
            setRedeeming(false);
        }
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
                        onClick={() => handleSearch()}
                        disabled={loading || !nftAddress}
                        className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-xl text-white font-medium hover:opacity-90 disabled:opacity-50"
                    >
                        {loading ? "..." : "Search"}
                    </button>
                </div>

                {/* Your NFTs */}
                {connected && (
                    <div className="mb-8">
                        <h3 className="text-sm font-semibold text-gray-400 mb-3 uppercase tracking-wider">Your NFTs</h3>
                        {loadingNfts ? (
                            <div className="text-center py-4 text-gray-500 animate-pulse">Loading tokens...</div>
                        ) : walletNfts.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {walletNfts.map((nft) => (
                                    <button
                                        key={nft.address}
                                        onClick={() => handleNftClick(nft)}
                                        className={`group relative p-3 rounded-lg border text-left transition-all ${nftAddress === nft.address
                                            ? "bg-purple-500/20 border-purple-500 ring-1 ring-purple-500"
                                            : "bg-gray-800/50 border-gray-700 hover:border-gray-500"
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="w-8 h-8 rounded bg-gradient-to-br from-gray-700 to-gray-600 flex items-center justify-center text-lg">
                                                💎
                                            </div>
                                            {nft.hasVault && (
                                                <span className="text-xs bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded">Vault</span>
                                            )}
                                        </div>
                                        <div className="font-medium text-white text-sm truncate">{nft.name}</div>
                                        <div className="text-xs text-gray-500 truncate font-mono">{formatAddress(nft.address)}</div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 bg-gray-800/30 rounded-xl border border-dashed border-gray-700 text-gray-500 text-sm">
                                No NFTs found in this wallet
                            </div>
                        )}
                    </div>
                )}

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
                                    onClick={handleRedeem}
                                    disabled={redeeming || !connected}
                                    className="w-full py-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg text-red-400 font-medium disabled:opacity-50"
                                >
                                    {redeeming ? "Burning..." : "🔥 Burn & Redeem All"}
                                </button>
                            )}
                        </div>

                        {/* Error Banner */}
                        {error && (
                            <div className="p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-center">
                                {error}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}
