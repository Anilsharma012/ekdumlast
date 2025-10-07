import React, { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Filter,
  MapPin,
  Heart,
  Phone,
  MessageCircle,
} from "lucide-react";
import Watermark from "../components/Watermark";
import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";
import { Button } from "../components/ui/button";
import { Property } from "@shared/types";

export default function Properties() {
  const [searchParams] = useSearchParams();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);

  const category = searchParams.get("category");
  const subcategory = searchParams.get("subcategory");

  useEffect(() => {
    fetchProperties();
    const handler = () => fetchProperties();
    window.addEventListener("properties:updated", handler);
    return () => window.removeEventListener("properties:updated", handler);
  }, [category, subcategory]);

  const fetchProperties = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      // Ensure only active, approved listings
      params.append("status", "active");
      if (category) params.append("propertyType", category);
      if (subcategory) params.append("subCategory", subcategory);

      const apiResponse = await (window as any).api(`properties?${params}`);
      const data = apiResponse.ok
        ? apiResponse.json
        : { success: false, error: "Failed to fetch properties" };

      if (data?.success) {
        const list = Array.isArray(data.data)
          ? data.data
          : data.data?.properties || [];
        setProperties(list);
      } else {
        setProperties([]);
      }
    } catch (error) {
      console.error(
        "Error fetching properties:",
        (error as any)?.message || error,
      );
      setProperties([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBackClick = () => {
    window.history.back();
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

      <div className="p-4">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <button
              onClick={handleBackClick}
              className="mr-4 p-2 bg-white rounded-full shadow-md"
            >
              <ArrowLeft className="h-5 w-5 text-gray-700" />
            </button>
            <h1 className="text-xl font-semibold text-gray-800">
              {subcategory
                ? subcategory.replace("-", " ").toUpperCase()
                : category
                  ? category.toUpperCase()
                  : "All Properties"}
            </h1>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-[#C70000] text-[#C70000]"
          >
            <Filter className="h-4 w-4 mr-2" />
            Filter
          </Button>
        </div>

        {/* Properties List */}
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
                onClick={() => window.location.reload()}
                variant="outline"
                className="border-[#C70000] text-[#C70000]"
              >
                Reset Filters
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {properties.map((property) => (
              <div
                key={property._id}
                className="bg-white rounded-lg shadow-sm overflow-hidden"
              >
                <div className="flex">
                  <div className="relative w-32 h-32 flex-shrink-0">
                    <img
                      data-wm="1"
                      src={
                        property.images[0] ||
                        "https://via.placeholder.com/300x300?text=No+Image"
                      }
                      alt={property.title}
                      className="w-full h-full object-cover"
                    />
                    <Watermark small />
                    <button className="absolute top-2 right-2 w-8 h-8 bg-white rounded-full flex items-center justify-center shadow-md">
                      <Heart className="h-4 w-4 text-gray-600" />
                    </button>
                  </div>

                  <div className="flex-1 p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-gray-900 leading-tight">
                        {property.title}
                      </h3>
                      <span className="text-lg font-bold text-[#C70000] ml-2">
                        ₹{property.price.toLocaleString()}
                        {property.priceType === "rent" && "/month"}
                      </span>
                    </div>

                    <div className="flex items-center text-gray-500 mb-2">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span className="text-sm">
                        {property.location.address}
                      </span>
                    </div>

                    <div className="flex items-center text-gray-500 mb-3 text-sm">
                      {property.specifications.bedrooms && (
                        <span className="mr-4">
                          {property.specifications.bedrooms} BHK
                        </span>
                      )}
                      {property.specifications.bathrooms && (
                        <span className="mr-4">
                          {property.specifications.bathrooms} Bath
                        </span>
                      )}
                      <span>{property.specifications.area} sq ft</span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">
                        {property.contactInfo.name}
                      </span>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          className="bg-[#C70000] hover:bg-[#A60000] text-white"
                          onClick={() =>
                            window.open(
                              `tel:${property.contactInfo.phone}`,
                              "_self",
                            )
                          }
                        >
                          <Phone className="h-3 w-3 mr-1" />
                          Call
                        </Button>

                        <Button
                          size="sm"
                          className="bg-white border border-gray-200 text-gray-800"
                          onClick={async () => {
                            try {
                              const token = localStorage.getItem("token");
                              const lsUser = localStorage.getItem("user");
                              if (!token || !lsUser) {
                                // redirect to login page
                                window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname + window.location.search)}`;
                                return;
                              }
                              const currentUser = JSON.parse(lsUser);
                              const apiResponse = await (window as any).api(
                                `conversations/find-or-create`,
                                {
                                  method: "POST",
                                  headers: {
                                    "Content-Type": "application/json",
                                    Authorization: `Bearer ${token}`,
                                  },
                                  body: { propertyId: property._id },
                                },
                              );

                              if (apiResponse && apiResponse.success) {
                                const raw =
                                  apiResponse.data?._id ||
                                  apiResponse.data?.conversationId;
                                const convId = raw
                                  ? typeof raw === "string"
                                    ? raw
                                    : raw.toString()
                                  : null;
                                if (convId) {
                                  window.location.href = `/conversation/${convId}`;
                                } else {
                                  alert("Failed to start chat");
                                }
                              } else {
                                alert("Failed to start chat");
                              }
                            } catch (e) {
                              console.error(e);
                              alert("Failed to start chat");
                            }
                          }}
                        >
                          <MessageCircle className="h-3 w-3 mr-1" />
                          Message
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
