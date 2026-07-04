"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { api_fetch } from "../../../lib/api/api";

interface LoginForm {
  email: string;
  password: string;
}

interface LoginResponse {
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
      router.push("/auth/wallet");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <form
        onSubmit={handle_submit}
        className="w-full max-w-sm bg-white p-6 rounded-xl shadow space-y-4"
      >
        <h1 className="text-xl font-semibold text-green-700">
          Log in to FlyMate
        </h1>
        {error && <p className="text-sm text-red-600">{error}</p>}

        <input
          type="email"
          placeholder="Email"
          className="w-full border rounded-lg px-3 py-2"
          value={form.email}
          onChange={(e) => setForm({ ...form, email: e.target.value })}
          required
        />
        <input
          type="password"
          placeholder="Password"
          className="w-full border rounded-lg px-3 py-2"
          value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })}
          required
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-700 text-white rounded-lg py-2 font-medium disabled:opacity-50"
        >
          {loading ? "Logging in..." : "Log in"}
        </button>

        <p className="text-sm text-center text-gray-500">
          No account yet?{" "}
          <a href="/register" className="text-green-700 font-medium">
            Sign up
          </a>
        </p>
      </form>
    </div>
  );
}
