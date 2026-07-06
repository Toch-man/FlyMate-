"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api_fetch } from "../../../lib/api/api";

interface LoginForm {
  email: string;
  password: string;
}

interface LoginResponse {
  access_token: string;
  user: { id: string; full_name: string; email: string };
}

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState<LoginForm>({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handle_submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const data = await api_fetch<LoginResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(form),
      });
      localStorage.setItem("access_token", data.access_token);
      router.push("/auth/wallet");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative max-w-5xl mx-auto px-6 py-16 flex justify-center overflow-hidden">
      <div className="bg-blob top-0 left-1/3 w-64 h-64 bg-(--color-cobalt)" />

      <form
        onSubmit={handle_submit}
        className="animate-in ticket-notch relative bg-white border-2 border-(--color-ink) rounded-2xl w-full max-w-sm p-8 shadow-[6px_6px_0_0_var(--color-ink)]"
      >
        <h1 className="font-display font-bold text-2xl">Welcome back</h1>
        <p className="text-sm text-(--color-ink)/60 mt-1">
          Log in to keep booking.
        </p>

        <div className="perforation my-6" />

        {error && (
          <p className="text-sm text-(--color-coral) font-medium mb-4">
            {error}
          </p>
        )}

        <div className="space-y-5">
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
        </div>

        <button
          type="submit"
          disabled={loading}
          className="btn-press w-full mt-8 bg-(--color-ink) text-(--color-bg) rounded-full py-3 font-display font-bold hover:bg-(--color-cobalt) transition-colors disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>

        <p className="text-sm text-center text-(--color-ink)/60 mt-5">
          No account yet?{" "}
          <a
            href="/auth/register"
            className="font-medium text-(--color-cobalt)"
          >
            Sign up
          </a>
        </p>
      </form>
    </div>
  );
}
