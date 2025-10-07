import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Heart, MapPin, Clock, Send } from "lucide-react";
import PropertyLoadingSkeleton from "./PropertyLoadingSkeleton";
import EnquiryModal from "./EnquiryModal";

interface Property {
  _id: string;
  title: string;
  price: number;
  location: {
    city: string;
    state: string;
    address?: string;
  };
  // backend kabhi string deta hai, kabhi object; dono handle:
  images: (string | { url: string })[];
  coverImageUrl?: string;
  propertyType: string;
  createdAt: string;
  premium?: boolean;
  contactInfo: {
    name?: string;
  };
}

export default function OLXStyleListings() {
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);

  useEffect(() => {
    fetchProperties();
    loadFavorites();
  }, []);

  const fetchProperties = async () => {
    try {
      const res = await (window as any).api("properties?status=active&limit=24");
      if (res?.ok && res?.json?.success) {
        const list = Array.isArray(res.json.data)
          ? res.json.data
          : res.json.data?.properties || [];
        if (list.length) {
          setProperties(list);
          return;
        }
      }
      loadMockProperties();
    } catch {
      loadMockProperties();
    } finally {
      setLoading(false);
    }
  };

  const loadMockProperties = () => {
    const mock: Property[] = [
      {
        _id: "mock-1",
        title: "3 BHK Flat for Sale in Rohtak",
        price: 4500000,
        location: { city: "Rohtak", state: "Haryana" },
        images: ["https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800"],
        propertyType: "apartment",
        createdAt: new Date().toISOString(),
        contactInfo: { name: "Rajesh Kumar" },
      },
      {
        _id: "mock-2",
        title: "2 BHK Independent House",
        price: 3200000,
        location: { city: "Rohtak", state: "Haryana" },
        images: ["https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800"],
        propertyType: "house",
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        contactInfo: { name: "Priya Sharma" },
      },
      {
        _id: "mock-3",
        title: "Commercial Shop for Rent",
        price: 25000,
        location: { city: "Rohtak", state: "Haryana" },
        images: ["https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=800"],
        propertyType: "commercial",
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        contactInfo: { name: "Amit Singh" },
      },
      {
        _id: "mock-4",
        title: "4 BHK Villa with Garden",
        price: 8500000,
        location: { city: "Rohtak", state: "Haryana" },
        images: ["https://images.unsplash.com/photo-1593696140826-c58b021acf8b?w=800"],
        propertyType: "villa",
        createdAt: new Date(Date.now() - 345600000).toISOString(),
        contactInfo: { name: "Vikash Yadav" },
      },
    ];
    setProperties(mock);
  };

  const loadFavorites = () => {
    const saved = localStorage.getItem("favorites");
    if (saved) setFavorites(JSON.parse(saved));
  };

  const toggleFavorite = (id: string) => {
    const next = favorites.includes(id)
      ? favorites.filter((x) => x !== id)
      : [...favorites, id];
    setFavorites(next);
    localStorage.setItem("favorites", JSON.stringify(next));
  };

  const formatPrice = (price: number) => {
    if (price >= 10000000) return `₹ ${(price / 10000000).toFixed(1)} Cr`;
    if (price >= 100000) return `₹ ${(price / 100000).toFixed(1)} L`;
    if (price >= 1000) return `₹ ${(price / 1000).toFixed(0)}K`;
    return `₹ ${price.toLocaleString()}`;
  };

  const getTimeAgo = (iso: string) => {
    const now = new Date();
    const d = new Date(iso);
    const hours = Math.floor((now.getTime() - d.getTime()) / 36e5);
    if (hours < 1) return "Just now";
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return d.toLocaleDateString();
  };

  const handlePropertyClick = (p: Property) => navigate(`/properties/${p._id}`);

  const firstImage = (p: Property) =>
    p.coverImageUrl ||
    (typeof p.images?.[0] === "string"
      ? (p.images[0] as string)
      : (p.images?.[0] as any)?.url) ||
    "/placeholder.png";

  if (loading) return <PropertyLoadingSkeleton />;

  return (
    <div className="bg-white">
      {/* container to limit width on desktop so cards smaller appear */}
      <div className="px-4 py-4 max-w-6xl mx-auto">
        <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4">
          Fresh recommendations
        </h2>

        {/* 2 cols on mobile, 3 cols on md+ */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-5">
          {properties.map((property) => (
            <div
              key={property._id}
              onClick={() => handlePropertyClick(property)}
              className="bg-white border border-gray-200 rounded-lg overflow-hidden cursor-pointer hover:shadow-md transition-all active:scale-95"
            >
              {/* Image: square on mobile, 4:3 on md+ */}
              <div className="relative aspect-square md:aspect-[4/3]">
                <img
                  src={firstImage(property)}
                  alt={property.title}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/placeholder.png";
                  }}
                />
                {property.premium && (
                  <div className="absolute top-2 left-2 bg-gradient-to-r from-orange-500 to-red-600 text-white px-2 py-1 rounded-md text-[10px] md:text-xs font-bold shadow">
                    AP Premium
                  </div>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleFavorite(property._id);
                  }}
                  className="absolute top-2 right-2 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center hover:bg-white transition"
                  aria-label="favorite"
                >
                  <Heart
                    className={`h-4 w-4 ${
                      favorites.includes(property._id)
                        ? "fill-red-500 text-red-500"
                        : "text-gray-600"
                    }`}
                  />
                </button>
              </div>

              {/* Content (compact on md+) */}
              <div className="p-3 md:p-3.5">
                <div className="text-base md:text-lg font-bold text-gray-900 mb-1">
                  {formatPrice(property.price)}
                </div>

                <h3 className="text-xs md:text-sm text-gray-700 mb-2 line-clamp-2 leading-tight">
                  {property.title}
                </h3>

                <div className="flex items-center text-[11px] md:text-xs text-gray-500 mb-1">
                  <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                  <span className="truncate">
                    {property.location.city}, {property.location.state}
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] md:text-xs text-gray-400 mb-2">
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    <span>{getTimeAgo(property.createdAt)}</span>
                  </div>
                  <span className="capitalize px-2 py-0.5 bg-gray-100 rounded">
                    {property.propertyType}
                  </span>
                </div>

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setSelectedProperty(property);
                    setEnquiryModalOpen(true);
                  }}
                  data-testid="enquiry-btn"
                  className="w-full bg-[#C70000] hover:bg-[#A60000] text-white text-[11px] md:text-xs py-2 rounded-md flex items-center justify-center space-x-1 transition-colors"
                >
                  <Send className="h-3 w-3" />
                  <span>Enquiry Now</span>
                </button>
              </div>
            </div>
          ))}
        </div>

        {properties.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            <p>No properties available</p>
          </div>
        )}

        {properties.length > 0 && (
          <div className="mt-6 text-center">
            <button className="text-[#C70000] font-semibold text-sm hover:underline">
              View all properties
            </button>
          </div>
        )}
      </div>

      {/* Enquiry Modal */}
      {selectedProperty && (
        <EnquiryModal
          isOpen={enquiryModalOpen}
          onClose={() => {
            setEnquiryModalOpen(false);
            setSelectedProperty(null);
          }}
          propertyId={selectedProperty._id}
          propertyTitle={selectedProperty.title}
          ownerName={selectedProperty.contactInfo?.name || "Property Owner"}
        />
      )}
    </div>
  );
}
