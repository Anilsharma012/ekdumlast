import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import {
  Check,
  Star,
  Crown,
  Zap,
  Clock,
  TrendingUp,
  Eye,
  Phone,
} from "lucide-react";
import { AdPackage } from "@shared/types";

interface PackageSelectionProps {
  propertyId?: string;
  onPackageSelect: (packageId: string) => void;
  selectedPackage?: string;
}

export default function PackageSelection({
  propertyId,
  onPackageSelect,
  selectedPackage,
}: PackageSelectionProps) {
  const [packages, setPackages] = useState<AdPackage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPackages();

    // Set up periodic refresh every 30 seconds to catch admin updates
    const interval = setInterval(() => {
      fetchPackages();
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchPackages = async () => {
    try {
      setLoading(true);
      // Import api dynamically to avoid circular dependencies
      const { api } = await import('../lib/api');
      const response = await api.get("packages?activeOnly=true");
      const data = response.data;

      if (data.success) {
        setPackages(data.data);
        console.log("📦 Loaded packages:", data.data);
      } else {
        console.error("Failed to fetch packages:", data.error);
      }
    } catch (error) {
      console.error("Error fetching packages:", error);
    } finally {
      setLoading(false);
    }
  };

  const getPackageIcon = (type: string) => {
    switch (type) {
      case "basic":
        return <Eye className="h-6 w-6" />;
      case "featured":
        return <Star className="h-6 w-6" />;
      case "premium":
        return <Crown className="h-6 w-6" />;
      default:
        return <Zap className="h-6 w-6" />;
    }
  };

  const getPackageColor = (type: string) => {
    switch (type) {
      case "basic":
        return "border-gray-300 bg-white";
      case "featured":
        return "border-orange-300 bg-orange-50";
      case "premium":
        return "border-purple-300 bg-purple-50";
      default:
        return "border-gray-300 bg-white";
    }
  };

  const getButtonColor = (type: string) => {
    switch (type) {
      case "basic":
        return "bg-gray-600 hover:bg-gray-700";
      case "featured":
        return "bg-orange-600 hover:bg-orange-700";
      case "premium":
        return "bg-purple-600 hover:bg-purple-700";
      default:
        return "bg-gray-600 hover:bg-gray-700";
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#C70000] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading packages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Choose Your Advertisement Package
        </h2>
        <p className="text-gray-600">
          Select a package to boost your property visibility in Rohtak
        </p>
      </div>

      {packages.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-gray-500 mb-4">No packages available</div>
          <div className="space-x-3">
            <Button
              onClick={async () => {
                try {
                  const { api } = await import('../lib/api');
                  const response = await api.post("packages/initialize");
                  const data = response.data;
                  console.log("Initialize result:", data);
                  if (data.success) {
                    fetchPackages();
                  }
                } catch (error) {
                  console.error("Error initializing packages:", error);
                }
              }}
              className="bg-[#C70000] hover:bg-[#A60000] text-white"
            >
              Initialize Demo Packages
            </Button>
            <Button
              onClick={fetchPackages}
              variant="outline"
              className="text-[#C70000] border-[#C70000] hover:bg-[#C70000] hover:text-white"
            >
              Retry Loading Packages
            </Button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {packages.map((pkg) => (
          <div
            key={pkg._id}
            className={`rounded-lg border-2 p-6 transition-all duration-200 hover:shadow-lg ${
              selectedPackage === pkg._id
                ? "border-[#C70000] bg-red-50"
                : getPackageColor(pkg.type)
            } ${pkg.type === "featured" ? "transform scale-105" : ""}`}
          >
            {/* Package Header */}
            <div className="text-center mb-6">
              <div
                className={`inline-flex items-center justify-center w-12 h-12 rounded-full mb-4 ${
                  pkg.type === "basic"
                    ? "bg-gray-100 text-gray-600"
                    : pkg.type === "featured"
                      ? "bg-orange-100 text-orange-600"
                      : "bg-purple-100 text-purple-600"
                }`}
              >
                {getPackageIcon(pkg.type)}
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">
                {pkg.name}
              </h3>
              {pkg.type === "featured" && (
                <div className="inline-flex items-center bg-orange-100 text-orange-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  Most Popular
                </div>
              )}
              {pkg.type === "premium" && (
                <div className="inline-flex items-center bg-purple-100 text-purple-800 text-xs font-semibold px-2.5 py-0.5 rounded-full">
                  <Crown className="h-3 w-3 mr-1" />
                  Best Value
                </div>
              )}
            </div>

            {/* Price */}
            <div className="text-center mb-6">
              <div className="text-3xl font-bold text-gray-900">
                {pkg.price === 0 ? "Free" : `₹${pkg.price}`}
              </div>
              <div className="text-sm text-gray-500 flex items-center justify-center mt-1">
                <Clock className="h-4 w-4 mr-1" />
                {pkg.duration} days
              </div>
            </div>

            {/* Description */}
            <p className="text-gray-600 text-center mb-6">{pkg.description}</p>

            {/* Features */}
            <div className="space-y-3 mb-8">
              {pkg.features.map((feature, index) => (
                <div key={index} className="flex items-start">
                  <Check className="h-5 w-5 text-green-500 mr-3 mt-0.5 flex-shrink-0" />
                  <span className="text-sm text-gray-700">{feature}</span>
                </div>
              ))}
            </div>

            {/* Select Button */}
            <Button
              onClick={() => onPackageSelect(pkg._id!)}
              className={`w-full text-white ${getButtonColor(pkg.type)} ${
                selectedPackage === pkg._id
                  ? "bg-[#C70000] hover:bg-[#A60000]"
                  : ""
              }`}
              disabled={selectedPackage === pkg._id}
            >
              {selectedPackage === pkg._id ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Selected
                </>
              ) : pkg.price === 0 ? (
                "Select Free Package"
              ) : (
                `Select for ₹${pkg.price}`
              )}
            </Button>
          </div>
          ))}
        </div>
      )}

      {/* Package Comparison */}
      <div className="bg-gray-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Why Choose a Paid Package?
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-100 text-blue-600 rounded-full mb-3">
              <Eye className="h-6 w-6" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">
              Increased Visibility
            </h4>
            <p className="text-sm text-gray-600">
              Featured listings get 5x more views than basic listings
            </p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-green-100 text-green-600 rounded-full mb-3">
              <TrendingUp className="h-6 w-6" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">Faster Sales</h4>
            <p className="text-sm text-gray-600">
              Premium properties sell 3x faster on average
            </p>
          </div>
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-100 text-purple-600 rounded-full mb-3">
              <Phone className="h-6 w-6" />
            </div>
            <h4 className="font-semibold text-gray-900 mb-2">More Inquiries</h4>
            <p className="text-sm text-gray-600">
              Featured listings receive 4x more phone calls
            </p>
          </div>
        </div>
      </div>

      {/* Rohtak Specific Note */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start">
          <svg
            className="h-5 w-5 text-blue-400 mt-0.5 mr-3"
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
              clipRule="evenodd"
            />
          </svg>
          <div>
            <h3 className="text-sm font-medium text-blue-800">
              Rohtak Exclusive Features
            </h3>
            <p className="text-sm text-blue-700 mt-1">
              These packages are specially designed for Rohtak properties and
              include local area targeting for maximum exposure to genuine
              buyers in Rohtak and surrounding areas.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
