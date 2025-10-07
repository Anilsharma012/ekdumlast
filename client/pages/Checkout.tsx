import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

type Plan = {
  _id: string;
  name: string;
  price: number;
  duration: number;
  description?: string;
};

export default function Checkout() {
  const { planId } = useParams<{ planId: string }>();
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/plans/${planId}`);
        if (!res.ok) throw new Error("Failed to load plan");
        const data = await res.json();
        const p = data?.data || data?.plan;
        if (!p) throw new Error("Plan not found");
        setPlan(p);
      } catch (e) {
        navigate("/"); // id galat ho to home bhej do
      } finally {
        setLoading(false);
      }
    })();
  }, [planId, navigate]);

  if (loading) return <div className="p-6">Loading...</div>;
  if (!plan) return <div className="p-6">Plan not found</div>;

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-1">Checkout</h1>
      <p className="text-gray-600 mb-6">
        {plan.description || "Complete your plan purchase"}
      </p>

      <div className="rounded-lg border p-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="font-semibold text-lg">{plan.name}</div>
            <div className="text-sm text-gray-600">{plan.duration} days</div>
          </div>
          <div className="text-2xl font-bold">
            {plan.price === 0 ? "Free" : `₹${plan.price}`}
          </div>
        </div>
      </div>

      <Button className="bg-[#C70000] hover:bg-[#A60000] text-white">
        {plan.price === 0 ? "Start Free Listing" : "Proceed to Pay"}
      </Button>
    </div>
  );
}
