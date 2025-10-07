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

export default function Rent() {
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
        "/categories/rent/subcategories",
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
          id: "1bhk",
          name: "1 BHK",
          slug: "1bhk",
          description: "Single bedroom apartments",
          count: 25,
        },
        {
          id: "2bhk",
          name: "2 BHK",
          slug: "2bhk",
          description: "Two bedroom apartments",
          count: 42,
        },
        {
          id: "3bhk",
          name: "3 BHK",
          slug: "3bhk",
          description: "Three bedroom apartments",
          count: 31,
        },
        {
          id: "4bhk",
          name: "4+ BHK",
          slug: "4bhk",
          description: "Four or more bedrooms",
          count: 12,
        },
        {
          id: "villa",
          name: "Villa",
          slug: "villa",
          description: "Independent villas",
          count: 8,
        },
        {
          id: "house",
          name: "Independent House",
          slug: "house",
          description: "Independent houses",
          count: 18,
        },
        {
          id: "office",
          name: "Office Space",
          slug: "office",
          description: "Commercial office space",
          count: 15,
        },
        {
          id: "shop",
          name: "Shop/Showroom",
          slug: "shop",
          description: "Retail spaces",
          count: 22,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubcategoryClick = (subcategory: Subcategory) => {
    navigate(`/rent/${subcategory.slug}`);
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
              Rent Properties
            </h1>
            <p className="text-gray-600">Choose a property type to rent</p>
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
