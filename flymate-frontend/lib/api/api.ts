const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

interface ApiErrorResponse {
  error?: string;
}

let refresh_in_flight: Promise<string | null> | null = null;

// Calls /auth/refresh using the httpOnly refresh_token cookie (sent
// automatically via credentials: "include"). Multiple simultaneous 401s
// share one refresh call instead of firing several at once.
async function refresh_access_token(): Promise<string | null> {
  if (!refresh_in_flight) {
    refresh_in_flight = (async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
          method: "POST",
          credentials: "include",
        });
        if (!response.ok) return null;
        const data = await response.json();
        localStorage.setItem("access_token", data.access_token);
        return data.access_token as string;
      } catch {
        return null;
      } finally {
        refresh_in_flight = null;
      }
    })();
  }
  return refresh_in_flight;
}

async function raw_fetch(
  path: string,
  options: RequestInit,
  token: string | null,
) {
  return fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
}

export async function api_fetch<T = unknown>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  let response = await raw_fetch(path, options, token);

  // Access token expired mid-session — silently refresh and retry ONCE
  // before giving up. This is the fix for "keeps asking me to log in again
  // on reload."
  if (response.status === 401) {
    const new_token = await refresh_access_token();
    if (new_token) {
      response = await raw_fetch(path, options, new_token);
    }
  }

  const data = (await response.json().catch(() => ({}))) as T &
    ApiErrorResponse;

  if (!response.ok) {
    // If we get here, refresh also failed — the user's session is
    // genuinely gone (refresh_token cookie itself expired/revoked), not
    // just the short-lived access token.
    if (response.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("access_token");
    }
    throw new Error(data.error || "Something went wrong");
  }

  return data;
}
