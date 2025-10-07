import React, { useState, useEffect } from "react";
import { BannerAd } from "@shared/types";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
  type CarouselApi,
} from "./ui/carousel";

const HeroImageSlider: React.FC = () => {
  const [banners, setBanners] = useState<BannerAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);

  // Fetch banners from API
  useEffect(() => {
    const fetchBanners = async () => {
      try {
        setLoading(true);
        setError(null);

        console.log("🔄 Fetching banners from API...");

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
          controller.abort();
          console.warn("⏰ Banner fetch timeout after 8 seconds");
        }, 8000);

        const response = await fetch("/api/banners?active=true", {
          signal: controller.signal,
          headers: { "Content-Type": "application/json" },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.success && data.data && Array.isArray(data.data)) {
          const sortedBanners = data.data.sort(
            (a: BannerAd, b: BannerAd) => a.sortOrder - b.sortOrder
          );
          setBanners(sortedBanners);
          console.log("✅ Banners loaded from API:", sortedBanners.length);
        } else {
          console.warn("⚠️ Invalid API response format:", data);
          setBanners([]);
        }
      } catch (error: any) {
        console.error("❌ Failed to fetch banners:", {
          message: error.message,
          name: error.name,
          type: error.constructor.name,
          toString: error.toString(),
        });

        let errorMessage = "";
        if (error.name === "AbortError") errorMessage = "Banner loading timed out";
        else if (error.message.includes("fetch") || error.message.includes("Network"))
          errorMessage = "Network connection issue";
        else if (error.message.includes("HTTP")) errorMessage = "Server error loading banners";

        if (errorMessage) setError(errorMessage);
        setBanners([]);
      } finally {
        setLoading(false);
      }
    };

    fetchBanners();

    const handleBannerUpdate = () => {
      console.log("🔄 Banner update event received, refreshing...");
      fetchBanners();
    };

    window.addEventListener("bannerUpdate", handleBannerUpdate);
    window.addEventListener("bannerRefresh", handleBannerUpdate);

    return () => {
      window.removeEventListener("bannerUpdate", handleBannerUpdate);
      window.removeEventListener("bannerRefresh", handleBannerUpdate);
    };
  }, []);

  // Setup carousel API and autoplay
  useEffect(() => {
    if (!api) return;
    api.on("select", () => setCurrent(api.selectedScrollSnap()));
  }, [api]);

  useEffect(() => {
    if (!api || banners.length <= 1) return;
    const autoplay = setInterval(() => {
      if (api.canScrollNext()) api.scrollNext();
      else api.scrollTo(0);
    }, 5000);
    return () => clearInterval(autoplay);
  }, [api, banners.length]);

  const handleBannerClick = (banner: BannerAd) => {
    if (banner.link) {
      if (banner.link.startsWith("http")) {
        window.open(banner.link, "_blank", "noopener,noreferrer");
      } else {
        window.location.href = banner.link;
      }
    }
  };

  const goToSlide = (index: number) => {
    if (api) api.scrollTo(index);
  };

  if (loading) {
    return (
      <div className="relative w-full h-[55vh] min-h-[280px] sm:h-[400px] md:h-[450px] lg:h-[500px] overflow-hidden bg-gray-200 animate-pulse">
        <div className="absolute inset-0 bg-gradient-to-r from-gray-300 to-gray-400"></div>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-gray-500">
            <div className="w-64 h-8 bg-gray-300 rounded mb-4 mx-auto animate-pulse"></div>
            <div className="w-48 h-4 bg-gray-300 rounded mx-auto animate-pulse"></div>
          </div>
        </div>
      </div>
    );
  }

  if (banners.length === 0) {
    console.log("📂 No banners found, hiding slider");
    return null;
  }

  return (
  
    <div className="relative w-full h-[55vh] min-h-[280px] sm:h-[400px] md:h-[450px] lg:h-[500px] overflow-hidden bg-gray-900">
      <Carousel
        opts={{ align: "start", loop: true }}
        setApi={setApi}
        className="w-full h-full"
      >
        <CarouselContent className="h-full">
          {banners.map((banner, index) => (
            <CarouselItem key={banner._id || index} className="h-full">
              <div
                className={`relative w-full h-full ${banner.link ? "cursor-pointer" : ""}`}
                onClick={() => handleBannerClick(banner)}
              >
                <img
                  src={banner.imageUrl}
                  alt={banner.title}
                  className="block w-full h-full object-cover"
                  loading={index === 0 ? "eager" : "lazy"}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&h=500&fit=crop&q=80";
                  }}
                />

                <div className="absolute inset-0 bg-black bg-opacity-50"></div>

                <div className="absolute inset-0 flex items-center justify-center z-10">
                  <div className="text-center text-white px-4 max-w-4xl mx-auto">
                    <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl xl:text-6xl font-bold mb-2 md:mb-4 drop-shadow-lg">
                      {banner.title || "Find Your Perfect Property"}
                    </h1>
                    <p className="text-sm sm:text-base md:text-lg lg:text-xl xl:text-2xl text-gray-200 mb-4 md:mb-8 drop-shadow-md max-w-2xl mx-auto">
                      Discover amazing properties with our trusted platform
                    </p>
                    {banner.link && (
                      <div className="mt-4">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBannerClick(banner);
                          }}
                          className="bg-[#C70000] hover:bg-[#A60000] text-white px-6 py-3 rounded-lg font-semibold transition-colors duration-200 shadow-lg"
                        >
                          Learn More
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        {banners.length > 1 && (
          <>
            <CarouselPrevious className="absolute left-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white border-none backdrop-blur-sm z-10" />
            <CarouselNext className="absolute right-4 top-1/2 transform -translate-y-1/2 bg-white bg-opacity-20 hover:bg-opacity-30 text-white border-none backdrop-blur-sm z-10" />
          </>
        )}
      </Carousel>

      {banners.length > 1 && (
        <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex space-x-2 z-50">
          {banners.map((_, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`w-3 h-3 rounded-full transition-all duration-200 ${
                index === current ? "bg-white scale-110" : "bg-white bg-opacity-50 hover:bg-opacity-75"
              }`}
              aria-label={`Go to slide ${index + 1}`}
            />
          ))}
        </div>
      )}

      {banners.length > 1 && (
        <div className="absolute bottom-0 left-0 w-full h-1 bg-black bg-opacity-20 z-40">
          <div
            className="h-full bg-white bg-opacity-70 transition-all duration-300 ease-in-out"
            style={{ width: `${((current + 1) / banners.length) * 100}%` }}
          />
        </div>
      )}

      {error && (
        <div className="absolute top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg shadow-lg z-20">
          <p className="text-sm">{error}</p>
        </div>
      )}
    </div>
  );
};

export default HeroImageSlider;
