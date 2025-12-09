"use client";

import Link from "next/link";
import { ConnectButton } from "@/components/ConnectButton";
import { CVN1_ADDRESS } from "@/lib/cvn1";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950">
      {/* Header */}
      <header className="border-b border-slate-700/50 backdrop-blur-sm bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">💎</span>
            <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
              CVN-1 v3
            </h1>
          </div>
          <ConnectButton />
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-20 text-center">
        <div className="mb-4">
          <span className="px-3 py-1 bg-violet-500/20 text-violet-300 text-sm rounded-full">
            Dual Vault Architecture
          </span>
        </div>
        <h2 className="text-5xl md:text-6xl font-bold text-white mb-6">
          NFTs with{" "}
          <span className="bg-gradient-to-r from-violet-400 to-fuchsia-400 bg-clip-text text-transparent">
            Built-in Wealth
          </span>
        </h2>
        <p className="text-slate-400 text-xl max-w-2xl mx-auto mb-12">
          CVN-1 v3 introduces dual vaults: <strong className="text-indigo-400">Core</strong> for long-term value and{" "}
          <strong className="text-emerald-400">Rewards</strong> for claimable income.
        </p>

        {/* Action Cards */}
        <div className="grid md:grid-cols-3 gap-6 mb-16">
          {/* Create */}
          <Link
            href="/create"
            className="group relative overflow-hidden rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-violet-500/50 transition-all duration-300 hover:scale-[1.02] p-8"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <span className="text-5xl mb-4 block">🛠️</span>
              <h3 className="text-xl font-bold text-white mb-2">Create</h3>
              <p className="text-slate-400 text-sm">
                Deploy a collection with custom royalties and vault splits
              </p>
            </div>
          </Link>

          {/* Mint */}
          <Link
            href="/mint"
            className="group relative overflow-hidden rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-blue-500/50 transition-all duration-300 hover:scale-[1.02] p-8"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <span className="text-5xl mb-4 block">⚡</span>
              <h3 className="text-xl font-bold text-white mb-2">Mint</h3>
              <p className="text-slate-400 text-sm">
                Mint NFTs with automatic Core Vault seeding
              </p>
            </div>
          </Link>

          {/* Explore */}
          <Link
            href="/explore"
            className="group relative overflow-hidden rounded-2xl bg-slate-800/50 border border-slate-700/50 hover:border-emerald-500/50 transition-all duration-300 hover:scale-[1.02] p-8"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/10 to-teal-500/10 opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative">
              <span className="text-5xl mb-4 block">🔍</span>
              <h3 className="text-xl font-bold text-white mb-2">Explore</h3>
              <p className="text-slate-400 text-sm">
                View vaults, claim rewards, and burn-to-redeem
              </p>
            </div>
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-4 gap-6 text-left">
          {[
            { icon: "🔒", title: "Core Vault", desc: "Long-term value, burn to redeem", color: "indigo" },
            { icon: "🎁", title: "Rewards Vault", desc: "Claim anytime without burning", color: "emerald" },
            { icon: "💰", title: "Vault Royalties", desc: "Sales grow your Rewards Vault", color: "violet" },
            { icon: "🔥", title: "Burn & Redeem", desc: "Get both vaults at once", color: "red" },
          ].map((feature) => (
            <div key={feature.title} className="bg-slate-800/30 rounded-xl p-4 border border-slate-700/30">
              <span className="text-2xl">{feature.icon}</span>
              <h4 className="font-semibold text-white mt-2">{feature.title}</h4>
              <p className="text-sm text-slate-500">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 py-8">
        <div className="max-w-7xl mx-auto px-6 text-center text-slate-500 text-sm">
          <p>Deployed on Cedra Testnet</p>
          <p className="mt-2 font-mono text-xs">
            Contract: {CVN1_ADDRESS}
          </p>
        </div>
      </footer>
    </main>
  );
}
