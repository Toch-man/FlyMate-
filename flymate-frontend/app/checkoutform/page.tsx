"use client";

import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api_fetch } from "@/lib/api/api";

interface CheckoutResponse {
  booking: { _id: string; status: string };
  checkout_link?: string;
  wallet_balance?: number;
}

function CheckoutForm() {
  const params = useSearchParams();
  const router = useRouter();

  // These come from wherever the user picked a flight (chat UI, eventually).
  // Sensible fallbacks here just so this page is testable before that exists.
  const origin = params.get("origin") ?? "LOS";
  const destination = params.get("destination") ?? "ABV";
  const depart_date =
    params.get("depart_date") ?? new Date().toISOString().slice(0, 10);
  const price = Number(params.get("price") ?? 45000);
  const offer_id = params.get("offer_id") ?? "demo_offer";

  const [payment_method, setPaymentMethod] = useState<"card" | "wallet">(
    "card",
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [wallet_success, setWalletSuccess] = useState<CheckoutResponse | null>(
    null,
  );

  async function handle_pay() {
    setLoading(true);
    setError("");
    try {
      const data = await api_fetch<CheckoutResponse>("/bookings/checkout", {
        method: "POST",
        body: JSON.stringify({
          offer_id,
          origin,
          destination,
          depart_date,
          price,
          payment_method,
        }),
      });

      if (payment_method === "card" && data.checkout_link) {
        // Hand off to Nomba's hosted page — card entry happens there, not here.
        window.location.href = data.checkout_link;
        return;
      }

      setWalletSuccess(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (wallet_success) {
    return (
      <div className="animate-in ticket-notch relative bg-white border-2 border-(--color-ink) rounded-2xl w-full max-w-sm p-8 shadow-[6px_6px_0_0_var(--color-ink)] text-center">
        <p className="font-display font-bold text-2xl">Flight booked!</p>
        <p className="text-sm text-(--color-ink)/60 mt-2">
          {origin} → {destination}, paid from your wallet.
        </p>
        <button
          onClick={() => router.push("/wallet")}
          className="btn-press w-full mt-6 bg-(--color-ink) text-(--color-bg) rounded-full py-3 font-display font-bold hover:bg-(--color-cobalt) transition-colors"
        >
          View wallet
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in ticket-notch relative bg-white border-2 border-(--color-ink) rounded-2xl w-full max-w-sm p-8 shadow-[6px_6px_0_0_var(--color-ink)]">
      <p className="text-xs uppercase tracking-wide text-(--color-ink)/50">
        Confirm & pay
      </p>
      <div className="flex items-center justify-between font-ticket text-3xl font-medium mt-2">
        <span>{origin}</span>
        <span className="text-(--color-coral)">→</span>
        <span>{destination}</span>
      </div>
      <p className="text-sm text-(--color-ink)/60 mt-1">{depart_date}</p>

      <div className="perforation my-6" />

      <p className="text-xs uppercase tracking-wide text-(--color-ink)/50">
        Total
      </p>
      <p className="font-ticket text-3xl font-medium">
        ₦{price.toLocaleString()}
      </p>

      <p className="text-sm font-medium mt-6 mb-3">Pay with</p>
      <div className="grid grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => setPaymentMethod("card")}
          className={`btn-press rounded-xl border-2 py-3 font-display font-bold transition-colors ${
            payment_method === "card"
              ? "border-(--color-ink) bg-(--color-lime)"
              : "border-(--color-ink)/20"
          }`}
        >
          Card
        </button>
        <button
          type="button"
          onClick={() => setPaymentMethod("wallet")}
          className={`btn-press rounded-xl border-2 py-3 font-display font-bold transition-colors ${
            payment_method === "wallet"
              ? "border-(--color-ink) bg-(--color-lime)"
              : "border-(--color-ink)/20"
          }`}
        >
          Wallet
        </button>
      </div>

      {error && (
        <p className="text-sm text-[var(--color-coral)] font-medium mt-4">
          {error}
        </p>
      )}

      <button
        type="button"
        onClick={handle_pay}
        disabled={loading}
        className="btn-press w-full mt-6 bg-[var(--color-ink)] text-[var(--color-bg)] rounded-full py-3 font-display font-bold hover:bg-[var(--color-cobalt)] transition-colors disabled:opacity-50"
      >
        {loading ? "Processing..." : `Pay ₦${price.toLocaleString()}`}
      </button>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <div className="relative max-w-5xl mx-auto px-6 py-16 flex justify-center overflow-hidden">
      <div className="bg-blob top-0 left-1/3 w-64 h-64 bg-[var(--color-cobalt)]" />
      <Suspense
        fallback={<p className="text-[var(--color-ink)]/60">Loading...</p>}
      >
        <CheckoutForm />
      </Suspense>
    </div>
  );
}
