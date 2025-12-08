"use client";

import { useState } from "react";
import Link from "next/link";
import { ConnectButton } from "@/components/ConnectButton";
import { useWallet } from "@/components/wallet-provider";

// CVN-1 Contract on testnet
const CVN1_ADDRESS = "0x87e87b2f6ca01a0a02d68e18305f700435fdb76e445db9d24c84a121f2d5cd2c";
const MODULE_NAME = "vaulted_collection";

interface NFT {
    name: string;
    txHash: string;
}

export default function MintPage() {
    const { connected, account, signAndSubmitTransaction } = useWallet();
    const [minting, setMinting] = useState(false);
    const [mintedNFTs, setMintedNFTs] = useState<NFT[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [nftName, setNftName] = useState("My Vaulted NFT #1");

    const handleMint = async () => {
        if (!connected || !account) {
            setError("Please connect your wallet first");
            return;
        }

        setMinting(true);
        setError(null);

        try {
            // Call creator_mint_vaulted_nft on the contract
            // Contract signature: (creator, buyer, to, name, description, uri, is_redeemable)
            // For frontend-only, user is both creator AND buyer, minting to themselves
            const result = await signAndSubmitTransaction({
                data: {
                    function: `${CVN1_ADDRESS}::${MODULE_NAME}::creator_mint_vaulted_nft`,
                    typeArguments: [],
                    functionArguments: [
                        account.address?.toString() || "",  // to (recipient address)
                        nftName,                            // name
                        "Vaulted NFT from CVN-1 Playground", // description
                        "https://cvn1.demo/nft/1",           // uri
                        true,                                // is_redeemable
                    ],
                },
            });

            const newNFT: NFT = {
                name: nftName,
                txHash: result.hash,
            };

            setMintedNFTs([newNFT, ...mintedNFTs]);
            setNftName(`My Vaulted NFT #${mintedNFTs.length + 2}`);
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

            <div className="max-w-2xl mx-auto px-6 py-12">
                <div className="text-center mb-10">
                    <h1 className="text-3xl font-bold text-white mb-2">Mint NFT</h1>
                    <p className="text-gray-400">Mint a vaulted NFT from your collection</p>
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
                        <p className="text-sm text-gray-400">You must first create a collection at /create</p>
                    </div>
                )}

                {/* Mint Form */}
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-8 mb-8">
                    <h2 className="text-lg font-semibold text-white mb-6">Mint from Your Collection</h2>

                    <div className="mb-6">
                        <label className="block text-sm text-gray-400 mb-2">NFT Name</label>
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
                        disabled={minting || !connected}
                        className="w-full py-4 rounded-lg bg-gradient-to-r from-purple-500 to-pink-500 text-white font-bold text-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
                    >
                        {minting ? "Minting..." : "🎨 Mint NFT"}
                    </button>

                    <p className="text-xs text-gray-500 text-center mt-4">
                        This mints from the collection you created with your connected wallet
                    </p>
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
        </main>
    );
}
