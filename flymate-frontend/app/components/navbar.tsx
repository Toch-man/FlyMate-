import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-[var(--color-bg)] sticky top-0 z-50 border-b-2 border-[var(--color-ink)]/5">
      <div className="max-w-5xl mx-auto px-6 py-5 flex items-center justify-between">
        <Link
          href="/"
          className="font-display font-bold text-xl tracking-tight flex items-center gap-1"
        >
          Fly<span className="bg-[var(--color-lime)] px-1 rounded">Mate</span>
        </Link>
        <div className="flex items-center gap-6 text-sm font-medium">
          <Link
            href="/chat"
            className="relative pb-1 hover:after:w-full after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-0 after:bg-[var(--color-cobalt)] after:transition-all after:duration-300"
          >
            Search flights
          </Link>
          <Link
            href="/auth/wallet"
            className="relative pb-1 hover:after:w-full after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-0 after:bg-[var(--color-cobalt)] after:transition-all after:duration-300"
          >
            Wallet
          </Link>
          <Link
            href="/auth/login"
            className="relative pb-1 hover:after:w-full after:absolute after:left-0 after:bottom-0 after:h-[2px] after:w-0 after:bg-[var(--color-cobalt)] after:transition-all after:duration-300"
          >
            Log in
          </Link>
          <Link
            href="/auth/register"
            className="btn-press bg-(--color-ink) text-(--color-bg) px-5 py-2 rounded-full font-display font-bold text-sm hover:bg-[var(--color-cobalt)] transition-colors"
          >
            Sign up
          </Link>
        </div>
      </div>
    </nav>
  );
}
