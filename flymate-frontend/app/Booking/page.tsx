"use client";

import { useEffect, useState } from "react";
import { api_fetch } from "@/lib/api/api";

interface Booking {
  _id: string;
  origin: string;
  destination: string;
  depart_date: string;
  price: number;
  status: string;
  payment_method: string;
  duffel_order_id?: string;
}

export default function BookingsPage() {
  const [bookings, setBookings] = useState<Booking[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api_fetch<{ bookings: Booking[] }>("/bookings")
      .then((data) => setBookings(data.bookings))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Something went wrong"),
      );
  }, []);

  if (error)
    return (
      <div className="p-10 text-center text-[var(--color-coral)]">{error}</div>
    );
  if (!bookings)
    return (
      <div className="p-10 text-center text-[var(--color-ink)]/50">
        Loading...
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-display font-bold text-3xl mb-8">Your bookings</h1>

      {bookings.length === 0 ? (
        <p className="text-[var(--color-ink)]/60">
          No bookings yet — go search a flight.
        </p>
      ) : (
        <div className="space-y-4">
          {bookings.map((booking, idx) => (
            <div
              key={booking._id}
              style={{ animationDelay: `${idx * 60}ms` }}
              className="animate-in ticket-notch relative bg-white border-2 border-[var(--color-ink)] rounded-2xl p-5"
            >
              <div className="flex items-center justify-between font-ticket text-xl font-medium">
                <span>{booking.origin}</span>
                <span className="text-[var(--color-coral)]">→</span>
                <span>{booking.destination}</span>
              </div>
              <p className="text-sm text-[var(--color-ink)]/60 mt-1">
                {new Date(booking.depart_date).toLocaleDateString()} · Paid by{" "}
                {booking.payment_method}
              </p>

              <div className="perforation my-4" />

              <div className="flex items-center justify-between">
                <p className="font-ticket text-2xl font-medium">
                  ₦{booking.price.toLocaleString()}
                </p>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${
                    booking.status === "confirmed"
                      ? "bg-[var(--color-lime)]"
                      : booking.status === "pending"
                        ? "bg-[var(--color-ink)]/10"
                        : "bg-[var(--color-coral)]/20 text-[var(--color-coral)]"
                  }`}
                >
                  {booking.status}
                </span>
              </div>

              {booking.duffel_order_id && (
                <p className="text-xs text-[var(--color-ink)]/40 mt-3">
                  Order ref: {booking.duffel_order_id}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
