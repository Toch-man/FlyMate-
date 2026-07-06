import Link from "next/link";

export default function HomePage() {
  return (
    <div className="relative max-w-5xl mx-auto px-6 py-16 md:py-24 grid md:grid-cols-2 gap-16 items-center overflow-hidden">
      <div className="bg-blob top-0 left-1/4 w-72 h-72 bg-(--color-lime)" />
      <div className="bg-blob bottom-0 right-1/4 w-72 h-72 bg-(--color-cobalt)" />

      {/* Left: the thesis */}
      <div className="animate-in">
        <span className="inline-block bg-(--color-coral) text-white text-xs font-bold px-3 py-1 rounded-full mb-4">
          AI-powered · Nigeria
        </span>
        <h1 className="font-display font-bold text-5xl md:text-6xl leading-[1.05] tracking-tight">
          Budget flights,
          <br />
          found in{" "}
          <span className="relative inline-block">
            seconds.
            <span className="absolute left-0 right-0 bottom-1 h-3 bg-(--color-lime) -z-10" />
          </span>
        </h1>
        <p className="mt-6 text-lg text-(--color-ink)/70 max-w-md">
          Tell FlyMate your budget and where you're headed. It searches, picks
          the best options, and books the flight — you just confirm.
        </p>
        <div className="mt-8 flex items-center gap-4">
          <Link
            href="/register"
            className="btn-press bg-(--color-ink) text-(--color-bg) px-6 py-3 rounded-full font-display font-bold hover:bg-(--color-cobalt) transition-colors"
          >
            Get started
          </Link>
          <Link
            href="/login"
            className="btn-press px-6 py-3 rounded-full font-display font-bold border-2 border-(--color-ink) hover:border-(--color-cobalt) hover:text-(--color-cobalt) transition-colors"
          >
            Log in
          </Link>
        </div>
      </div>

      {/* Right: the signature element — a boarding-pass stub, now floating */}
      <div className="flex justify-center md:justify-end">
        <div className="animate-float">
          <div className="ticket-notch animate-glow relative bg-white border-2 border-(--color-ink) rounded-2xl w-full max-w-sm p-6 shadow-[6px_6px_0_0_var(--color-ink)] transition-transform duration-300">
            <div className="flex items-center justify-between font-ticket text-3xl font-medium">
              <span>LOS</span>
              <span className="text-(--color-coral)">→</span>
              <span>ABV</span>
            </div>
            <p className="mt-1 text-sm text-(--color-ink)/60">
              Lagos to Abuja · Nonstop
            </p>

            <div className="perforation my-5" />

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-wide text-(--color-ink)/50">
                  Best price found
                </p>
                <p className="font-ticket text-2xl font-medium">₦38,000</p>
              </div>
              <span className="bg-(--color-lime) text-(--color-ink) text-xs font-bold px-3 py-1 rounded-full">
                Picked by AI
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
