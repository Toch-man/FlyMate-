"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { api_fetch } from "@/lib/api/api";

interface Booking {
  _id: string;
  origin: string;
  destination: string;
  price: number;
  status: string;
}

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  status: string;
  narration: string;
  created_at: string;
}

interface DashboardSummary {
  full_name: string;
  wallet_balance: number;
  booking_count: number;
  recent_bookings: Booking[];
  recent_transactions: Transaction[];
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api_fetch<DashboardSummary>("/dashboard")
      .then(setSummary)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Something went wrong"),
      );
  }, []);

  if (error)
    return (
      <div className="p-10 text-center text-[var(--color-coral)]">{error}</div>
    );
  if (!summary)
    return (
      <div className="p-10 text-center text-[var(--color-ink)]/50">
        Loading...
      </div>
    );

  return (
    <div className="relative max-w-5xl mx-auto px-6 py-12 overflow-hidden">
      <div className="bg-blob top-0 left-1/4 w-64 h-64 bg-[var(--color-lime)]" />

      <div className="animate-in">
        <p className="text-sm text-[var(--color-ink)]/60">Welcome back,</p>
        <h1 className="font-display font-bold text-3xl">{summary.full_name}</h1>
      </div>

      {/* Top stats row */}
      <div className="grid grid-cols-2 gap-4 mt-8">
        <Link
          href="/auth/wallet"
          className="ticket-notch bg-white border-2 border-[var(--color-ink)] rounded-2xl p-5 hover:bg-[var(--color-lime)]/20 transition-colors"
        >
          <p className="text-xs uppercase tracking-wide text-[var(--color-ink)]/50">
            Wallet balance
          </p>
          <p className="font-ticket text-2xl font-medium mt-1">
            ₦{summary.wallet_balance.toLocaleString()}
          </p>
        </Link>
        <Link
          href="/Booking"
          className="ticket-notch bg-white border-2 border-[var(--color-ink)] rounded-2xl p-5 hover:bg-[var(--color-cobalt)]/10 transition-colors"
        >
          <p className="text-xs uppercase tracking-wide text-[var(--color-ink)]/50">
            Total bookings
          </p>
          <p className="font-ticket text-2xl font-medium mt-1">
            {summary.booking_count}
          </p>
        </Link>
      </div>

      {/* Recent bookings */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-lg">Recent bookings</h2>
          <Link
            href="/Booking"
            className="text-sm font-medium text-[var(--color-cobalt)]"
          >
            View all →
          </Link>
        </div>
        {summary.recent_bookings.length === 0 ? (
          <p className="text-sm text-[var(--color-ink)]/50">No bookings yet.</p>
        ) : (
          <div className="space-y-3">
            {summary.recent_bookings.map((booking) => (
              <div
                key={booking._id}
                className="bg-white border-2 border-[var(--color-ink)]/10 rounded-xl p-4 flex items-center justify-between"
              >
                <p className="font-ticket font-medium">
                  {booking.origin} → {booking.destination}
                </p>
                <div className="flex items-center gap-3">
                  <p className="text-sm text-[var(--color-ink)]/60">
                    ₦{booking.price.toLocaleString()}
                  </p>
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded-full ${
                      booking.status === "confirmed"
                        ? "bg-[var(--color-lime)]"
                        : "bg-[var(--color-ink)]/10"
                    }`}
                  >
                    {booking.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent transactions / reconciliation link */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-bold text-lg">
            Recent transactions
          </h2>
          <Link
            href="/reconciliation"
            className="text-sm font-medium text-[var(--color-cobalt)]"
          >
            Reconciliation status →
          </Link>
        </div>
        {summary.recent_transactions.length === 0 ? (
          <p className="text-sm text-[var(--color-ink)]/50">
            No transactions yet.
          </p>
        ) : (
          <div className="space-y-3">
            {summary.recent_transactions.map((tx) => (
              <div
                key={tx._id}
                className="bg-white border-2 border-[var(--color-ink)]/10 rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium">{tx.narration}</p>
                  <p className="text-xs text-[var(--color-ink)]/50">
                    {new Date(tx.created_at).toLocaleDateString()}
                  </p>
                </div>
                <p className="font-ticket font-medium">
                  ₦{tx.amount.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
