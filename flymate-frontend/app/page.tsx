import Link from "next/link";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-4xl font-bold text-gray-900">
          Find and book flights that fit your{" "}
          <span className="text-green-700">budget</span>.
        </h1>
        <p className="text-gray-600 text-lg">
          FlyMate is an AI-powered flight assistant for Nigeria — tell it your
          budget and preferences, and it finds and books the flight for you.
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <Link
            href="/auth/register"
            className="bg-green-700 text-white px-6 py-3 rounded-lg font-medium hover:bg-green-800"
          >
            Get started
          </Link>
          <Link
            href="/auth/login"
            className="border border-green-700 text-green-700 px-6 py-3 rounded-lg font-medium hover:bg-green-50"
          >
            Log in
          </Link>
        </div>
      </div>
    </div>
  );
}
