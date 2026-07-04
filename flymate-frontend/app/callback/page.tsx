"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api_fetch } from "@/lib/api/api";

interface Booking {
  _id: string;
  status: "pending" | "confirmed" | "failed" | "cancelled";
  origin: string;
  destination: string;
  price: number;
}

const STATUS_COPY = {
  pending: { title: "Still confirming...", tone: "text-[var(--color-ink)]/60" },
  confirmed: { title: "Flight booked!", tone: "text-[var(--color-ink)]" },
  failed: { title: "Payment failed", tone: "text-[var(--color-coral)]" },
  cancelled: { title: "Booking cancelled", tone: "text-[var(--color-coral)]" },
};

function CallbackContent() {
  const params = useSearchParams();
  const booking_id = params.get("booking_id");
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!booking_id) return;

    let attempts = 0;
    const max_attempts = 10;
    let cancelled = false;

    async function poll() {
      try {
        const data = await api_fetch<{ booking: Booking }>(
          `/bookings/${booking_id}`,
        );
        if (cancelled) return;
        setBooking(data.booking);

        // The webhook can take a few seconds to arrive after the redirect
        // back from Nomba's hosted page — keep checking briefly while pending.
        if (data.booking.status === "pending" && attempts < max_attempts) {
          attempts += 1;
          setTimeout(poll, 2000);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Something went wrong");
        }
      }
    }

    poll();
    return () => {
      cancelled = true;
    };
  }, [booking_id]);

  if (error) {
    return <p className="text-[var(--color-coral)]">{error}</p>;
  }

  if (!booking) {
    return (
      <p className="text-[var(--color-ink)]/60">Checking your payment...</p>
    );
  }

  const status_copy = STATUS_COPY[booking.status];

  return (
    <div className="ticket-notch relative bg-white border-2 border-[var(--color-ink)] rounded-2xl w-full max-w-sm p-8 shadow-[6px_6px_0_0_var(--color-ink)] text-center">
      <p className={`font-display font-bold text-2xl ${status_copy.tone}`}>
        {status_copy.title}
      </p>
      <p className="text-sm text-[var(--color-ink)]/60 mt-2">
        {booking.origin} → {booking.destination} · ₦
        {booking.price.toLocaleString()}
      </p>
      {booking.status === "pending" && (
        <p className="text-xs text-[var(--color-ink)]/40 mt-4">
          This can take a few seconds — hang tight.
        </p>
      )}
    </div>
  );
}

export default function BookingCallbackPage() {
  return (
    <div className="max-w-5xl mx-auto px-6 py-16 flex justify-center">
      <Suspense
        fallback={<p className="text-[var(--color-ink)]/60">Loading...</p>}
      >
        <CallbackContent />
      </Suspense>
    </div>
  );
}
