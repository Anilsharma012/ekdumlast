import React, { useEffect, useRef, useState } from "react";
import { adminListPending, adminModerate } from "../lib/reviewsApi";
import { useToast } from "@/hooks/use-toast";

interface ReviewItem {
  id: string;
  targetId: string;
  targetType: string;
  userName?: string;
  rating: number;
  title?: string;
  comment: string;
  createdAt?: string;
}

export default function AdminReviewsModeration() {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();
  const abortRef = useRef<AbortController | null>(null);

  const load = async () => {
    try {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const data = await adminListPending({ signal: abortRef.current.signal });
      setItems(Array.isArray(data) ? data : []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    return () => abortRef.current?.abort();
  }, []);

  const act = async (id: string, status: "approved" | "rejected") => {
    let adminNote: string | undefined;
    if (status === "rejected") {
      adminNote = window.prompt("Reason (optional)") || undefined;
    }
    const ok = await adminModerate(id, status, adminNote);
    if (ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      toast({ title: status === "approved" ? "Approved" : "Rejected" });
    } else {
      toast({ title: "Action failed", description: "Try again" });
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Reviews Moderation</h1>
      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-600">No pending reviews.</div>
      ) : (
        <div className="grid gap-3">
          {items.map((r) => (
            <div
              key={r.id}
              className="rounded-xl shadow-sm border p-4 bg-white"
            >
              <div className="flex justify-between mb-1">
                <div className="font-medium">{r.userName || "User"}</div>
                <div className="text-amber-400">
                  {"★".repeat(Math.max(1, Math.min(5, Number(r.rating) || 0)))}
                </div>
              </div>
              {r.title && (
                <div className="text-sm font-semibold mb-1">{r.title}</div>
              )}
              <div className="text-sm text-gray-700 whitespace-pre-line mb-2">
                {r.comment}
              </div>
              <div className="text-xs text-gray-400 mb-3">
                Target: {r.targetType} • {r.targetId}
              </div>
              <div className="flex gap-2">
                <button
                  aria-label="Approve"
                  onClick={() => act(r.id, "approved")}
                  className="px-3 py-1 rounded-md bg-green-600 text-white text-sm"
                >
                  Approve
                </button>
                <button
                  aria-label="Reject"
                  onClick={() => act(r.id, "rejected")}
                  className="px-3 py-1 rounded-md bg-red-600 text-white text-sm"
                >
                  Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
