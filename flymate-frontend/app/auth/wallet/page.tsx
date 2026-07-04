"use client";

import { useEffect, useState } from "react";
import { api_fetch } from "../../../lib/api/api";

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

  async function load_wallet() {
    setLoading(true);
    setError("");
    try {
      const data = await api_fetch<WalletResponse>("/wallet/me");
      setWallet(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load_wallet();
  }, []);

  if (loading) {
    return <div className="p-6 text-gray-500">Loading wallet...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-600">{error}</div>;
  }

  const va = wallet?.virtual_account;

  return (
    <div className="min-h-screen bg-gray-50 px-4 py-10">
      <div className="max-w-md mx-auto bg-white rounded-xl shadow p-6 space-y-6">
        <div>
          <p className="text-sm text-gray-500">Wallet balance</p>
          <p className="text-3xl font-semibold text-green-700">
            ₦{(wallet?.wallet_balance ?? 0).toLocaleString()}
          </p>
        </div>

        {va ? (
          <div className="border rounded-lg p-4 space-y-1 bg-gray-50">
            <p className="text-sm text-gray-500">
              Fund this wallet by transferring to:
            </p>
            <p className="font-medium">{va.bank_account_number}</p>
            <p className="text-sm">{va.bank_name}</p>
            <p className="text-sm text-gray-500">{va.bank_account_name}</p>
          </div>
        ) : (
          <p className="text-sm text-gray-500">
            No virtual account on file yet.
          </p>
        )}

        {/* Balance updates arrive via webhook asynchronously — this button
            just re-fetches, it doesn't trigger anything itself. */}
        <button
          onClick={load_wallet}
          className="w-full border border-green-700 text-green-700 rounded-lg py-2 font-medium hover:bg-green-50"
        >
          Refresh balance
        </button>
      </div>
    </div>
  );
}
