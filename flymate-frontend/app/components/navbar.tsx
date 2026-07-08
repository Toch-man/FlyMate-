"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api_fetch } from "@/lib/api/api";

export default function Navbar() {
  const router = useRouter();
  const [logged_in, setLoggedIn] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Just checking whether a token exists locally — good enough for
    // showing/hiding nav links. Actual API calls still enforce real auth
    // regardless of what the nav shows.
    setLoggedIn(!!localStorage.getItem("access_token"));
    setChecked(true);
  }, []);

  async function handle_logout() {
    try {
      await api_fetch("/auth/logout", { method: "POST" });
    } catch {
      // Even if the server call fails, still clear locally and redirect —
      // no reason to trap the user in a broken logged-in-looking state.
    }
    localStorage.removeItem("access_token");
    setLoggedIn(false);
    router.push("/auth/login");
  }

  return (
    <nav className="bg-(--color-bg) sticky top-0 z-50 border-b-2 border-(--color-ink)/5">
      <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link
          href="/"
          className="font-display font-bold text-xl tracking-tight flex items-center gap-1"
        >
          Fly<span className="bg-(--color-lime) px-1 rounded">Mate</span>
        </Link>

        {/* Avoid a flash of the wrong state before we've checked localStorage */}
        {!checked ? null : logged_in ? (
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link
              href="/dashboard"
              className="relative pb-1 hover:after:w-full after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-0 after:bg-(--color-cobalt) after:transition-all after:duration-300"
            >
              Dashboard
            </Link>
            <Link
              href="/chat"
              className="relative pb-1 hover:after:w-full after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-0 after:bg-(--color-cobalt) after:transition-all after:duration-300"
            >
              Search flights
            </Link>
            <Link
              href="/auth/wallet"
              className="relative pb-1 hover:after:w-full after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-0 after:bg-(--color-cobalt) after:transition-all after:duration-300"
            >
              Wallet
            </Link>
            <button
              onClick={handle_logout}
              className="btn-press bg-(--color-ink) text-(--color-bg) px-5 py-2 rounded-full font-display font-bold text-sm hover:bg-(--color-coral) transition-colors"
            >
              Log out
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-6 text-sm font-medium">
            <Link
              href="/auth/login"
              className="relative pb-1 hover:after:w-full after:absolute after:left-0 after:bottom-0 after:h-0.5 after:w-0 after:bg-(--color-cobalt) after:transition-all after:duration-300"
            >
              Log in
            </Link>
            <Link
              href="/auth/register"
              className="btn-press bg-(--color-ink)] text-(--color-bg) px-5 py-2 rounded-full font-display font-bold text-sm hover:bg-(--color-cobalt) transition-colors"
            >
              Sign up
            </Link>
          </div>
        )}
      </div>
    </nav>
  );
}
