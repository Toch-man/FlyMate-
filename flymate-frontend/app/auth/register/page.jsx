"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api_fetch } from "../../../lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    password: "",
    phone_number: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handle_submit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      // Registration also creates the user's Nomba virtual account on the
      // backend — this call can take a couple seconds, that's expected.
      await api_fetch("/auth/register", {
        method: "POST",
        body: JSON.stringify(form),
      });
      router.push("/login");
    } catch (err) {
      setError(err.message);
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
          Create your FlyMate account
        </h1>
        {error && <p className="text-sm text-red-600">{error}</p>}

        <input
          type="text"
          placeholder="Full name"
          className="w-full border rounded-lg px-3 py-2"
          value={form.full_name}
          onChange={(e) => setForm({ ...form, full_name: e.target.value })}
          required
        />
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
        <input
          type="tel"
          placeholder="Phone number (optional)"
          className="w-full border rounded-lg px-3 py-2"
          value={form.phone_number}
          onChange={(e) => setForm({ ...form, phone_number: e.target.value })}
        />

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-700 text-white rounded-lg py-2 font-medium disabled:opacity-50"
        >
          {loading ? "Creating account..." : "Sign up"}
        </button>

        <p className="text-sm text-center text-gray-500">
          Already have an account?{" "}
          <a href="/login" className="text-green-700 font-medium">
            Log in
          </a>
        </p>
      </form>
    </div>
  );
}
