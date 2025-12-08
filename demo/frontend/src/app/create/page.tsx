"use client";

import { useState } from "react";
import Link from "next/link";
import { ConnectButton } from "@/components/ConnectButton";

interface CollectionConfig {
    name: string;
    description: string;
    uri: string;
    creatorRoyaltyBps: number;
    vaultRoyaltyBps: number;
    mintVaultBps: number;
    mintPrice: number;
    isRedeemable: boolean;
}

const presets: Record<string, Partial<CollectionConfig>> = {
    "premium-art": {
        name: "Premium Art Collection",
        mintVaultBps: 10000,
        mintPrice: 100,
        creatorRoyaltyBps: 500,
        vaultRoyaltyBps: 250,
    },
    "pfp-collection": {
        name: "PFP Collection",
        mintVaultBps: 5000,
        mintPrice: 50,
        creatorRoyaltyBps: 250,
        vaultRoyaltyBps: 250,
    },
    "piggy-bank": {
        name: "Piggy Bank",
        mintVaultBps: 0,
        mintPrice: 0,
        creatorRoyaltyBps: 0,
        vaultRoyaltyBps: 0,
    },
    "gaming-item": {
        name: "Gaming Item",
        mintVaultBps: 8000,
        mintPrice: 100,
        creatorRoyaltyBps: 0,
        vaultRoyaltyBps: 500,
    },
    "custom": {
        name: "My Custom Collection",
    },
};

export default function CreatePage() {
    const [config, setConfig] = useState<CollectionConfig>({
        name: "My Vaulted Collection",
        description: "NFTs with built-in value",
        uri: "https://example.com/collection.json",
        creatorRoyaltyBps: 250,
        vaultRoyaltyBps: 250,
        mintVaultBps: 5000,
        mintPrice: 50,
        isRedeemable: true,
    });

    const [selectedPreset, setSelectedPreset] = useState<string>("custom");
    const [creating, setCreating] = useState(false);
    const [created, setCreated] = useState(false);

    const applyPreset = (presetId: string) => {
        setSelectedPreset(presetId);
        const preset = presets[presetId];
        if (preset) {
            setConfig(prev => ({
                ...prev,
                ...preset,
            }));
        }
    };

    const handleCreate = async () => {
        setCreating(true);
        // Simulate API call to backend
        await new Promise(resolve => setTimeout(resolve, 2000));
        setCreated(true);
        setCreating(false);
    };

    const vaultAmount = (config.mintPrice * config.mintVaultBps) / 10000;
    const creatorAmount = config.mintPrice - vaultAmount;

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
                        <Link href="/" className="text-gray-400 hover:text-white">Home</Link>
                        <Link href="/mint" className="text-gray-400 hover:text-white">Mint</Link>
                        <ConnectButton />
                    </div>
                </div>
            </header>

            <div className="max-w-4xl mx-auto px-6 py-12">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-white mb-2">Create Vaulted Collection</h1>
                    <p className="text-gray-400">Configure your NFT collection with built-in vault mechanics</p>
                </div>

                {!created ? (
                    <div className="grid md:grid-cols-3 gap-8">
                        {/* Config Panel */}
                        <div className="md:col-span-2 space-y-6">
                            {/* Presets */}
                            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                                <h2 className="text-lg font-semibold text-white mb-4">Quick Presets</h2>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {Object.entries(presets).map(([id, preset]) => (
                                        <button
                                            key={id}
                                            onClick={() => applyPreset(id)}
                                            className={`p-3 rounded-lg border text-sm transition-all ${selectedPreset === id
                                                ? "border-purple-500 bg-purple-500/20 text-white"
                                                : "border-gray-700 bg-gray-800/50 text-gray-400 hover:border-gray-600"
                                                }`}
                                        >
                                            {id === "premium-art" && "🎨 "}
                                            {id === "pfp-collection" && "🚀 "}
                                            {id === "piggy-bank" && "🏦 "}
                                            {id === "gaming-item" && "🎮 "}
                                            {id === "custom" && "⚙️ "}
                                            {preset.name?.split(" ")[0] || id}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Collection Info */}
                            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                                <h2 className="text-lg font-semibold text-white mb-4">Collection Info</h2>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Collection Name</label>
                                        <input
                                            type="text"
                                            value={config.name}
                                            onChange={e => setConfig({ ...config, name: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm text-gray-400 mb-1">Description</label>
                                        <textarea
                                            value={config.description}
                                            onChange={e => setConfig({ ...config, description: e.target.value })}
                                            className="w-full px-4 py-2 bg-gray-900/50 border border-gray-700 rounded-lg text-white focus:border-purple-500 focus:outline-none"
                                            rows={2}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Mint Configuration */}
                            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                                <h2 className="text-lg font-semibold text-white mb-4">Mint Configuration</h2>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <label className="text-sm text-gray-400">Mint Price (CEDRA)</label>
                                            <span className="text-sm text-white">{config.mintPrice}</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="500"
                                            value={config.mintPrice}
                                            onChange={e => setConfig({ ...config, mintPrice: Number(e.target.value) })}
                                            className="w-full accent-purple-500"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <label className="text-sm text-gray-400">Mint → Vault %</label>
                                            <span className="text-sm text-white">{config.mintVaultBps / 100}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="10000"
                                            step="100"
                                            value={config.mintVaultBps}
                                            onChange={e => setConfig({ ...config, mintVaultBps: Number(e.target.value) })}
                                            className="w-full accent-purple-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Royalty Configuration */}
                            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                                <h2 className="text-lg font-semibold text-white mb-4">Secondary Sale Royalties</h2>
                                <div className="space-y-4">
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <label className="text-sm text-gray-400">Creator Royalty</label>
                                            <span className="text-sm text-white">{config.creatorRoyaltyBps / 100}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1000"
                                            step="25"
                                            value={config.creatorRoyaltyBps}
                                            onChange={e => setConfig({ ...config, creatorRoyaltyBps: Number(e.target.value) })}
                                            className="w-full accent-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-1">
                                            <label className="text-sm text-gray-400">Vault Royalty</label>
                                            <span className="text-sm text-white">{config.vaultRoyaltyBps / 100}%</span>
                                        </div>
                                        <input
                                            type="range"
                                            min="0"
                                            max="1000"
                                            step="25"
                                            value={config.vaultRoyaltyBps}
                                            onChange={e => setConfig({ ...config, vaultRoyaltyBps: Number(e.target.value) })}
                                            className="w-full accent-green-500"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Options */}
                            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                                <label className="flex items-center gap-3 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={config.isRedeemable}
                                        onChange={e => setConfig({ ...config, isRedeemable: e.target.checked })}
                                        className="w-5 h-5 accent-purple-500"
                                    />
                                    <div>
                                        <span className="text-white font-medium">Redeemable</span>
                                        <p className="text-sm text-gray-400">Allow holders to burn NFT and claim vault contents</p>
                                    </div>
                                </label>
                            </div>
                        </div>

                        {/* Preview Panel */}
                        <div className="space-y-6">
                            <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6 sticky top-6">
                                <h2 className="text-lg font-semibold text-white mb-4">Preview</h2>

                                {/* Collection Preview */}
                                <div className="mb-6">
                                    <div className="text-2xl mb-2">💎</div>
                                    <h3 className="font-bold text-white">{config.name}</h3>
                                    <p className="text-sm text-gray-400 line-clamp-2">{config.description}</p>
                                </div>

                                {/* Mint Split */}
                                <div className="mb-6">
                                    <div className="text-sm text-gray-400 mb-2">Mint Split</div>
                                    <div className="flex h-3 rounded-full overflow-hidden mb-2">
                                        <div
                                            className="bg-gradient-to-r from-purple-500 to-pink-500"
                                            style={{ width: `${config.mintVaultBps / 100}%` }}
                                        />
                                        <div
                                            className="bg-gray-600"
                                            style={{ width: `${100 - config.mintVaultBps / 100}%` }}
                                        />
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-purple-400">{vaultAmount} CEDRA → Vault</span>
                                        <span className="text-gray-400">{creatorAmount} → Creator</span>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="space-y-2 mb-6">
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Mint Price</span>
                                        <span className="text-white">{config.mintPrice === 0 ? "FREE" : `${config.mintPrice} CEDRA`}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Total Royalty</span>
                                        <span className="text-white">{(config.creatorRoyaltyBps + config.vaultRoyaltyBps) / 100}%</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                        <span className="text-gray-400">Redeemable</span>
                                        <span className={config.isRedeemable ? "text-green-400" : "text-red-400"}>
                                            {config.isRedeemable ? "Yes" : "No"}
                                        </span>
                                    </div>
                                </div>

                                {/* Create Button */}
                                <button
                                    onClick={handleCreate}
                                    disabled={creating}
                                    className="w-full py-3 px-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:opacity-90 transition-opacity disabled:opacity-50"
                                >
                                    {creating ? "Creating..." : "Create Collection"}
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    /* Success */
                    <div className="max-w-md mx-auto text-center">
                        <div className="bg-green-500/20 border border-green-500/50 rounded-xl p-8 mb-6">
                            <span className="text-6xl mb-4 block">✅</span>
                            <h2 className="text-2xl font-bold text-white mb-2">Collection Created!</h2>
                            <p className="text-gray-400">{config.name}</p>
                        </div>
                        <Link
                            href="/mint"
                            className="inline-block py-3 px-8 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold hover:opacity-90"
                        >
                            Start Minting →
                        </Link>
                    </div>
                )}
            </div>
        </main>
    );
}
