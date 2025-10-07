import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  MessageCircle,
  Phone,
  Share2,
  Heart,
  MapPin,
  Bed,
  Bath,
  Send,
  Square,
  Car,
  Calendar,
  Eye,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from "lucide-react";
import { useWatermark } from "../hooks/useWatermark";
import Watermark from "../components/Watermark";
import { Button } from "../components/ui/button";
import { Badge } from "../components/ui/badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { toast } from "../components/ui/use-toast";
// import ChatBot from "../components/ChatBot";
import ApiDiagnostic from "../components/ApiDiagnostic";
import EnquiryModal from "../components/EnquiryModal";
import PropertyReviews from "../components/PropertyReviews";
import ReviewsList from "../components/ReviewsList";
import ReviewForm from "../components/ReviewForm";

interface Property {
  _id: string;
  title: string;
  description: string;
  propertyType: string;
  subCategory: string;
  price: number;
  priceType: "sale" | "rent";
  location: {
    city: string;
    state: string;
    address: string;
    area?: string;
  };
  contactInfo: {
    name: string;
    phone: string;
    whatsappNumber?: string;
    email: string;
  };
  images: any[];
  status: "active" | "inactive" | "sold" | "rented";
  featured: boolean;
  premium: boolean;
  specifications?: {
    bedrooms?: number;
    bathrooms?: number;
    area?: string;
    facing?: string;
    floor?: string;
    totalFloors?: string;
    parking?: boolean;
    furnished?: string;
  };
  amenities?: string[];
  views: number;
  inquiries: number;
  createdAt: string;
}

export default function PropertyDetail() {
  useWatermark();
  const { id } = useParams();
  const navigate = useNavigate();
  const [property, setProperty] = useState<Property | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string>("");
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [enquiryModalOpen, setEnquiryModalOpen] = useState(false);
  const [startingChat, setStartingChat] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProperty();
      trackView();
    }
  }, [id]);

  const fetchProperty = async (retryCount = 0) => {
    try {
      setLoading(true);
      setError("");

      if (!id) {
        setError("Property ID is required");
        setLoading(false);
        return;
      }
      if (id.length !== 24) {
        setError("Invalid property ID format");
        setLoading(false);
        return;
      }

      const apiResponse = await (window as any).api(`properties/${id}`);

      if (apiResponse.ok) {
        const data = apiResponse.json;
        if (data.success) {
          setProperty(data.data);
        } else {
          setError(data.error || "Property not found");
        }
      } else if (apiResponse.status === 404) {
        setError("Property not found");
      } else if (apiResponse.status === 400) {
        setError("Invalid property ID");
      } else {
        const errorData = apiResponse.json;
        setError(errorData.error || "Failed to load property");
      }
    } catch (error: any) {
      let errorMessage = "Failed to load property";
      if (
        error.name === "TypeError" &&
        String(error.message).includes("Failed to fetch")
      ) {
        if (retryCount < 2) {
          setTimeout(
            () => fetchProperty(retryCount + 1),
            1000 * (retryCount + 1),
          );
          return;
        } else {
          errorMessage =
            "Network error. Please check your internet connection and try again.";
        }
      } else if (String(error.message).includes("Invalid JSON")) {
        errorMessage = "Server error. Please try again later.";
      } else if (error.message) {
        errorMessage = error.message;
      }
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const trackView = async () => {
    try {
      const url = `/api/analytics/view/${id}`;
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({ ts: Date.now() })], {
          type: "application/json",
        });
        navigator.sendBeacon(url, blob);
        return;
      }
      const controller = new AbortController();
      const to = setTimeout(() => {
        try {
          controller.abort("timeout");
        } catch {}
      }, 3000);
      await fetch(url, {
        method: "POST",
        keepalive: true,
        signal: controller.signal,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ts: Date.now() }),
      });
      clearTimeout(to);
    } catch {}
  };

  const handleCall = (phoneNumber: string) => {
    const url = `/api/analytics/phone/${id}`;
    try {
      if (navigator.sendBeacon) {
        const blob = new Blob([JSON.stringify({ ts: Date.now() })], {
          type: "application/json",
        });
        navigator.sendBeacon(url, blob);
      } else {
        fetch(url, {
          method: "POST",
          keepalive: true,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ts: Date.now() }),
        }).catch(() => {});
      }
    } catch {}
    window.open(`tel:${phoneNumber}`, "_self");
  };

  const handleWhatsApp = (phoneNumber: string) => {
    const message = `Hi, I'm interested in your property: ${property?.title}`;
    const url = `https://wa.me/${phoneNumber.replace(/[^0-9]/g, "")}?text=${encodeURIComponent(message)}`;
    window.open(url, "_blank");
  };

  const handleEnquiry = () => setEnquiryModalOpen(true);

  const handleStartChat = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login", {
          state: {
            redirectTo: `/property/${id}`,
            message: "Please login to start chat",
          },
        });
        return;
      }
      if (!property?._id) {
        toast({
          title: "Error",
          description: "Property information not available",
          variant: "destructive",
        });
        return;
      }
      setStartingChat(true);
      let response = await (window as any).api(`conversations`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: { propertyId: property._id },
      });
      if (!response.success) {
        response = await (window as any).api(`conversations/find-or-create`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: { propertyId: property._id },
        });
      }
      if (response.success) {
        const raw =
          response.data?._id ||
          response.data?.conversationId ||
          response.json?.data?._id ||
          response.json?.data?.conversationId;
        const convId =
          typeof raw === "string"
            ? raw
            : raw?.$oid ||
              raw?.oid ||
              (raw?.toString ? raw.toString() : String(raw));
        if (!convId || convId === "undefined") {
          toast({
            title: "Error",
            description: "Invalid conversation id",
            variant: "destructive",
          });
          return;
        }
        navigate(`/conversation/${convId}`);
      } else {
        toast({
          title: "Error",
          description: response.error || "Failed to start chat",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error starting chat:", error);
      toast({
        title: "Error",
        description: "Failed to start chat. Please try again.",
        variant: "destructive",
      });
    } finally {
      setStartingChat(false);
    }
  };

  const nextImage = () => {
    if (property?.images) {
      setCurrentImageIndex((p) =>
        p === property.images.length - 1 ? 0 : p + 1,
      );
    }
  };
  const prevImage = () => {
    if (property?.images) {
      setCurrentImageIndex((p) =>
        p === 0 ? property.images.length - 1 : p - 1,
      );
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#C70000] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading property details...</p>
        </div>
      </div>
    );
  }

  if (error || !property) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-4xl w-full space-y-6">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">
              Property Not Found
            </h2>
            <p className="text-gray-600 mb-6">{error}</p>
            <Button onClick={() => navigate(-1)} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go Back
            </Button>
          </div>
          <ApiDiagnostic propertyId={id} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Button
              variant="ghost"
              onClick={() => navigate(-1)}
              className="flex items-center"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsLiked(!isLiked)}
                className={isLiked ? "text-red-500" : ""}
              >
                <Heart className={`h-4 w-4 ${isLiked ? "fill-current" : ""}`} />
              </Button>
              <Button variant="ghost" size="sm">
                <Share2 className="h-4 w-4" />
              </Button>
              <Button
                size="sm"
                disabled={startingChat}
                className="bg-[#C70000] hover:bg-[#A60000] text-white"
                onClick={handleStartChat}
              >
                {startingChat ? (
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-1" />
                ) : (
                  <MessageCircle className="h-4 w-4 mr-1" />
                )}
                {startingChat ? "Starting..." : "Message Owner"}
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Image Gallery & Main Info */}
          <div className="lg:col-span-2 space-y-6">
            {/* Image Gallery */}
            {property.images.length > 0 && (
              <Card>
                <CardContent className="p-0">
                  <div
                    className="relative aspect-video"
                    data-role="property-hero"
                  >
                    <img
                      src={
                        (property as any).coverImageUrl ??
                        property.images?.[currentImageIndex]?.url ??
                        property.images?.[currentImageIndex] ??
                        "/placeholder.png"
                      }
                      alt={property.title}
                      className="w-full h-full rounded-t-lg object-center"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.src = "/placeholder.png";
                      }}
                    />
                    {/* 🔻 Small, bottom-center watermark */}
                    <Watermark small />

                    {property.images.length > 1 && (
                      <>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                          onClick={prevImage}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/50 text-white hover:bg-black/70"
                          onClick={nextImage}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 text-white px-3 py-1 rounded-full text-sm">
                          {currentImageIndex + 1} / {property.images.length}
                        </div>
                      </>
                    )}

                    {property.featured && (
                      <Badge className="absolute top-4 left-4 bg-orange-500 text-white">
                        Featured
                      </Badge>
                    )}
                    {property.premium && (
                      <Badge className="absolute top-4 right-4 bg-purple-500 text-white">
                        Premium
                      </Badge>
                    )}
                  </div>

                  {property.images.length > 1 && (
                    <div className="flex gap-2 p-4 overflow-x-auto">
                      {property.images.map((image, index) => (
                        <div key={index} className="relative">
                          <img
                            src={
                              typeof image === "string"
                                ? image
                                : (image?.url ?? "/placeholder.png")
                            }
                            alt={`${property.title} ${index + 1}`}
                            className={`w-20 h-16 rounded cursor-pointer border-2 ${
                              index === currentImageIndex
                                ? "border-[#C70000]"
                                : "border-transparent"
                            }`}
                            onClick={() => setCurrentImageIndex(index)}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = "/placeholder.png";
                            }}
                          />
                          {/* 🔻 Small, bottom-center watermark on thumbnails */}
                          <Watermark small />
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Property Details */}
            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-2xl text-gray-900">
                      {property.title}
                    </CardTitle>
                    <div className="flex items-center text-gray-600 mt-2">
                      <MapPin className="h-4 w-4 mr-1" />
                      <span>
                        {property.location.area}, {property.location.city}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-[#C70000]">
                      ₹{property.price.toLocaleString()}
                      {property.priceType === "rent" && (
                        <span className="text-lg">/month</span>
                      )}
                    </div>
                    <div className="text-sm text-gray-600 capitalize">
                      For {property.priceType}
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                {property.specifications && (
                  <div>
                    <h3 className="font-semibold mb-3">Property Details</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      {property.specifications.bedrooms && (
                        <div className="flex items-center space-x-2">
                          <Bed className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">
                            {property.specifications.bedrooms} Bedrooms
                          </span>
                        </div>
                      )}
                      {property.specifications.bathrooms && (
                        <div className="flex items-center space-x-2">
                          <Bath className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">
                            {property.specifications.bathrooms} Bathrooms
                          </span>
                        </div>
                      )}
                      {property.specifications.area && (
                        <div className="flex items-center space-x-2">
                          <Square className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">
                            {property.specifications.area}
                          </span>
                        </div>
                      )}
                      {property.specifications.parking && (
                        <div className="flex items-center space-x-2">
                          <Car className="h-4 w-4 text-gray-500" />
                          <span className="text-sm">Parking</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-3">Description</h3>
                  <p className="text-gray-700 whitespace-pre-line">
                    {property.description}
                  </p>
                </div>

                {property.amenities && property.amenities.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {property.amenities.map((amenity, index) => (
                        <Badge
                          key={index}
                          variant="outline"
                          className="bg-gray-50"
                        >
                          {amenity}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex items-center space-x-6 text-sm text-gray-600">
                  <div className="flex items-center space-x-1">
                    <Eye className="h-4 w-4" />
                    <span>{property.views} views</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Calendar className="h-4 w-4" />
                    <span>
                      Listed {new Date(property.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="mt-6">
                  <PropertyReviews propertyId={property._id} />
                </div>
                <div className="mt-6">
                  <ReviewsList targetId={property._id} targetType="property" />
                  <ReviewForm targetId={property._id} targetType="property" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact & Action Buttons */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="font-medium">{property.contactInfo.name}</p>
                  <p className="text-sm text-gray-600">
                    {property.contactInfo.email}
                  </p>
                </div>

                {/* Desktop */}
                <div className="space-y-3 hidden md:block">
                  <Button
                    className="w-full bg-[#C70000] hover:bg-[#A60000] text-white flex items-center justify-center space-x-2 py-3"
                    onClick={handleStartChat}
                    disabled={startingChat}
                  >
                    {startingChat ? (
                      <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <MessageCircle className="h-4 w-4" />
                    )}
                    <span>
                      {startingChat ? "Starting..." : "Message Owner"}
                    </span>
                  </Button>

                  <Button
                    variant="outline"
                    className="w-full border-[#C70000] text-[#C70000] hover:bg-[#C70000] hover:text-white flex items-center justify-center space-x-2 py-3"
                    onClick={() => handleCall(property.contactInfo.phone)}
                  >
                    <Phone className="h-4 w-4" />
                    <span>Call Now</span>
                  </Button>

                  <Button
                    className="w-full bg-green-500 hover:bg-green-600 text-white flex items-center justify-center space-x-2 py-3"
                    onClick={() =>
                      handleWhatsApp(
                        property.contactInfo.whatsappNumber ||
                          property.contactInfo.phone,
                      )
                    }
                  >
                    <svg
                      className="h-4 w-4"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893A11.821 11.821 0 0020.885 3.309" />
                    </svg>
                    <span>WhatsApp</span>
                  </Button>
                </div>

                {/* Mobile */}
                <div className="grid grid-cols-4 gap-2 md:hidden">
                  <Button
                    className="bg-[#C70000] hover:bg-[#A60000] text-white flex flex-col items-center justify-center space-y-1 py-4"
                    onClick={handleStartChat}
                    disabled={startingChat}
                  >
                    {startingChat ? (
                      <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full" />
                    ) : (
                      <MessageCircle className="h-5 w-5" />
                    )}
                    <span className="text-xs">
                      {startingChat ? "Starting" : "Message"}
                    </span>
                  </Button>

                  <Button
                    variant="outline"
                    className="border-[#C70000] text-[#C70000] hover:bg-[#C70000] hover:text-white flex flex-col items-center justify-center space-y-1 py-4"
                    onClick={() => handleCall(property.contactInfo.phone)}
                  >
                    <Phone className="h-5 w-5" />
                    <span className="text-xs">Call</span>
                  </Button>

                  <Button
                    className="bg-green-500 hover:bg-green-600 text-white flex flex-col items-center justify-center space-y-1 py-4"
                    onClick={() =>
                      handleWhatsApp(
                        property.contactInfo.whatsappNumber ||
                          property.contactInfo.phone,
                      )
                    }
                  >
                    <svg
                      className="h-5 w-5"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347" />
                    </svg>
                    <span className="text-xs">WhatsApp</span>
                  </Button>
                </div>

                <div className="pt-4 border-t">
                  <p className="text-xs text-gray-500 text-center">
                    Contact details are verified by our team
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Location</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <p className="text-sm">
                    <span className="font-medium">Address:</span>{" "}
                    {property.location.address}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">Area:</span>{" "}
                    {property.location.area}
                  </p>
                  <p className="text-sm">
                    <span className="font-medium">City:</span>{" "}
                    {property.location.city}, {property.location.state}
                  </p>
                </div>
                <div className="mt-4 h-48 bg-gray-200 rounded-lg flex items-center justify-center">
                  <p className="text-gray-500">Map view (Coming soon)</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {property && (
        <EnquiryModal
          isOpen={enquiryModalOpen}
          onClose={() => setEnquiryModalOpen(false)}
          propertyId={property._id}
          propertyTitle={property.title}
          ownerName={property.contactInfo.name}
        />
      )}
    </div>
  );
}
