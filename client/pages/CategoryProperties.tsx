import { useState, useEffect } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Filter,
  Grid,
  List,
  MapPin,
  Heart,
  Phone,
  ChevronDown,
  X,
} from "lucide-react";
import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";
import { Button } from "../components/ui/button";
import { Property } from "@shared/types";

interface FilterState {
  priceType: string;
  minPrice: string;
  maxPrice: string;
  bedrooms: string;
  bathrooms: string;
  minArea: string;
  maxArea: string;
  sector: string;
  mohalla: string;
  sortBy: string;
}

const initialFilters: FilterState = {
  priceType: "",
  minPrice: "",
  maxPrice: "",
  bedrooms: "",
  bathrooms: "",
  minArea: "",
  maxArea: "",
  sector: "",
  mohalla: "",
  sortBy: "date_desc",
};

const rohtakSectors = [
  "Sector 1",
  "Sector 2",
  "Sector 3",
  "Sector 4",
  "Sector 5",
  "Sector 6",
  "Sector 7",
  "Sector 8",
  "Sector 9",
  "Sector 10",
];

const mohallas = [
  "Prem Nagar",
  "Shastri Nagar",
  "DLF Colony",
  "Model Town",
  "Subhash Nagar",
  "Civil Lines",
  "Ram Nagar",
  "Industrial Area",
];

export default function CategoryProperties() {
  const { category, subcategory, propertyType, slug } = useParams();
  const [searchParams] = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<"grid" | "list">("list");
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [categoryData, setCategoryData] = useState<any>(null);

  // Get category from URL path
  const getCurrentCategory = () => {
    const path = window.location.pathname;
    if (path.startsWith("/buy/")) return "buy";
    if (path.startsWith("/sale/")) return "sale";
    if (path.startsWith("/rent/")) return "rent";
    if (path.startsWith("/lease/")) return "lease";
    if (path.startsWith("/pg/")) return "pg";
    return category;
  };

  useEffect(() => {
    fetchCategoryData();
    fetchProperties();
  }, [category, subcategory, slug]);

  useEffect(() => {
    fetchProperties();
  }, [filters]);

  const fetchCategoryData = async () => {
    try {
      const response = await fetch("/api/categories");
      const data = await response.json();
      if (data.success) {
        const foundCategory = data.data.find(
          (cat: any) => cat.slug === category,
        );
        setCategoryData(foundCategory);
      }
    } catch (error) {
      console.error("Error fetching category data:", error);
    }
  };

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      // Always include status=active as per requirements
      params.append("status", "active");

      // Handle category and subcategory from URL
      const currentCategory = getCurrentCategory();
      if (currentCategory) {
        if (currentCategory === "buy" || currentCategory === "sale") {
          params.append("priceType", "sale");
        } else if (currentCategory === "rent") {
          params.append("priceType", "rent");
        } else if (currentCategory === "lease") {
          params.append("priceType", "lease");
        } else if (currentCategory === "pg") {
          params.append("propertyType", "pg");
        }
      }

      // Handle subcategory from slug
      if (slug) {
        params.append("subCategory", slug);
      } else if (subcategory) {
        params.append("subCategory", subcategory);
      }

      if (category && !slug) {
        params.append("propertyType", category);
      }
      if (propertyType) params.append("propertyTypeSlug", propertyType);

      // Add filter parameters
      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.append(key, value);
      });

      // STEP 4 requirement: await api('/properties?category=buy&subcategory=${slug}&status=active')
      const apiResponse = await (window as any).api(`properties?${params}`);
      const data = apiResponse.ok
        ? apiResponse.json
        : { success: false, error: "Failed to fetch properties" };

      if (data.success) {
        setProperties(data.data.properties || []);
      }
    } catch (error) {
      console.error("Error fetching properties:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key: keyof FilterState, value: string) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters(initialFilters);
  };

  const getActiveFilterCount = () => {
    return Object.entries(filters).filter(
      ([key, value]) => value && key !== "sortBy",
    ).length;
  };

  const getCategoryTitle = () => {
    const currentCategory = getCurrentCategory();

    if (slug) {
      const subcategoryName = slug
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
      const categoryName = currentCategory?.replace(/\b\w/g, (l) =>
        l.toUpperCase(),
      );
      return `${subcategoryName} for ${categoryName}`;
    }
    if (propertyType) {
      return propertyType
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
    }
    if (subcategory) {
      return subcategory
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
    }
    if (category) {
      return category
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());
    }
    return "Properties";
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-[#C70000] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading properties...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      {/* Mobile Filters Overlay */}
      {showFilters && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 md:hidden">
          <div className="bg-white h-full w-80 p-4 overflow-y-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">Filters</h2>
              <button onClick={() => setShowFilters(false)} className="p-2">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              {/* Price Type */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Property For
                </label>
                <select
                  value={filters.priceType}
                  onChange={(e) =>
                    handleFilterChange("priceType", e.target.value)
                  }
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">All</option>
                  <option value="sale">Sale</option>
                  <option value="rent">Rent</option>
                </select>
              </div>

              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Price Range
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min Price"
                    value={filters.minPrice}
                    onChange={(e) =>
                      handleFilterChange("minPrice", e.target.value)
                    }
                    className="p-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="number"
                    placeholder="Max Price"
                    value={filters.maxPrice}
                    onChange={(e) =>
                      handleFilterChange("maxPrice", e.target.value)
                    }
                    className="p-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              {/* Bedrooms */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Bedrooms
                </label>
                <select
                  value={filters.bedrooms}
                  onChange={(e) =>
                    handleFilterChange("bedrooms", e.target.value)
                  }
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Any</option>
                  <option value="1">1 BHK</option>
                  <option value="2">2 BHK</option>
                  <option value="3">3 BHK</option>
                  <option value="4">4+ BHK</option>
                </select>
              </div>

              {/* Bathrooms */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Bathrooms
                </label>
                <select
                  value={filters.bathrooms}
                  onChange={(e) =>
                    handleFilterChange("bathrooms", e.target.value)
                  }
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Any</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                  <option value="4">4+</option>
                </select>
              </div>

              {/* Area Range */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Area (sq ft)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min Area"
                    value={filters.minArea}
                    onChange={(e) =>
                      handleFilterChange("minArea", e.target.value)
                    }
                    className="p-2 border border-gray-300 rounded-md"
                  />
                  <input
                    type="number"
                    placeholder="Max Area"
                    value={filters.maxArea}
                    onChange={(e) =>
                      handleFilterChange("maxArea", e.target.value)
                    }
                    className="p-2 border border-gray-300 rounded-md"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm font-medium mb-2">Sector</label>
                <select
                  value={filters.sector}
                  onChange={(e) => handleFilterChange("sector", e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Any Sector</option>
                  {rohtakSectors.map((sector) => (
                    <option key={sector} value={sector}>
                      {sector}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Mohalla
                </label>
                <select
                  value={filters.mohalla}
                  onChange={(e) =>
                    handleFilterChange("mohalla", e.target.value)
                  }
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="">Any Mohalla</option>
                  {mohallas.map((mohalla) => (
                    <option key={mohalla} value={mohalla}>
                      {mohalla}
                    </option>
                  ))}
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Sort By
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md"
                >
                  <option value="date_desc">Newest First</option>
                  <option value="date_asc">Oldest First</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="area_desc">Area: Large to Small</option>
                </select>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={clearFilters}
                  variant="outline"
                  className="flex-1"
                >
                  Clear All
                </Button>
                <Button
                  onClick={() => setShowFilters(false)}
                  className="flex-1 bg-[#C70000] hover:bg-[#A60000] text-white"
                >
                  Apply Filters
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="flex">
        {/* Desktop Sidebar Filters */}
        <div className="hidden md:block w-64 bg-white h-screen sticky top-0 border-r border-gray-200 p-4 overflow-y-auto">
          <h2 className="text-lg font-semibold mb-4">Filters</h2>

          <div className="space-y-4">
            {/* Price Type */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Property For
              </label>
              <select
                value={filters.priceType}
                onChange={(e) =>
                  handleFilterChange("priceType", e.target.value)
                }
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">All</option>
                <option value="sale">Sale</option>
                <option value="rent">Rent</option>
              </select>
            </div>

            {/* Price Range */}
            <div>
              <label className="block text-sm font-medium mb-2">
                Price Range
              </label>
              <div className="space-y-2">
                <input
                  type="number"
                  placeholder="Min Price"
                  value={filters.minPrice}
                  onChange={(e) =>
                    handleFilterChange("minPrice", e.target.value)
                  }
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                />
                <input
                  type="number"
                  placeholder="Max Price"
                  value={filters.maxPrice}
                  onChange={(e) =>
                    handleFilterChange("maxPrice", e.target.value)
                  }
                  className="w-full p-2 border border-gray-300 rounded-md text-sm"
                />
              </div>
            </div>

            {/* Bedrooms */}
            <div>
              <label className="block text-sm font-medium mb-2">Bedrooms</label>
              <select
                value={filters.bedrooms}
                onChange={(e) => handleFilterChange("bedrooms", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Any</option>
                <option value="1">1 BHK</option>
                <option value="2">2 BHK</option>
                <option value="3">3 BHK</option>
                <option value="4">4+ BHK</option>
              </select>
            </div>

            {/* Location */}
            <div>
              <label className="block text-sm font-medium mb-2">Sector</label>
              <select
                value={filters.sector}
                onChange={(e) => handleFilterChange("sector", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="">Any Sector</option>
                {rohtakSectors.map((sector) => (
                  <option key={sector} value={sector}>
                    {sector}
                  </option>
                ))}
              </select>
            </div>

            {/* Sort By */}
            <div>
              <label className="block text-sm font-medium mb-2">Sort By</label>
              <select
                value={filters.sortBy}
                onChange={(e) => handleFilterChange("sortBy", e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-md text-sm"
              >
                <option value="date_desc">Newest First</option>
                <option value="date_asc">Oldest First</option>
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="area_desc">Area: Large to Small</option>
              </select>
            </div>

            <Button onClick={clearFilters} variant="outline" className="w-full">
              Clear All Filters
            </Button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-4">
          {/* Header with Back Button */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center">
              <button
                onClick={() => window.history.back()}
                className="mr-4 p-2 bg-white rounded-full shadow-md"
              >
                <ArrowLeft className="h-5 w-5 text-gray-700" />
              </button>
              <div>
                <h1 className="text-xl font-semibold text-gray-800">
                  {getCategoryTitle()}
                </h1>
                <p className="text-sm text-gray-600">
                  {properties.length} properties found
                </p>
              </div>
            </div>

            <div className="flex items-center space-x-2">
              {/* View Toggle - Desktop */}
              <div className="hidden md:flex border border-gray-300 rounded-md">
                <button
                  onClick={() => setViewMode("list")}
                  className={`p-2 ${viewMode === "list" ? "bg-gray-100" : ""}`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setViewMode("grid")}
                  className={`p-2 ${viewMode === "grid" ? "bg-gray-100" : ""}`}
                >
                  <Grid className="h-4 w-4" />
                </button>
              </div>

              {/* Filter Button - Mobile */}
              <Button
                onClick={() => setShowFilters(true)}
                variant="outline"
                size="sm"
                className="md:hidden border-[#C70000] text-[#C70000]"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filter
                {getActiveFilterCount() > 0 && (
                  <span className="ml-1 bg-[#C70000] text-white text-xs rounded-full px-1.5 py-0.5">
                    {getActiveFilterCount()}
                  </span>
                )}
              </Button>
            </div>
          </div>

          {/* Properties Grid/List - STEP 4 requirement: data-testid="listing-page" */}
          <div data-testid="listing-page">
            {properties.length === 0 ? (
              <div className="text-center py-20">
                <div className="bg-white rounded-lg p-8 shadow-sm">
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    No Properties Found
                  </h3>
                  <p className="text-gray-600 mb-4">
                    No properties match your current filters. Try adjusting your
                    search criteria.
                  </p>
                  <Button
                    onClick={clearFilters}
                    variant="outline"
                    className="border-[#C70000] text-[#C70000]"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            ) : (
              <div
                className={
                  viewMode === "grid"
                    ? "prop-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
                    : "space-y-4"
                }
              >
                {properties.map((property) => (
                  <div
                    key={property._id}
                    className={`prop-card bg-white rounded-lg shadow-sm overflow-hidden ${
                      viewMode === "grid" ? "flex flex-col" : "flex"
                    }`}
                  >
                    <div
                      className={`relative ${
                        viewMode === "grid"
                          ? "w-full h-48"
                          : "w-32 h-32 flex-shrink-0"
                      }`}
                    >
                      <img
                        data-wm="1"
                        src={
                          property.coverImageUrl ??
                          property.images?.[0]?.url ??
                          property.images?.[0] ??
                          "/placeholder.png"
                        }
                        alt={property.title}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          const target = e.target as HTMLImageElement;
                          target.src = "/placeholder.png";
                        }}
                      />
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          // Handle favorites toggle
                        }}
                        className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md hover:bg-gray-50"
                      >
                        <Heart className="h-4 w-4 text-gray-600" />
                      </button>
                    </div>

                    <div
                      className={`p-4 ${viewMode === "grid" ? "flex-1" : ""}`}
                    >
                      <div
                        className={`${viewMode === "grid" ? "mb-2" : "flex justify-between items-start mb-2"}`}
                      >
                        <h3 className="font-semibold text-gray-900 leading-tight">
                          {property.title}
                        </h3>
                        <span
                          className={`text-lg font-bold text-[#C70000] ${viewMode === "list" ? "ml-2" : ""}`}
                        >
                          ₹{property.price?.toLocaleString() || "0"}
                          {property.priceType === "rent" && "/month"}
                        </span>
                      </div>

                      <div className="flex items-center text-gray-500 mb-2">
                        <MapPin className="h-4 w-4 mr-1" />
                        <span className="text-sm">
                          {property.location?.address ||
                            "Location not available"}
                        </span>
                      </div>

                      <div className="flex items-center text-gray-500 mb-3 text-sm">
                        {property.specifications?.bedrooms && (
                          <span className="mr-4">
                            {property.specifications.bedrooms} BHK
                          </span>
                        )}
                        {property.specifications?.bathrooms && (
                          <span className="mr-4">
                            {property.specifications.bathrooms} Bath
                          </span>
                        )}
                        <span>{property.specifications?.area || 0} sq ft</span>
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-xs text-gray-400">
                          {property.contactInfo?.name || "Owner"}
                        </span>
                        <Button
                          size="sm"
                          className="bg-[#C70000] hover:bg-[#A60000] text-white"
                        >
                          <Phone className="h-3 w-3 mr-1" />
                          Call
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
