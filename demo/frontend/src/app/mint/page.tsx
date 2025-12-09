"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { ConnectButton } from "@/components/ConnectButton";
import { useWallet } from "@/components/wallet-provider";
import {
    CVN1_ADDRESS,
    getVaultedCollections,
    getCollectionDetails,
    getVaultConfig,
    VaultConfig
} from "@/lib/cvn1";

const MODULE_NAME = "vaulted_collection";

interface NFT {
    name: string;
    txHash: string;
}

interface CollectionMeta {
    address: string;
    name: string;
    description?: string;
    uri: string;
    mintPrice: number;    // Octas
    mintVaultBps: number;
}

export default function MintPage() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const collectionParam = searchParams.get("collection");

    const { connected, account, signAndSubmitTransaction } = useWallet();

    // Modes: 'selection' or 'minting'
    const [collectionAddr, setCollectionAddr] = useState(collectionParam || "");

    // Selection Mode State
    const [availableCollections, setAvailableCollections] = useState<CollectionMeta[]>([]);
    const [loadingCollections, setLoadingCollections] = useState(false);

    // Minting Mode State
    const [minting, setMinting] = useState(false);
    const [mintedNFTs, setMintedNFTs] = useState<NFT[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [nftName, setNftName] = useState("Vaulted NFT");

    // Load available collections if no address selected
    useEffect(() => {
        if (!collectionAddr) {
            loadCollections();
        }
    }, [collectionAddr]);

    // Update state if URL param changes
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

            // Allow some parallelism but batch to avoid rate limits
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
        // Update URL without reload
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
            const result = await signAndSubmitTransaction({
                data: {
                    function: `${CVN1_ADDRESS}::${MODULE_NAME}::public_mint`,
                    typeArguments: [],
                    functionArguments: [
                        collectionAddr,                      // collection_addr
                        nftName,                             // name prefix
                        "Vaulted NFT from CVN-1 Playground", // description
                        "https://cvn1.demo/nft/1",           // uri
                        true,                                // is_redeemable
                    ],
                },
            });

            const newNFT: NFT = {
                name: `${nftName} (Pending #)`,
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
                        <Link href="/explore" className="text-gray-400 hover:text-white">Explore</Link>
                        <ConnectButton />
                    </div>
                </div>
            </header>

            <div className="max-w-7xl mx-auto px-6 py-12">

                {/* Mode: Selection Grid */}
                {!collectionAddr ? (
                    <div>
                        <div className="text-center mb-10">
                            <h1 className="text-3xl font-bold text-white mb-2">Select Collection</h1>
                            <p className="text-gray-400">Choose a vaulted collection to mint from</p>
                        </div>

                        {loadingCollections ? (
                            <div className="flex justify-center py-12">
                                <div className="text-gray-500 animate-pulse">Loading available collections...</div>
                            </div>
                        ) : availableCollections.length > 0 ? (
                            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {availableCollections.map((col) => (
                                    <button
                                        key={col.address}
                                        onClick={() => handleSelectCollection(col.address)}
                                        className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 text-left hover:border-purple-500 hover:bg-gray-800 transition-all group"
                                    >
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center text-2xl group-hover:scale-110 transition-transform">
                                                💎
                                            </div>
                                            <div className="text-xs bg-purple-500/20 text-purple-300 px-2 py-1 rounded">
                                                Vault {col.mintVaultBps / 100}%
                                            </div>
                                        </div>
                                        <h3 className="font-bold text-white text-lg mb-1 truncate">{col.name}</h3>
                                        <p className="text-sm text-gray-500 font-mono mb-4 break-all truncate">{col.address.slice(0, 10)}...</p>

                                        <div className="flex justify-between items-center pt-4 border-t border-gray-700/50">
                                            <span className="text-gray-400 text-sm">Mint Price</span>
                                            <span className="text-white font-medium">
                                                {col.mintPrice === 0 ? "FREE" : `${col.mintPrice / 1e8} CEDRA`}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-12 bg-gray-800/30 rounded-xl border border-dashed border-gray-700">
                                <p className="text-gray-500 mb-4">No public collections found.</p>
                                <Link href="/create" className="text-purple-400 hover:underline">
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
                            className="text-gray-400 hover:text-white mb-6 flex items-center gap-2"
                        >
                            ← Back to Collections
                        </button>

                        <div className="text-center mb-10">
                            <h1 className="text-3xl font-bold text-white mb-2">Mint NFT</h1>
                            <p className="text-gray-400">Minting from: <span className="font-mono text-purple-400">{collectionAddr.slice(0, 8)}...</span></p>
                        </div>

                        {/* Error Banner */}
                        {error && (
                            <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-xl text-red-400 text-center">
                                {error}
                            </div>
                        )}

                        {/* Connect Wallet Prompt */}
                        {!connected && (
                            <div className="mb-6 p-6 bg-purple-500/10 border border-purple-500/30 rounded-xl text-center">
                                <p className="text-purple-300 mb-2">Connect your wallet to mint</p>
                            </div>
                        )}

                        {/* Mint Form */}
                        <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-8 mb-8">
                            <div className="mb-6">
                                <label className="block text-sm text-gray-400 mb-2">Collection Address</label>
                                <input
                                    type="text"
                                    value={collectionAddr}
                                    onChange={(e) => setCollectionAddr(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none font-mono text-sm opacity-50"
                                // disabled for now in this flow, but user can edit if they really want
                                />
                            </div>

                            <div className="mb-6">
                                <label className="block text-sm text-gray-400 mb-2">NFT Name Prefix</label>
                                <input
                                    type="text"
                                    value={nftName}
                                    onChange={(e) => setNftName(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                                    placeholder="Enter NFT name"
                                />
                            </div>

                            <button
                                onClick={handleMint}
                                disabled={minting || !connected || !collectionAddr}
                                className="w-full py-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                            >
                                {minting ? "Minting..." : "🎨 Mint NFT"}
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
                                            className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4"
                                        >
                                            <div className="font-medium text-white mb-1">{nft.name}</div>
                                            <div className="text-xs text-gray-500 font-mono break-all">
                                                TX: {nft.txHash}
                                            </div>
                                            <a
                                                href={`https://explorer.cedra.dev/txn/${nft.txHash}?network=testnet`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-purple-400 text-sm hover:underline mt-2 inline-block"
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
