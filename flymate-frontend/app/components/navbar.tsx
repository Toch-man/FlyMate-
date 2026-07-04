import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="border-b bg-white">
      <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <Link href="/" className="text-xl font-semibold text-green-700">
          FlyMate
        </Link>
        <div className="flex items-center gap-4 text-sm font-medium">
          <Link href="/" className="text-gray-600 hover:text-green-700">
            Home
          </Link>
          <Link href="/wallet" className="text-gray-600 hover:text-green-700">
            Wallet
          </Link>
          <Link href="/login" className="text-gray-600 hover:text-green-700">
            Log in
          </Link>
          <Link
            href="/register"
            className="bg-green-700 text-white px-4 py-2 rounded-lg hover:bg-green-800"
          >
            Sign up
          </Link>
        </div>
      </div>
    </nav>
  );
}
