const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

// The access_token is kept in localStorage (survives a page refresh). The
// refresh_token itself lives in an httpOnly cookie your browser sends
// automatically — we never touch that directly, `credentials: "include"`
// just makes sure it's included on requests.
export async function api_fetch(path, options = {}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("access_token") : null;

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || "Something went wrong");
  }

  return data;
}
