import React, { useMemo, useState } from "react";
import { submitReview, getToken } from "../lib/reviewsApi";
import { Link } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

export default function ReviewForm({
  targetId,
  targetType = "property",
}: {
  targetId: string;
  targetType?: string;
}) {
  const token = useMemo(() => getToken(), []);
  const { toast } = useToast();
  const [rating, setRating] = useState<number>(0);
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [pendingNote, setPendingNote] = useState<string>("");

  if (!token) {
    return (
      <div className="mt-4 text-sm">
        <span className="text-gray-600">Login to write a review. </span>
        <Link to="/user-login" className="text-[#C70000] hover:underline">
          Login
        </Link>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rating || rating < 1 || rating > 5) {
      toast({
        title: "Rating required",
        description: "Please select 1-5 stars",
      });
      return;
    }
    if (comment.trim().length < 10 || comment.trim().length > 600) {
      toast({
        title: "Comment length",
        description: "Please write 10–600 characters",
      });
      return;
    }

    setSubmitting(true);
    try {
      const res = await submitReview({
        targetId,
        targetType,
        rating,
        title: title.trim() || undefined,
        comment: comment.trim(),
      });
      if (res.ok) {
        toast({
          title: "Submitted for approval",
          description: "Your review will appear after approval.",
        });
        setRating(0);
        setTitle("");
        setComment("");
        setPendingNote("Your review is pending approval.");
      } else {
        const msg =
          res.status === "401" || res.status === "403"
            ? "Please login to submit a review."
            : "Please try again later.";
        toast({ title: "Submission failed", description: msg });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mt-4">
      {pendingNote && (
        <div className="text-xs text-gray-500 mb-2" aria-live="polite">
          {pendingNote}
        </div>
      )}
      <form
        onSubmit={onSubmit}
        className="rounded-xl shadow-sm border p-4 bg-white"
      >
        <label className="block text-sm font-medium mb-1">Rating</label>
        <div className="flex items-center space-x-2 mb-3">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              type="button"
              aria-label={`Rate ${s}`}
              onClick={() => setRating(s)}
              className={`text-2xl ${s <= rating ? "text-amber-400" : "text-gray-300"}`}
            >
              ★
            </button>
          ))}
        </div>

        <label className="block text-sm font-medium mb-1" htmlFor="title">
          Title (optional)
        </label>
        <input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value.slice(0, 80))}
          className="w-full border rounded-md px-3 py-2 mb-3"
          placeholder="e.g., Great experience"
        />

        <label className="block text-sm font-medium mb-1" htmlFor="comment">
          Comment
        </label>
        <textarea
          id="comment"
          value={comment}
          onChange={(e) => setComment(e.target.value.slice(0, 600))}
          className="w-full border rounded-md px-3 py-2 h-24 mb-3"
          placeholder="Share details about your experience"
        />

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="bg-[#C70000] hover:bg-red-700 disabled:opacity-50 text-white px-4 py-2 rounded-md"
          >
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      </form>
    </div>
  );
}
