"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api_fetch } from "@/lib/api/api";

interface RegisterForm {
  full_name: string;
  email: string;
  password: string;
  phone_number: string;
}

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState<RegisterForm>({
    full_name: "",
    email: "",
    password: "",
    phone_number: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handle_submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await api_fetch("/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      router.push("/auth/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative max-w-5xl mx-auto px-6 py-16 flex justify-center overflow-hidden">
      <div className="bg-blob top-0 right-1/3 w-64 h-64 bg-(--color-lime)" />

      <form
        onSubmit={handle_submit}
        className="animate-in ticket-notch relative bg-white border-2 border-(--color-ink) rounded-2xl w-full max-w-sm p-8 shadow-[6px_6px_0_0_var(--color-ink)]"
      >
        <h1 className="font-display font-bold text-2xl">Get on board</h1>
        <p className="text-sm text-(--color-ink)/60 mt-1">
          Create your account, we'll set up your wallet too.
        </p>

        <div className="perforation my-6" />

        {error && (
          <p className="text-sm text-(--color-coral) font-medium mb-4">
            {error}
          </p>
        )}

        <div className="space-y-5">
          <input
            type="text"
            placeholder="Full name"
            className="w-full border-b-2 border-(--color-ink)/20 focus:border-(--color-cobalt) outline-none py-2 bg-transparent transition-colors"
            value={form.full_name}
            onChange={(e) => setForm({ ...form, full_name: e.target.value })}
            required
          />
          <input
            type="email"
            placeholder="Email"
            className="w-full border-b-2 border-(--color-ink)/20 focus:border-(--color-cobalt) outline-none py-2 bg-transparent transition-colors"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="w-full border-b-2 border-(--color-ink)/20 focus:border-(--color-cobalt) outline-none py-2 bg-transparent transition-colors"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <input
            type="tel"
            placeholder="Phone number (optional)"
            className="w-full border-b-2 border-(--color-ink)/20 focus:border-(--color-cobalt) outline-none py-2 bg-transparent transition-colors"
            value={form.phone_number}
            onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-press w-full mt-8 bg-(--color-ink) text-(--color-bg) rounded-full py-3 font-display font-bold hover:bg-(--color-cobalt) transition-colors disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>

        <p className="text-sm text-center text-(--color-ink)/60 mt-5">
          Already have an account?{" "}
          <a href="/auth/login" className="font-medium text-(--color-cobalt)">
            Log in
          </a>
        </p>
      </form>
    </div>
  );
}
