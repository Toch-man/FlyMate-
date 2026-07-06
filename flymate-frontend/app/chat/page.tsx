"use client";

import { useState, FormEvent, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { api_fetch } from "@/lib/api/api";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface FlightOption {
  offer_id: string;
  airline: string;
  origin: string;
  destination: string;
  depart_date: string;
  price: number;
  currency?: string;
  stops: number;
}

interface ChatResponse {
  reply: string;
  flight_options: FlightOption[] | null;
}

export default function ChatPage() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content:
        "Hey! Tell me where you're flying from, where to, when, and your budget — I'll find your best options.",
    },
  ]);
  const [flight_options, setFlightOptions] = useState<FlightOption[] | null>(
    null,
  );
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const bottom_ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottom_ref.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, flight_options]);

  async function handle_submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!input.trim()) return;

    const user_message: ChatMessage = { role: "user", content: input };
    const history = messages; // history BEFORE this new message
    setMessages((prev) => [...prev, user_message]);
    setInput("");
    setError("");
    setLoading(true);
    setFlightOptions(null);

    try {
      const data = await api_fetch<ChatResponse>("/agent/chat", {
        method: "POST",
        body: JSON.stringify({ message: user_message.content, history }),
      });

      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: data.reply },
      ]);
      setFlightOptions(data.flight_options);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  function book_flight(flight: FlightOption) {
    const params = new URLSearchParams({
      offer_id: flight.offer_id,
      origin: flight.origin,
      destination: flight.destination,
      depart_date: flight.depart_date,
      price: String(flight.price),
    });
    router.push(`/checkout?${params.toString()}`);
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 flex flex-col h-[calc(100vh-88px)]">
      {/* Conversation */}
      <div className="flex-1 overflow-y-auto space-y-4 pb-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
          >
            <div
              className={`max-w-[80%] px-4 py-3 rounded-2xl text-sm ${
                msg.role === "user"
                  ? "bg-(--color-ink) text-(--color-bg)"
                  : "bg-white border-2 border-(--color-ink)/10"
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex justify-start">
            <div className="max-w-[80%] px-4 py-3 rounded-2xl text-sm bg-white border-2 border-(--color-ink)/10 text-(--color-ink)/50">
              Searching...
            </div>
          </div>
        )}

        {/* Flight option cards, in the same ticket-stub style as the rest
            of the app */}
        {flight_options && flight_options.length > 0 && (
          <div className="space-y-3">
            {flight_options.map((flight, idx) => (
              <div
                key={flight.offer_id}
                style={{ animationDelay: `${idx * 80}ms` }}
                className="animate-in ticket-notch relative bg-white border-2 border-(--color-ink) rounded-2xl p-5"
              >
                <div className="flex items-center justify-between font-ticket text-xl font-medium">
                  <span>{flight.origin}</span>
                  <span className="text-(--color-coral)">→</span>
                  <span>{flight.destination}</span>
                </div>
                <p className="text-sm text-(--color-ink)/60 mt-1">
                  {flight.airline} ·{" "}
                  {flight.stops === 0 ? "Nonstop" : `${flight.stops} stop(s)`}
                </p>

                <div className="perforation my-4" />

                <div className="flex items-center justify-between">
                  <p className="font-ticket text-2xl font-medium">
                    ₦{flight.price.toLocaleString()}
                  </p>
                  <button
                    type="button"
                    onClick={() => book_flight(flight)}
                    className="btn-press bg-(--color-lime) text-(--color-ink) px-5 py-2 rounded-full font-display font-bold text-sm hover:bg-(--color-cobalt) hover:text-white transition-colors"
                  >
                    Book this
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="text-sm text-(--color-coral) font-medium">{error}</p>
        )}
        <div ref={bottom_ref} />
      </div>

      {/* Input */}
      <form onSubmit={handle_submit} className="flex gap-3 pt-4">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Lagos to Abuja, July 10, budget 50000"
          className="flex-1 border-2 border-(--color-ink)/20 focus:border-(--color-cobalt) rounded-full px-5 py-3 outline-none transition-colors"
        />
        <button
          type="submit"
          disabled={loading}
          className="btn-press bg-(--color-ink) text-(--color-bg) px-6 py-3 rounded-full font-display font-bold hover:bg-(--color-cobalt) transition-colors disabled:opacity-50"
        >
          Send
        </button>
      </form>
    </div>
  );
}
