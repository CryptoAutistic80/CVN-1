"use client";

import { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ConnectButton } from "@/components/ConnectButton";
import { useWallet } from "@/components/wallet-provider";
import {
    CVN1_ADDRESS,
    getVaultedCollections,
    getCollectionDetails,
    getVaultConfig,
    buildPublicMintPayload,
} from "@/lib/cvn1";

interface NFT {
    name: string;
    txHash: string;
}

interface CollectionMeta {
    address: string;
    name: string;
    uri: string;
    mintPrice: number;
    mintVaultBps: number;
}

function MintPageContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const collectionParam = searchParams.get("collection");

    const { connected, account, signAndSubmitTransaction } = useWallet();

    const [collectionAddr, setCollectionAddr] = useState(collectionParam || "");
    const [availableCollections, setAvailableCollections] = useState<CollectionMeta[]>([]);
    const [loadingCollections, setLoadingCollections] = useState(false);

    const [minting, setMinting] = useState(false);
    const [mintedNFTs, setMintedNFTs] = useState<NFT[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [nftName, setNftName] = useState("Vaulted NFT");
    const [nftDescription, setNftDescription] = useState("Minted via CVN-1 v3 Playground");

    useEffect(() => {
        if (!collectionAddr) {
            loadCollections();
        }
    }, [collectionAddr]);

    useEffect(() => {
        if (collectionParam) {
            setCollectionAddr(collectionParam);
        }
    }, [collectionParam]);

    const loadCollections = async () => {
        setLoadingCollections(true);
        try {
            const addresses = await getVaultedCollections();
            const list: CollectionMeta[] = [];

            for (const addr of addresses) {
                try {
                    const [details, config] = await Promise.all([
                        getCollectionDetails(addr),
                        getVaultConfig(addr)
                    ]);

                    if (details && config) {
                        list.push({
                            address: addr,
                            name: details.name,
                            uri: details.uri,
                            mintPrice: config.mintPrice,
                            mintVaultBps: config.mintVaultBps,
                        });
                    }
                } catch (e) {
                    console.warn("Skipping collection", addr, e);
                }
            }
            setAvailableCollections(list);
        } catch (e) {
            console.error("Failed to load collections", e);
        } finally {
            setLoadingCollections(false);
        }
    };

    const handleSelectCollection = (addr: string) => {
        setCollectionAddr(addr);
        router.push(`/mint?collection=${addr}`);
    };

    const handleBack = () => {
        setCollectionAddr("");
        setError(null);
        router.push("/mint");
    };

    const handleMint = async () => {
        if (!connected || !account) {
            setError("Please connect your wallet first");
            return;
        }

        if (!collectionAddr) {
            setError("Please select a collection");
            return;
        }

        setMinting(true);
        setError(null);

        try {
            const payload = buildPublicMintPayload(
                collectionAddr,
                nftName,
                nftDescription,
                "https://cvn1.demo/nft/placeholder",
                true
            );

            const result = await signAndSubmitTransaction({
                data: payload,
            });

            const newNFT: NFT = {
                name: nftName,
                txHash: result.hash,
            };

            setMintedNFTs([newNFT, ...mintedNFTs]);
        } catch (err) {
            console.error("Mint failed:", err);
            setError(err instanceof Error ? err.message : "Mint failed");
        } finally {
            setMinting(false);
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
                        <Link href="/explore" className="text-slate-400 hover:text-white text-sm">Explore</Link>
                        <ConnectButton />
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-12">

                {/* Mode: Selection Grid */}
                {!collectionAddr ? (
                    <div>
                        <div className="text-center mb-10">
                            <h1 className="text-4xl font-bold text-white mb-3">Mint NFT</h1>
                            <p className="text-slate-400">Choose a collection to mint from</p>
                        </div>

                        {loadingCollections ? (
                            <div className="flex justify-center py-12">
                                <div className="text-slate-500 animate-pulse">Loading collections...</div>
                            </div>
                        ) : availableCollections.length > 0 ? (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {availableCollections.map((col) => (
                                    <button
                                        key={col.address}
                                        onClick={() => handleSelectCollection(col.address)}
                                        className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-6 text-left hover:border-violet-500 hover:bg-slate-800 transition-all group"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                                💎
                                            </div>
                                            <div className="text-xs bg-indigo-500/20 text-indigo-300 px-2 py-1 rounded-lg">
                                                🔒 {col.mintVaultBps / 100}% → Core
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-white text-lg mb-1 truncate">{col.name}</h3>
                                        <p className="text-sm text-slate-500 font-mono mb-4 break-all truncate">{col.address.slice(0, 10)}...</p>

                                        <div className="flex justify-between items-center pt-4 border-t border-slate-700/50">
                                            <span className="text-slate-400 text-sm">Mint Price</span>
                                            <span className="text-white font-medium">
                                                {col.mintPrice === 0 ? "FREE" : `${col.mintPrice / 1e8} CEDRA`}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-slate-800/30 rounded-2xl border border-dashed border-slate-700">
                                <p className="text-slate-500 mb-4">No public collections found.</p>
                                <Link href="/create" className="text-violet-400 hover:underline">
                                    Create the first one!
                                </Link>
                            </div>
                        )}
                    </div>
                ) : (
                    /* Mode: Mint Form */
                    <div className="max-w-2xl mx-auto">
                        <button
                            onClick={handleBack}
                            className="text-slate-400 hover:text-white mb-6 flex items-center gap-2"
                        >
                            ← Back to Collections
                        </button>

                        <div className="text-center mb-10">
                            <h1 className="text-4xl font-bold text-white mb-3">Mint NFT</h1>
                            <p className="text-slate-400">
                                Minting from: <span className="font-mono text-violet-400">{collectionAddr.slice(0, 8)}...</span>
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-center">
                                {error}
                            </div>
                        )}

                        {!connected && (
                            <div className="mb-6 p-6 bg-violet-500/10 border border-violet-500/30 rounded-xl text-center">
                                <p className="text-violet-300 mb-2">Connect your wallet to mint</p>
                            </div>
                        )}

                        {/* Mint Form */}
                        <div className="bg-slate-800/50 border border-slate-700/50 rounded-2xl p-8 mb-8">
                            <div className="mb-6">
                                <label className="block text-sm text-slate-400 mb-2">NFT Name</label>
                                <input
                                    type="text"
                                    value={nftName}
                                    onChange={(e) => setNftName(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:border-violet-500 focus:outline-none"
                                    placeholder="Enter NFT name"
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm text-slate-400 mb-2">Description</label>
                                <textarea
                                    value={nftDescription}
                                    onChange={(e) => setNftDescription(e.target.value)}
                                    className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl text-white focus:border-violet-500 focus:outline-none resize-none"
                                    rows={2}
                                    placeholder="Enter description"
                                />
                            </div>

                            {/* Visual indicator */}
                            <div className="mb-6 p-4 bg-indigo-500/10 border border-indigo-500/30 rounded-xl text-sm">
                                <div className="flex items-center gap-2 text-indigo-300">
                                    <span>🔒</span>
                                    <span>Mint fee goes to <strong>Core Vault</strong> (long-term value)</span>
                                </div>
                            </div>

                            <button
                                onClick={handleMint}
                                disabled={minting || !connected || !collectionAddr}
                                className="w-full py-4 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white font-bold text-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
                            >
                                {minting ? "Minting..." : "⚡ Mint NFT"}
                            </button>
                        </div>

                        {/* Minted NFTs */}
                        {mintedNFTs.length > 0 && (
                            <div>
                                <h2 className="text-xl font-bold text-white mb-4">✅ Minted NFTs</h2>
                                <div className="space-y-3">
                                    {mintedNFTs.map((nft, i) => (
                                        <div
                                            key={i}
                                            className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4"
                                        >
                                            <div className="font-medium text-white mb-1">{nft.name}</div>
                                            <div className="text-xs text-slate-500 font-mono break-all">
                                                TX: {nft.txHash}
                                            </div>
                                            <a
                                                href={`https://explorer.cedra.dev/txn/${nft.txHash}?network=testnet`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-violet-400 text-sm hover:underline mt-2 inline-block"
                                            >
                                                View on Explorer →
                                            </a>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </main>
    );
}

export default function MintPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center text-slate-400">Loading...</div>}>
            <MintPageContent />
        </Suspense>
    );
}
