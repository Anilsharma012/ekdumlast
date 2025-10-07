import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import OLXStyleHeader from "../components/OLXStyleHeader";
import CategoryBar from "../components/CategoryBar";
import BottomNavigation from "../components/BottomNavigation";
import StaticFooter from "../components/StaticFooter";

interface Subcategory {
  id?: string;
  _id?: string;
  name: string;
  slug: string;
  description: string;
  count?: number;
}

export default function PG() {
  const navigate = useNavigate();
  const [subcategories, setSubcategories] = useState<Subcategory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSubcategories();
  }, []);

  const fetchSubcategories = async () => {
    try {
      setLoading(true);
      // Use public endpoint backed by admin data
      const apiResponse = await (window as any).api(
        "/categories/pg/subcategories",
      );
      if (apiResponse.ok && apiResponse.json?.success) {
        setSubcategories(apiResponse.json.data || []);
      } else {
        console.warn(
          "Subcategories API non-OK; using fallback",
          apiResponse.status,
          apiResponse.json?.error,
        );
      }
    } catch (error) {
      console.error("Error fetching subcategories:", error);
      setSubcategories([
        {
          id: "boys-pg",
          name: "Boys PG",
          slug: "boys-pg",
          description: "PG accommodation for boys",
          count: 45,
        },
        {
          id: "girls-pg",
          name: "Girls PG",
          slug: "girls-pg",
          description: "PG accommodation for girls",
          count: 38,
        },
        {
          id: "co-living",
          name: "Co-living",
          slug: "co-living",
          description: "Co-living spaces",
          count: 22,
        },
        {
          id: "hostel",
          name: "Hostel",
          slug: "hostel",
          description: "Hostel accommodation",
          count: 15,
        },
        {
          id: "shared-room",
          name: "Shared Room",
          slug: "shared-room",
          description: "Shared room accommodation",
          count: 52,
        },
        {
          id: "single-room",
          name: "Single Room",
          slug: "single-room",
          description: "Single room accommodation",
          count: 34,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubcategoryClick = (subcategory: Subcategory) => {
    navigate(`/pg/${subcategory.slug}`);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white">
        <OLXStyleHeader />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-[#C70000] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading categories...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <OLXStyleHeader />

      <main className="pb-16">
        <CategoryBar />

        <div className="px-4 py-6">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-2">
              PG & Hostel
            </h1>
            <p className="text-gray-600">Choose accommodation type</p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {subcategories.map((subcategory) => (
              <button
                key={subcategory._id || subcategory.id || subcategory.slug}
                onClick={() => handleSubcategoryClick(subcategory)}
                className="subcat-card bg-white border border-gray-200 rounded-lg p-4 text-left hover:bg-gray-50 transition-colors shadow-sm"
                data-testid="subcat-card"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-gray-900 text-lg">
                    {subcategory.name}
                  </h3>
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                </div>
                <p className="text-sm text-gray-500 mb-3">
                  {subcategory.description}
                </p>
                {subcategory.count && (
                  <span className="text-xs bg-[#C70000] text-white px-2 py-1 rounded-full">
                    {subcategory.count} properties
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </main>

      <BottomNavigation />
      <StaticFooter />
    </div>
  );
}
