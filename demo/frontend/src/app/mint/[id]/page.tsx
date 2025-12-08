"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import VaultDisplay from "@/components/VaultDisplay";

const strategies: Record<string, {
    name: string;
    icon: string;
    mintVaultBps: number;
    mintPrice: number;
    color: string;
}> = {
    "premium-art": {
        name: "Premium Art",
        icon: "🎨",
        mintVaultBps: 10000,
        mintPrice: 100,
        color: "from-purple-500 to-pink-500",
    },
    "pfp-collection": {
        name: "PFP Collection",
        icon: "🚀",
        mintVaultBps: 5000,
        mintPrice: 50,
        color: "from-blue-500 to-cyan-500",
    },
    "piggy-bank": {
        name: "Piggy Bank",
        icon: "🏦",
        mintVaultBps: 0,
        mintPrice: 0,
        color: "from-green-500 to-emerald-500",
    },
};

export default function MintPage() {
    const params = useParams();
    const strategyId = params.id as string;
    const strategy = strategies[strategyId];

    const [minting, setMinting] = useState(false);
    const [minted, setMinted] = useState(false);
    const [nftAddress, setNftAddress] = useState("");

    if (!strategy) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-white mb-4">Strategy not found</h1>
                    <Link href="/" className="text-purple-400 hover:text-purple-300">
                        ← Back to Home
                    </Link>
                </div>
            </div>
        );
    }

    const handleMint = async () => {
        setMinting(true);

        // Simulate backend mint call
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Mock NFT address
        setNftAddress("0x1234567890abcdef1234567890abcdef12345678");
        setMinted(true);
        setMinting(false);
    };

    const vaultPercent = strategy.mintVaultBps / 100;
    const vaultAmount = (strategy.mintPrice * vaultPercent) / 100;
    const creatorAmount = strategy.mintPrice - vaultAmount;

    return (
        <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
            {/* Header */}
            <header className="border-b border-gray-700/50 backdrop-blur-sm bg-gray-900/50">
                <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
                    <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                        <span className="text-2xl">💎</span>
                        <span className="text-xl font-bold text-white">CVN-1 Demo</span>
                    </Link>
                </div>
            </header>

            {/* Content */}
            <div className="max-w-xl mx-auto px-6 py-12">
                {/* Strategy Header */}
                <div className="text-center mb-8">
                    <span className="text-6xl mb-4 block">{strategy.icon}</span>
                    <h1 className="text-3xl font-bold text-white mb-2">{strategy.name}</h1>
                    <p className="text-gray-400">
                        {vaultPercent}% of mint price goes to vault
                    </p>
                </div>

                {!minted ? (
                    /* Mint Card */
                    <div className="bg-gray-800/50 border border-gray-700/50 rounded-2xl p-6">
                        {/* Price breakdown */}
                        <div className="mb-6">
                            <h3 className="text-sm font-medium text-gray-400 mb-3">Price Breakdown</h3>
                            <div className="space-y-2">
                                <div className="flex justify-between">
                                    <span className="text-gray-400">Mint Price</span>
                                    <span className="text-white font-medium">
                                        {strategy.mintPrice === 0 ? "FREE" : `${strategy.mintPrice} CEDRA`}
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">→ To Vault</span>
                                    <span className={`font-medium bg-gradient-to-r ${strategy.color} bg-clip-text text-transparent`}>
                                        {vaultAmount} CEDRA
                                    </span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-gray-400">→ To Creator</span>
                                    <span className="text-gray-300">{creatorAmount} CEDRA</span>
                                </div>
                            </div>
                        </div>

                        {/* Visual split */}
                        <div className="mb-6">
                            <div className="flex h-3 rounded-full overflow-hidden">
                                <div
                                    className={`bg-gradient-to-r ${strategy.color}`}
                                    style={{ width: `${vaultPercent}%` }}
                                />
                                <div
                                    className="bg-gray-600"
                                    style={{ width: `${100 - vaultPercent}%` }}
                                />
                            </div>
                        </div>

                        {/* Mint button */}
                        <button
                            onClick={handleMint}
                            disabled={minting}
                            className={`w-full py-4 px-6 rounded-xl bg-gradient-to-r ${strategy.color} text-white font-bold text-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {minting ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Minting...
                                </span>
                            ) : (
                                `Mint for ${strategy.mintPrice === 0 ? "FREE" : strategy.mintPrice + " CEDRA"}`
                            )}
                        </button>
                    </div>
                ) : (
                    /* Success + Vault Display */
                    <div className="space-y-6">
                        <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-6 text-center">
                            <span className="text-4xl mb-2 block">✅</span>
                            <h2 className="text-xl font-bold text-white mb-2">NFT Minted!</h2>
                            <p className="text-gray-400 text-sm font-mono">{nftAddress}</p>
                        </div>

                        <VaultDisplay nftAddress={nftAddress} />

                        <Link
                            href="/"
                            className="block text-center text-purple-400 hover:text-purple-300 py-4"
                        >
                            ← Mint Another
                        </Link>
                    </div>
                )}
            </div>
        </main>
    );
}
