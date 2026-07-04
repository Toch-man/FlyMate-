const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ApiErrorResponse {
  error?: string;
}

// Both the access_token and refresh_token live in httpOnly cookies set by
// the backend. The browser sends them automatically on every request thanks
// to `credentials: "include"` — we never touch them from JavaScript.
export async function api_fetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",

      ...options.headers,
    },
  });

  const data = (await response.json().catch(() => ({}))) as T &
    ApiErrorResponse;

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data;
}
