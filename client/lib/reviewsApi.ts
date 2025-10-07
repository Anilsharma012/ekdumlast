import { apiRequest, createApiUrl } from "./api";

function getToken(): string | null {
  try {
    return localStorage.getItem("token") || (window as any).__JWT__ || null;
  } catch {
    return (window as any).__JWT__ || null;
  }
}

function headers() {
  const t = getToken();
  const h: Record<string, string> = { "Content-Type": "application/json" };
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

export async function fetchApprovedReviews({
  targetId,
  targetType = "property",
  limit = 20,
  signal,
}: {
  targetId: string;
  targetType?: string;
  limit?: number;
  signal?: AbortSignal;
}): Promise<any[]> {
  try {
    // Primary API (reviews)
    const url = `reviews?targetId=${encodeURIComponent(targetId)}&targetType=${encodeURIComponent(
      targetType,
    )}&status=approved&limit=${limit}`;
    const res = await apiRequest(url, { method: "GET", signal });
    if (res.ok) {
      const data = Array.isArray(res.data) ? res.data : res.data?.data;
      return Array.isArray(data) ? data : [];
    }
    // Fallback to testimonials (public)
    const tf = await apiRequest(
      `testimonials?propertyId=${encodeURIComponent(targetId)}`,
      { method: "GET", signal },
    );
    if (!tf.ok) return [];
    const raw = Array.isArray(tf.data?.data)
      ? tf.data.data
      : tf.data?.testimonials || tf.data;
    const arr = Array.isArray(raw) ? raw : [];
    return arr.map((t: any) => ({
      id: t._id || t.id,
      targetId,
      targetType: targetType,
      userName: t.name,
      rating: t.rating,
      title: t.title,
      comment: t.comment,
      status: t.status || "approved",
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  } catch {
    return [];
  }
}

export async function submitReview(
  payload: {
    targetId: string;
    targetType: string;
    rating: number;
    title?: string;
    comment: string;
    images?: string[];
  },
  { signal }: { signal?: AbortSignal } = {},
): Promise<{ ok: boolean; status: string }> {
  try {
    // Primary API (reviews)
    const res = await apiRequest("reviews", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(payload),
      signal,
    });
    if (res.ok) {
      const status = res.data?.data?.status || res.data?.status || "pending";
      return { ok: true, status };
    }
    // Fallback to testimonials
    const body: any = {
      rating: payload.rating,
      comment: payload.comment,
    };
    if (payload.targetType === "property") body.propertyId = payload.targetId;
    if (payload.targetType === "seller") body.sellerId = payload.targetId;

    const ts = await apiRequest("testimonials", {
      method: "POST",
      headers: headers(),
      body: JSON.stringify(body),
      signal,
    });
    if (!ts.ok) return { ok: false, status: String(ts.status) };
    return { ok: true, status: "pending" };
  } catch {
    return { ok: false, status: "error" };
  }
}

export async function adminListPending({
  limit = 50,
  signal,
}: {
  limit?: number;
  signal?: AbortSignal;
}): Promise<any[]> {
  try {
    // Primary API (reviews)
    const res = await apiRequest(
      `admin/reviews?status=pending&limit=${limit}`,
      {
        method: "GET",
        headers: headers(),
        signal,
      },
    );
    if (res.ok) {
      const data = Array.isArray(res.data) ? res.data : res.data?.data;
      return Array.isArray(data) ? data : [];
    }
    // Fallback to testimonials
    const tf = await apiRequest(
      `admin/testimonials?status=pending&limit=${limit}`,
      {
        method: "GET",
        headers: headers(),
        signal,
      },
    );
    if (!tf.ok) return [];
    const raw =
      tf.data?.data?.testimonials ||
      tf.data?.testimonials ||
      tf.data?.data ||
      tf.data;
    const arr = Array.isArray(raw) ? raw : [];
    return arr.map((t: any) => ({
      id: t._id || t.id,
      targetId: t.propertyId || t.sellerId,
      targetType: t.propertyId ? "property" : "seller",
      userName: t.name,
      rating: t.rating,
      title: t.title,
      comment: t.comment,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
      status: t.status,
    }));
  } catch {
    return [];
  }
}

export async function adminModerate(
  id: string,
  status: "approved" | "rejected",
  adminNote?: string,
): Promise<boolean> {
  try {
    // Primary API (reviews)
    const res = await apiRequest(`admin/reviews/${id}`, {
      method: "PATCH",
      headers: headers(),
      body: JSON.stringify({ status, adminNote }),
    });
    if (res.ok) return true;
    // Fallback to testimonials
    const tf = await apiRequest(`admin/testimonials/${id}`, {
      method: "PUT",
      headers: headers(),
      body: JSON.stringify({ status }),
    });
    return !!tf.ok;
  } catch {
    return false;
  }
}

export { getToken, headers };
