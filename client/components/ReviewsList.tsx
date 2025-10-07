import React, { useEffect, useMemo, useRef, useState } from "react";
import { fetchApprovedReviews } from "../lib/reviewsApi";
import { formatDistanceToNow } from "date-fns";

interface ReviewItem {
  id: string;
  targetId: string;
  targetType: string;
  userId?: string;
  userName?: string;
  rating: number; // 1..5
  title?: string;
  comment: string;
  images?: string[];
  status: "pending" | "approved" | "rejected";
  createdAt?: string;
  updatedAt?: string;
}

export default function ReviewsList({
  targetId,
  targetType = "property",
  limit = 20,
}: {
  targetId: string;
  targetType?: string;
  limit?: number;
}) {
  const [items, setItems] = useState<ReviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const abortRef = useRef<AbortController | null>(null);

  const load = async () => {
    try {
      abortRef.current?.abort();
      abortRef.current = new AbortController();
      const data = await fetchApprovedReviews({
        targetId,
        targetType,
        limit,
        signal: abortRef.current.signal,
      });
      setItems(
        Array.isArray(data)
          ? data.filter((r: any) => r.status === "approved")
          : [],
      );
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    load();
    const iv = setInterval(load, 2.5 * 60 * 1000);
    return () => {
      clearInterval(iv);
      abortRef.current?.abort();
    };
  }, [targetId, targetType, limit]);

  const avg = useMemo(() => {
    if (!items.length) return 0;
    const s = items.reduce((a, r) => a + (Number(r.rating) || 0), 0);
    return Math.round((s / items.length) * 10) / 10;
  }, [items]);

  if (loading) return null;

  return (
    <div className="mt-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Reviews</h3>
        <div className="text-sm">
          <span className="text-amber-400 mr-1">★ {avg || 0}</span>
          <span className="text-gray-500">({items.length})</span>
        </div>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-gray-600">Be the first to review.</p>
      ) : (
        <div className="space-y-3">
          {items.map((r) => (
            <div
              key={r.id}
              className="rounded-xl shadow-sm border p-4 bg-white"
            >
              <div className="flex items-center justify-between mb-1">
                <div className="font-medium text-sm">
                  {r.userName || "User"}
                </div>
                <div className="text-amber-400 text-sm">
                  {"★".repeat(Math.max(1, Math.min(5, Number(r.rating) || 0)))}
                </div>
              </div>
              {r.title && (
                <div className="text-sm font-semibold mb-1">{r.title}</div>
              )}
              <p className="text-sm text-gray-700 whitespace-pre-line">
                {r.comment}
              </p>
              <div className="text-xs text-gray-400 mt-2">
                {r.createdAt
                  ? formatDistanceToNow(new Date(r.createdAt), {
                      addSuffix: true,
                    })
                  : ""}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
