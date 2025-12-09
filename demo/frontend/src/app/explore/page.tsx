"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { ConnectButton } from "@/components/ConnectButton";
import { useWallet } from "@/components/wallet-provider";
import { DualVaultDisplay } from "@/components/DualVaultDisplay";
import { VaultActions } from "@/components/VaultActions";
import {
    vaultExists,
    getWalletNfts,
    getDualVaultBalances,
    getVaultInfo,
    buildDepositToCorePayload,
    buildDepositToRewardsPayload,
    buildClaimRewardsPayload,
    buildBurnAndRedeemPayload,
    formatAddress,
    VaultBalance,
    NFT,
} from "@/lib/cvn1";

export default function ExplorePage() {
    const { connected, account, signAndSubmitTransaction } = useWallet();
    const [nftAddress, setNftAddress] = useState("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const [coreBalances, setCoreBalances] = useState<VaultBalance[]>([]);
    const [rewardsBalances, setRewardsBalances] = useState<VaultBalance[]>([]);
    const [vaultInfo, setVaultInfo] = useState<{ isRedeemable: boolean; creator: string; isCompliant: boolean } | null>(null);
    const [hasVault, setHasVault] = useState(false);

    const [walletNfts, setWalletNfts] = useState<NFT[]>([]);
    const [loadingNfts, setLoadingNfts] = useState(false);

    const isOwner = connected && account?.address?.toString() === vaultInfo?.creator;

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
        if (addr !== nftAddress) setNftAddress(addr);

        setLoading(true);
        setError(null);
        setHasVault(false);

        try {
            const exists = await vaultExists(addr);
            if (!exists) {
                setHasVault(false);
                setCoreBalances([]);
                setRewardsBalances([]);
                setVaultInfo(null);
                setLoading(false);
                return;
            }

            setHasVault(true);

            const [balances, info] = await Promise.all([
                getDualVaultBalances(addr),
                getVaultInfo(addr),
            ]);

            setCoreBalances(balances.core);
            setRewardsBalances(balances.rewards);
            setVaultInfo(info);
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

    const handleDepositCore = async (amount: bigint, faAddr: string) => {
        const payload = buildDepositToCorePayload(nftAddress, faAddr, amount);
        await signAndSubmitTransaction({ data: payload });
        await handleSearch(nftAddress);
    };

    const handleDepositRewards = async (amount: bigint, faAddr: string) => {
        const payload = buildDepositToRewardsPayload(nftAddress, faAddr, amount);
        await signAndSubmitTransaction({ data: payload });
        await handleSearch(nftAddress);
    };

    const handleClaimRewards = async () => {
        const payload = buildClaimRewardsPayload(nftAddress);
        await signAndSubmitTransaction({ data: payload });
        await handleSearch(nftAddress);
    };

    const handleBurnAndRedeem = async () => {
        const payload = buildBurnAndRedeemPayload(nftAddress);
        await signAndSubmitTransaction({ data: payload });
        setHasVault(false);
        setCoreBalances([]);
        setRewardsBalances([]);
        setVaultInfo(null);
        setNftAddress("");
        // Refresh wallet NFTs
        if (account?.address) {
            getWalletNfts(account.address.toString()).then(setWalletNfts);
        }
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
            {/* Header */}
            <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <span className="text-2xl">💎</span>
                        <span className="text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
                            CVN-1 v3
                        </span>
                    </Link>
                    <div className="flex items-center gap-4">
                        <Link href="/create" className="text-slate-400 hover:text-white text-sm">Create</Link>
                        <Link href="/mint" className="text-slate-400 hover:text-white text-sm">Mint</Link>
                        <ConnectButton />
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-6 py-12">
                <div className="text-center mb-10">
                    <h1 className="text-4xl font-bold text-white mb-3">Explore Vaults</h1>
                    <p className="text-slate-400">View and interact with NFT dual vaults</p>
                </div>

                {/* Search */}
                <div className="flex gap-3 mb-8">
                    <input
                        type="text"
                        placeholder="0x... NFT address"
                        value={nftAddress}
                        onChange={e => setNftAddress(e.target.value)}
                        className="flex-1 px-4 py-3 bg-slate-800/50 border border-slate-700 rounded-xl text-white focus:border-violet-500 focus:outline-none font-mono text-sm"
                    />
                    <button
                        onClick={() => handleSearch()}
                        disabled={loading || !nftAddress}
                        className="px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 rounded-xl text-white font-medium hover:opacity-90 disabled:opacity-50"
                    >
                        {loading ? "..." : "Search"}
                    </button>
                </div>

                {/* Your NFTs */}
                {connected && (
                    <div className="mb-8">
                        <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">Your NFTs</h3>
                        {loadingNfts ? (
                            <div className="text-center py-4 text-slate-500 animate-pulse">Loading tokens...</div>
                        ) : walletNfts.length > 0 ? (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {walletNfts.map((nft) => (
                                    <button
                                        key={nft.address}
                                        onClick={() => handleNftClick(nft)}
                                        className={`group relative p-3 rounded-xl border text-left transition-all ${nftAddress === nft.address
                                            ? "bg-violet-500/20 border-violet-500 ring-1 ring-violet-500"
                                            : "bg-slate-800/50 border-slate-700 hover:border-slate-500"
                                            }`}
                                    >
                                        <div className="flex items-start justify-between mb-2">
                                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-700 to-slate-600 flex items-center justify-center text-lg">
                                                💎
                                            </div>
                                            {nft.hasVault && (
                                                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded">Vault</span>
                                            )}
                                        </div>
                                        <div className="font-medium text-white text-sm truncate">{nft.name}</div>
                                        <div className="text-xs text-slate-500 truncate font-mono">{formatAddress(nft.address)}</div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-4 bg-slate-800/30 rounded-xl border border-dashed border-slate-700 text-slate-500 text-sm">
                                No NFTs found in this wallet
                            </div>
                        )}
                    </div>
                )}

                {/* Error */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-center">
                        {error}
                    </div>
                )}

                {/* Vault Display */}
                {hasVault && (
                    <div className="space-y-6">
                        {/* Status Bar */}
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4 flex items-center justify-between">
                            <div>
                                <div className="text-sm text-slate-400">NFT Address</div>
                                <div className="text-white font-mono text-sm">{formatAddress(nftAddress)}</div>
                            </div>
                            <div className="flex gap-2">
                                {vaultInfo?.isRedeemable && (
                                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/20 text-emerald-400">
                                        🔥 Redeemable
                                    </span>
                                )}
                                {vaultInfo?.isCompliant && (
                                    <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-500/20 text-blue-400">
                                        ✓ Compliant
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Dual Vault Display */}
                        <DualVaultDisplay
                            coreBalances={coreBalances}
                            rewardsBalances={rewardsBalances}
                            isOwner={isOwner || false}
                            onClaimRewards={handleClaimRewards}
                        />

                        {/* Actions */}
                        <VaultActions
                            nftAddr={nftAddress}
                            isOwner={isOwner || false}
                            isRedeemable={vaultInfo?.isRedeemable || false}
                            onDepositCore={handleDepositCore}
                            onDepositRewards={handleDepositRewards}
                            onClaimRewards={handleClaimRewards}
                            onBurnAndRedeem={handleBurnAndRedeem}
                        />
                    </div>
                )}

                {/* No Vault Found */}
                {!loading && nftAddress && !hasVault && (
                    <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700">
                        <p className="text-slate-500 mb-2">No vault found for this address</p>
                        <p className="text-sm text-slate-600">This NFT may not be a CVN-1 vaulted NFT</p>
                    </div>
                )}
            </div>
        </main>
    );
}
