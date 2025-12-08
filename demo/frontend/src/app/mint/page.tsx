"use client";

import { useState } from "react";
import Link from "next/link";
import { ConnectButton } from "@/components/ConnectButton";
import { useWallet } from "@/components/wallet-provider";

// CVN-1 Contract on testnet
const CVN1_ADDRESS = "0x87e87b2f6ca01a0a02d68e18305f700435fdb76e445db9d24c84a121f2d5cd2c";
const MODULE_NAME = "vaulted_collection";

interface NFT {
    address: string;
    name: string;
    vaultBalance: number;
    txHash: string;
}

export default function MintPage() {
    const { connected, signAndSubmitTransaction } = useWallet();
    const [minting, setMinting] = useState(false);
    const [mintedNFTs, setMintedNFTs] = useState<NFT[]>([]);
    const [error, setError] = useState<string | null>(null);

    const strategies = [
        { id: "premium", name: "Premium Art", icon: "🎨", vaultBps: 10000, price: 100 },
        { id: "pfp", name: "PFP Collection", icon: "🚀", vaultBps: 5000, price: 50 },
        { id: "piggy", name: "Piggy Bank", icon: "🏦", vaultBps: 0, price: 0 },
        { id: "gaming", name: "Gaming Item", icon: "🎮", vaultBps: 8000, price: 100 },
    ];

    const handleMint = async (strategy: typeof strategies[0]) => {
        if (!connected) {
            setError("Please connect your wallet first");
            return;
        }

        setMinting(true);
        setError(null);

        try {
            // Call creator_mint_vaulted_nft on the contract
            const result = await signAndSubmitTransaction({
                data: {
                    function: `${CVN1_ADDRESS}::${MODULE_NAME}::creator_mint_vaulted_nft`,
                    typeArguments: [],
                    functionArguments: [
                        `${strategy.name} #${mintedNFTs.length + 1}`, // name
                        `Vaulted NFT from CVN-1 demo`,                 // description  
                        `https://cvn1.demo/nft/${strategy.id}`,       // uri
                        true,                                          // is_redeemable
                    ],
                },
            });

            const vaultAmount = (strategy.price * strategy.vaultBps) / 10000;
            const newNFT: NFT = {
                address: `0x${result.hash.slice(2, 18)}...`, // Truncated tx hash as placeholder
                name: `${strategy.name} #${mintedNFTs.length + 1}`,
                vaultBalance: vaultAmount,
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

            <div className="max-w-5xl mx-auto px-6 py-12">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-white mb-2">Test Minting</h1>
                    <p className="text-gray-400">Choose a strategy and mint test NFTs to see vault seeding in action</p>
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
                        <p className="text-purple-300 mb-2">Connect your wallet to mint real NFTs on testnet</p>
                        <p className="text-sm text-gray-400">Click the "Connect" button in the header</p>
                    </div>
                )}

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
