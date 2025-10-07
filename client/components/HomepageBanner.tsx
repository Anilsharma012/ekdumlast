import React, { useEffect, useState } from "react";
import { BannerAd } from "@shared/types";

interface HomepageBannerProps {
  position: "homepage_top" | "homepage_middle" | "homepage_bottom";
  className?: string;
}

export default function HomepageBanner({
  position,
  className = "",
}: HomepageBannerProps) {
  const [banners, setBanners] = useState<BannerAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    fetchBanners();
  }, [position]);

  useEffect(() => {
    if (banners.length > 1) {
      const interval = setInterval(() => {
        setCurrentIndex((prevIndex) => (prevIndex + 1) % banners.length);
      }, 5000); // Auto-rotate every 5 seconds

      return () => clearInterval(interval);
    }
  }, [banners.length]);

  const fetchBanners = async () => {
    try {
      console.log(`🏷️ Fetching banners for position: ${position}`);

      const apiRes = await (window as any).api("/banners?active=true", {
        timeout: 8000,
      });
      if (
        apiRes &&
        apiRes.ok &&
        apiRes.json?.success &&
        Array.isArray(apiRes.json.data)
      ) {
        setBanners(apiRes.json.data);
      } else {
        console.log("⚠️ Banners request not OK or empty", {
          status: apiRes?.status,
          ok: apiRes?.ok,
          err: apiRes?.json?.error,
        });
        setBanners([]);
      }
    } catch (error: any) {
      const errMsg = error?.message || String(error);
      console.warn(`Error fetching banners (${position}):`, errMsg);
      setBanners([]);
    } finally {
      setLoading(false);
    }
  };

  const handleBannerClick = (banner: BannerAd) => {
    if (banner.link) {
      // Track banner click analytics if needed
      window.open(banner.link, "_blank", "noopener,noreferrer");
    }
  };

  if (loading) {
    return (
      <div className={`animate-pulse ${className}`}>
        <div className="bg-gray-200 rounded-lg h-24 md:h-32"></div>
      </div>
    );
  }

  if (!banners.length) {
    return null;
  }

  const currentBanner = banners[currentIndex];

  return (
    <div className={className}>
      <div className="relative overflow-hidden rounded-lg shadow-sm">
        <div
          className="relative cursor-pointer transition-transform hover:scale-[1.02]"
          onClick={() => handleBannerClick(currentBanner)}
        >
          {/* Banner Image */}
          <div className="relative">
            <img
              src={
                (currentBanner as any).imageUrl || (currentBanner as any).image
              }
              alt={currentBanner.title}
              loading="lazy"
              decoding="async"
              className="w-full h-24 md:h-32 object-cover rounded-lg"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.src = `https://via.placeholder.com/800x200/f97316/ffffff?text=${encodeURIComponent(currentBanner.title)}`;
              }}
            />

            {/* Gradient overlay for better text readability */}
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent rounded-lg"></div>
          </div>

          {/* Banner Content */}
          <div className="absolute inset-0 flex items-center justify-between p-4">
            <div className="text-white">
              <h3 className="text-sm md:text-lg font-bold leading-tight">
                {currentBanner.title}
              </h3>
              {false && (
                <p className="text-xs md:text-sm opacity-90 mt-1 line-clamp-2"></p>
              )}
            </div>

            {/* Call-to-action arrow */}
            {currentBanner.link && (
              <div className="text-white/80 hover:text-white transition-colors">
                <svg
                  className="w-5 h-5 md:w-6 md:h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            )}
          </div>
        </div>

        {/* Thumbnail strip */}
        {banners.length > 1 && (
          <div className="mt-2 overflow-x-auto no-scrollbar">
            <div className="flex space-x-2">
              {banners.map((b, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`relative w-16 h-10 flex-shrink-0 rounded overflow-hidden border ${currentIndex === index ? "border-white" : "border-white/40"}`}
                  aria-label={`Go to banner ${index + 1}`}
                >
                  <img
                    src={(b as any).imageUrl || (b as any).image}
                    alt={b.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.src = `https://via.placeholder.com/160x100/f97316/ffffff?text=${encodeURIComponent(b.title)}`;
                    }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Banner label for admin identification */}
      {process.env.NODE_ENV === "development" && (
        <div className="text-xs text-gray-500 mt-1 text-center">
          Banner: {position}
        </div>
      )}
    </div>
  );
}
