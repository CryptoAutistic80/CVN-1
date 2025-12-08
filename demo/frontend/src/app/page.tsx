"use client";

import Link from "next/link";
import { ConnectButton } from "@/components/ConnectButton";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="border-b border-gray-700/50 backdrop-blur-sm bg-gray-900/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💎</span>
            <h1 className="text-xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
              CVN-1 Playground
            </h1>
          </div>
          <ConnectButton />
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
          Build NFTs with
          <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent"> Built-in Value</span>
        </h2>
        <p className="text-gray-400 text-xl max-w-2xl mx-auto mb-12">
          CVN-1 enables NFTs that own their own vaults. Configure, deploy, and test
          vaulted collections in minutes.
        </p>

        {/* Action Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {/* Create */}
          <Link
            href="/create"
            className="group relative overflow-hidden rounded-2xl bg-gray-800/50 border border-gray-700/50 hover:border-purple-500/50 transition-all duration-300 hover:scale-[1.02] p-8"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <span className="text-5xl mb-4 block">🛠️</span>
              <h3 className="text-xl font-bold text-white mb-2">Create Collection</h3>
              <p className="text-gray-400 text-sm">
                Configure royalties, mint price, vault percentage, and deploy
              </p>
            </div>
          </Link>

          {/* Mint */}
          <Link
            href="/mint"
            className="group relative overflow-hidden rounded-2xl bg-gray-800/50 border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300 hover:scale-[1.02] p-8"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <span className="text-5xl mb-4 block">⚡</span>
              <h3 className="text-xl font-bold text-white mb-2">Mint NFTs</h3>
              <p className="text-gray-400 text-sm">
                Test minting with different strategies and see vault balances
              </p>
            </div>
          </Link>

          {/* Explore */}
          <Link
            href="/explore"
            className="group relative overflow-hidden rounded-2xl bg-gray-800/50 border border-gray-700/50 hover:border-green-500/50 transition-all duration-300 hover:scale-[1.02] p-8"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-emerald-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <span className="text-5xl mb-4 block">🔍</span>
              <h3 className="text-xl font-bold text-white mb-2">Explore Vaults</h3>
              <p className="text-gray-400 text-sm">
                View vault contents, deposit tokens, and test redemption
              </p>
            </div>
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-4 gap-6 text-left">
          {[
            { icon: "💰", title: "Mint-Time Value", desc: "Seed vaults at mint" },
            { icon: "📈", title: "Vault Royalties", desc: "NFTs grow on trades" },
            { icon: "🔥", title: "Burn & Redeem", desc: "Claim vault contents" },
            { icon: "🔒", title: "Asset Control", desc: "Allowlist deposits" },
          ].map((feature) => (
            <div key={feature.title} className="bg-gray-800/30 rounded-xl p-4 border border-gray-700/30">
              <span className="text-2xl">{feature.icon}</span>
              <h4 className="font-semibold text-white mt-2">{feature.title}</h4>
              <p className="text-sm text-gray-500">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-700/50 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-gray-500 text-sm">
          <p>Deployed on Cedra Testnet</p>
          <p className="mt-2 font-mono text-xs">
            Contract: 0x921213f0f52998b002b7f2c4fcf2b7042dab9f1a5f44a36158ed6424afc25bb7
          </p>
        </div>
      </footer>
    </main>
  );
}
