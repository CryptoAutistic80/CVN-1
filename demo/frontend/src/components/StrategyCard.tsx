"use client";

import Link from "next/link";

export interface Strategy {
    id: string;
    name: string;
    icon: string;
    mintVaultBps: number;
    mintPrice: number;
    description: string;
    color: string;
}

interface StrategyCardProps {
    strategy: Strategy;
}

export default function StrategyCard({ strategy }: StrategyCardProps) {
    const vaultPercent = strategy.mintVaultBps / 100;
    const creatorPercent = 100 - vaultPercent;

    return (
        <div className="group relative overflow-hidden rounded-2xl bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 transition-all duration-300 hover:scale-[1.02]">
            {/* Gradient glow effect */}
            <div className={`absolute inset-0 bg-gradient-to-br ${strategy.color} opacity-0 group-hover:opacity-10 transition-opacity`} />

            {/* Content */}
            <div className="relative p-6">
                {/* Icon and title */}
                <div className="flex items-center gap-3 mb-4">
                    <span className="text-4xl">{strategy.icon}</span>
                    <h3 className="text-xl font-bold text-white">{strategy.name}</h3>
                </div>

                {/* Description */}
                <p className="text-gray-400 text-sm mb-6 min-h-[60px]">
                    {strategy.description}
                </p>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                    <div className="bg-gray-900/50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 mb-1">Mint Price</div>
                        <div className="text-lg font-bold text-white">
                            {strategy.mintPrice === 0 ? "FREE" : `${strategy.mintPrice} CEDRA`}
                        </div>
                    </div>
                    <div className="bg-gray-900/50 rounded-lg p-3">
                        <div className="text-xs text-gray-500 mb-1">To Vault</div>
                        <div className="text-lg font-bold text-white">
                            {vaultPercent}%
                        </div>
                    </div>
                </div>

                {/* Split visualization */}
                <div className="mb-6">
                    <div className="flex h-2 rounded-full overflow-hidden">
                        <div
                            className={`bg-gradient-to-r ${strategy.color}`}
                            style={{ width: `${vaultPercent}%` }}
                        />
                        <div
                            className="bg-gray-600"
                            style={{ width: `${creatorPercent}%` }}
                        />
                    </div>
                    <div className="flex justify-between text-xs mt-1">
                        <span className="text-gray-400">Vault: {vaultPercent}%</span>
                        <span className="text-gray-500">Creator: {creatorPercent}%</span>
                    </div>
                </div>

                {/* CTA Button */}
                <Link
                    href={`/mint/${strategy.id}`}
                    className={`block w-full py-3 px-4 rounded-lg bg-gradient-to-r ${strategy.color} text-white font-semibold text-center hover:opacity-90 transition-opacity`}
                >
                    Mint NFT
                </Link>
            </div>
        </div>
    );
}
