"use client";

import { useEffect, useState } from "react";
import { api_fetch } from "@/lib/api/api";

interface VirtualAccount {
  account_ref?: string;
  bank_account_number?: string;
  bank_account_name?: string;
  bank_name?: string;
  currency?: string;
}

interface WalletResponse {
  wallet_balance: number;
  virtual_account: VirtualAccount | null;
}

export default function WalletPage() {
  const [wallet, setWallet] = useState<WalletResponse | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  async function load_wallet(is_refresh = false) {
    if (is_refresh) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const data = await api_fetch<WalletResponse>("/wallet/me");
      setWallet(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  useEffect(() => {
    load_wallet();
  }, []);

  if (loading) {
    return (
      <div className="p-10 text-center text-[var(--color-ink)]/50">
        Loading wallet...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center text-[var(--color-coral)] font-medium">
        {error}
      </div>
    );
  }

  const va = wallet?.virtual_account;

  return (
    <div className="relative max-w-5xl mx-auto px-6 py-16 flex justify-center overflow-hidden">
      <div className="bg-blob top-0 left-1/4 w-64 h-64 bg-[var(--color-lime)]" />
      <div className="bg-blob bottom-0 right-1/4 w-64 h-64 bg-[var(--color-coral)]" />

      <div className="animate-in ticket-notch relative bg-white border-2 border-[var(--color-ink)] rounded-2xl w-full max-w-sm p-8 shadow-[6px_6px_0_0_var(--color-ink)]">
        <p className="text-xs uppercase tracking-wide text-[var(--color-ink)]/50">
          Wallet balance
        </p>
        <p className="font-ticket text-4xl font-medium mt-1">
          ₦{(wallet?.wallet_balance ?? 0).toLocaleString()}
        </p>

        <div className="perforation my-6" />

        {va ? (
          <div className="bg-[var(--color-bg)] border-2 border-[var(--color-ink)]/10 rounded-xl p-4 space-y-1">
            <p className="text-xs uppercase tracking-wide text-[var(--color-ink)]/50">
              Fund this wallet by transferring to
            </p>
            <p className="font-ticket text-xl font-medium">
              {va.bank_account_number}
            </p>
            <p className="text-sm font-medium">{va.bank_name}</p>
            <p className="text-sm text-[var(--color-ink)]/60">
              {va.bank_account_name}
            </p>
          </div>
        ) : (
          <p className="text-sm text-[var(--color-ink)]/60">
            No virtual account on file yet.
          </p>
        )}

        <button
          onClick={() => load_wallet(true)}
          disabled={refreshing}
          className="btn-press w-full mt-6 border-2 border-[var(--color-ink)] rounded-full py-3 font-display font-bold hover:bg-[var(--color-lime)] transition-colors disabled:opacity-50"
        >
          {refreshing ? "Refreshing..." : "Refresh balance"}
        </button>
      </div>
    </div>
  );
}
