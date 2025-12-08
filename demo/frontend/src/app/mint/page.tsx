"use client";

import { useState } from "react";
import Link from "next/link";
import { ConnectButton } from "@/components/ConnectButton";

interface NFT {
    address: string;
    name: string;
    vaultBalance: number;
}

export default function MintPage() {
    const [minting, setMinting] = useState(false);
    const [mintedNFTs, setMintedNFTs] = useState<NFT[]>([]);

    const strategies = [
        { id: "premium", name: "Premium Art", icon: "🎨", vaultBps: 10000, price: 100 },
        { id: "pfp", name: "PFP Collection", icon: "🚀", vaultBps: 5000, price: 50 },
        { id: "piggy", name: "Piggy Bank", icon: "🏦", vaultBps: 0, price: 0 },
        { id: "gaming", name: "Gaming Item", icon: "🎮", vaultBps: 8000, price: 100 },
    ];

    const handleMint = async (strategy: typeof strategies[0]) => {
        setMinting(true);
        await new Promise(resolve => setTimeout(resolve, 1500));

        const vaultAmount = (strategy.price * strategy.vaultBps) / 10000;
        const newNFT: NFT = {
            address: `0x${Math.random().toString(16).slice(2, 18)}`,
            name: `${strategy.name} #${mintedNFTs.length + 1}`,
            vaultBalance: vaultAmount,
        };

        setMintedNFTs([newNFT, ...mintedNFTs]);
        setMinting(false);
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

            <div className="max-w-5xl mx-auto px-6 py-12">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-white mb-2">Test Minting</h1>
                    <p className="text-gray-400">Choose a strategy and mint test NFTs to see vault seeding in action</p>
                </div>

                {/* Strategy Grid */}
                <div className="grid md:grid-cols-4 gap-4 mb-12">
                    {strategies.map((strategy) => {
                        const vaultAmount = (strategy.price * strategy.vaultBps) / 10000;
                        return (
                            <button
                                key={strategy.id}
                                onClick={() => handleMint(strategy)}
                                disabled={minting}
                                className="group bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 text-left hover:border-purple-500/50 transition-all disabled:opacity-50"
                            >
                                <span className="text-4xl block mb-3">{strategy.icon}</span>
                                <h3 className="font-bold text-white">{strategy.name}</h3>
                                <div className="text-sm text-gray-400 mt-2">
                                    <div>Price: {strategy.price === 0 ? "FREE" : `${strategy.price} CEDRA`}</div>
                                    <div className="text-purple-400">Vault: {vaultAmount} CEDRA</div>
                                </div>
                                <div className="mt-4 py-2 px-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white text-sm text-center font-medium group-hover:opacity-90">
                                    {minting ? "Minting..." : "Mint"}
                                </div>
                            </button>
                        );
                    })}
                </div>

                {/* Minted NFTs */}
                {mintedNFTs.length > 0 && (
                    <div>
                        <h2 className="text-xl font-bold text-white mb-4">Minted NFTs</h2>
                        <div className="space-y-3">
                            {mintedNFTs.map((nft, i) => (
                                <div
                                    key={i}
                                    className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 flex items-center justify-between"
                                >
                                    <div>
                                        <div className="font-medium text-white">{nft.name}</div>
                                        <div className="text-sm text-gray-400 font-mono">{nft.address}</div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm text-gray-400">Vault Balance</div>
                                        <div className="font-bold text-purple-400">{nft.vaultBalance} CEDRA</div>
                                    </div>
                                    <Link
                                        href={`/explore?nft=${nft.address}`}
                                        className="ml-4 py-2 px-4 bg-gray-700 hover:bg-gray-600 rounded-lg text-white text-sm"
                                    >
                                        View →
                                    </Link>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </main>
    );
}
