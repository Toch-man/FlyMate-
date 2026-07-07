"use client";

import { useEffect, useState } from "react";
import { api_fetch } from "@/lib/api/api";

interface ReconciliationLog {
  _id: string;
  run_at: string;
  status: "clean" | "issues_found" | "error";
  discrepancy_count: number;
  error_message?: string;
}

const STATUS_STYLE = {
  clean: { label: "All matched", color: "bg-[var(--color-lime)]" },
  issues_found: {
    label: "Discrepancies found",
    color: "bg-[var(--color-coral)]/30",
  },
  error: { label: "Run failed", color: "bg-[var(--color-coral)]/50" },
};

export default function ReconciliationPage() {
  const [logs, setLogs] = useState<ReconciliationLog[] | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    api_fetch<{ logs: ReconciliationLog[] }>("/reconciliation")
      .then((data) => setLogs(data.logs))
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Something went wrong"),
      );
  }, []);

  if (error)
    return (
      <div className="p-10 text-center text-[var(--color-coral)]">{error}</div>
    );
  if (!logs)
    return (
      <div className="p-10 text-center text-[var(--color-ink)]/50">
        Loading...
      </div>
    );

  return (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <h1 className="font-display font-bold text-3xl mb-2">Reconciliation</h1>
      <p className="text-[var(--color-ink)]/60 mb-8">
        Nightly comparison between our records and Nomba's own transaction
        history.
      </p>

      {logs.length === 0 ? (
        <p className="text-[var(--color-ink)]/60">
          No reconciliation runs recorded yet.
        </p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => {
            const style = STATUS_STYLE[log.status];
            return (
              <div
                key={log._id}
                className="bg-white border-2 border-[var(--color-ink)]/10 rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <p className="text-sm font-medium">
                    {new Date(log.run_at).toLocaleString()}
                  </p>
                  {log.status === "issues_found" && (
                    <p className="text-xs text-[var(--color-ink)]/50 mt-1">
                      {log.discrepancy_count} discrepanc
                      {log.discrepancy_count === 1 ? "y" : "ies"}
                    </p>
                  )}
                  {log.status === "error" && log.error_message && (
                    <p className="text-xs text-[var(--color-coral)] mt-1">
                      {log.error_message}
                    </p>
                  )}
                </div>
                <span
                  className={`text-xs font-bold px-3 py-1 rounded-full ${style.color}`}
                >
                  {style.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
