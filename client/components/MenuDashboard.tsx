import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { Property } from "@shared/types";
import { api } from "../lib/api";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import {
  Plus,
  Home,
  Eye,
  MessageSquare,
  Heart,
  User,
  Settings,
  LogOut,
  Bell,
  TrendingUp,
  Users,
  Target,
  Star,
  Briefcase,
  RefreshCw,
  ArrowRight,
  Edit,
} from "lucide-react";

interface MenuDashboardProps {
  onClose: () => void;
}

export default function MenuDashboard({ onClose }: MenuDashboardProps) {
  const { user, logout } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProperties: 0,
    pendingApproval: 0,
    approved: 0,
    totalViews: 0,
    totalInquiries: 0,
    unreadNotifications: 0,
    // Agent specific
    totalClients: 0,
    closedDeals: 0,
    commission: 0,
    // Buyer specific
    favorites: 0,
    recentViews: 0,
  });

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      // Fetch properties/stats for sellers and agents
      if (user?.userType === "seller") {
        // Prefer seller-specific aggregated stats endpoint
        const statsRes = await api.get("/seller/stats", token);
        if (statsRes?.data?.success && statsRes.data.data) {
          const s = statsRes.data.data;
          setStats((prev) => ({
            ...prev,
            totalProperties: s.totalProperties || 0,
            pendingApproval: s.pendingApproval || 0,
            approved: s.approved || 0,
            totalViews: s.totalViews || 0,
            totalInquiries: s.totalInquiries || 0,
            unreadNotifications: s.unreadNotifications || 0,
          }));
        }

        // Also fetch recent properties list
        const propsRes = await api.get("/seller/properties", token);
        if (propsRes?.data?.success) {
          const userProperties = propsRes.data.data as Property[];
          setProperties(userProperties);
        }
      } else if (user?.userType === "agent") {
        // Agents still use user/properties endpoint for listings
        const response = await api.get("/user/properties", token);
        if (response?.data?.success) {
          const userProperties = response.data.data as Property[];
          setProperties(userProperties);

          const totalViews = userProperties.reduce(
            (sum, prop) => sum + (prop.views || 0),
            0,
          );
          const totalInquiries = userProperties.reduce(
            (sum, prop) => sum + (prop.inquiries || 0),
            0,
          );

          setStats((prev) => ({
            ...prev,
            totalProperties: userProperties.length,
            pendingApproval: userProperties.filter(
              (p) => p.approvalStatus === "pending",
            ).length,
            approved: userProperties.filter(
              (p) => p.approvalStatus === "approved",
            ).length,
            totalViews,
            totalInquiries,
          }));
        }
      }

      // Mock additional stats based on user type
      if (user?.userType === "agent") {
        setStats((prev) => ({
          ...prev,
          totalClients: 25,
          closedDeals: 12,
          commission: 450000,
        }));
      } else if (user?.userType === "buyer") {
        setStats((prev) => ({
          ...prev,
          favorites: user?.favorites?.length || 0,
          recentViews: 5,
        }));
      }
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    onClose();
    window.location.href = "/";
  };

  const navigateAndClose = (path: string) => {
    onClose();
    window.location.href = path;
  };

  const renderUserTypeStats = () => {
    switch (user?.userType) {
      case "seller":
        return (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-blue-600">
                {stats.totalProperties}
              </div>
              <div className="text-xs text-blue-700">Total Listings</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-green-600">
                {stats.approved}
              </div>
              <div className="text-xs text-green-700">Approved</div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-yellow-600">
                {stats.pendingApproval}
              </div>
              <div className="text-xs text-yellow-700">Pending</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-purple-600">
                {stats.totalViews}
              </div>
              <div className="text-xs text-purple-700">Total Views</div>
            </div>
          </div>
        );

      case "agent":
        return (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-blue-600">
                {stats.totalProperties}
              </div>
              <div className="text-xs text-blue-700">Active Listings</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-green-600">
                {stats.totalClients}
              </div>
              <div className="text-xs text-green-700">Total Clients</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-purple-600">
                {stats.closedDeals}
              </div>
              <div className="text-xs text-purple-700">Closed Deals</div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-orange-600">
                ₹{(stats.commission / 1000).toFixed(0)}K
              </div>
              <div className="text-xs text-orange-700">Commission</div>
            </div>
          </div>
        );

      case "buyer":
        return (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-red-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-red-600">
                {stats.favorites}
              </div>
              <div className="text-xs text-red-700">Favorites</div>
            </div>
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-blue-600">
                {stats.recentViews}
              </div>
              <div className="text-xs text-blue-700">Recent Views</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-green-600">2</div>
              <div className="text-xs text-green-700">Saved Searches</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-purple-600">3</div>
              <div className="text-xs text-purple-700">Inquiries</div>
            </div>
          </div>
        );

      default:
        return (
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-blue-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-blue-600">
                {stats.totalProperties}
              </div>
              <div className="text-xs text-blue-700">My Properties</div>
            </div>
            <div className="bg-green-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-green-600">
                {stats.approved}
              </div>
              <div className="text-xs text-green-700">Approved</div>
            </div>
            <div className="bg-purple-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-purple-600">
                {stats.totalViews}
              </div>
              <div className="text-xs text-purple-700">Total Views</div>
            </div>
            <div className="bg-orange-50 p-3 rounded-lg text-center">
              <div className="text-lg font-bold text-orange-600">0</div>
              <div className="text-xs text-orange-700">Notifications</div>
            </div>
          </div>
        );
    }
  };

  const renderQuickActions = () => {
    const commonActions = [
      {
        icon: <Settings className="h-4 w-4" />,
        label: "Settings",
        path: "/settings",
      },
      {
        icon: <MessageSquare className="h-4 w-4" />,
        label: "Messages",
        path: "/messages",
      },
    ];

    const userTypeActions = {
      seller: [
        {
          icon: <Plus className="h-4 w-4" />,
          label: "Post Property",
          path: "/post-property",
        },
        {
          icon: <Home className="h-4 w-4" />,
          label: "My Properties",
          path: "/my-properties",
        },
        {
          icon: <Edit className="h-4 w-4" />,
          label: "Blog",
          path: "/seller/blog",
        },
      ],
      agent: [
        {
          icon: <Plus className="h-4 w-4" />,
          label: "Add Listing",
          path: "/post-property",
        },
        {
          icon: <Users className="h-4 w-4" />,
          label: "Clients",
          path: "/clients",
        },
      ],
      buyer: [
        {
          icon: <Heart className="h-4 w-4" />,
          label: "Wishlist",
          path: "/wishlist",
        },
        {
          icon: <Eye className="h-4 w-4" />,
          label: "Recent Views",
          path: "/recent-views",
        },
      ],
    };

    const actions = [
      ...(userTypeActions[user?.userType as keyof typeof userTypeActions] ||
        []),
      ...commonActions,
    ];

    return (
      <div className="space-y-2 mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">
          Quick Actions
        </h4>
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={() => navigateAndClose(action.path)}
            className="w-full flex items-center space-x-3 px-3 py-2 hover:bg-gray-100 rounded-lg text-left transition-colors"
          >
            {action.icon}
            <span className="text-sm">{action.label}</span>
            <ArrowRight className="h-3 w-3 ml-auto" />
          </button>
        ))}
      </div>
    );
  };

  const getDashboardPath = () => {
    switch (user?.userType) {
      case "seller":
        return "/enhanced-seller-dashboard";
      case "agent":
        return "/agent-dashboard";
      case "buyer":
        return "/buyer-dashboard";
      case "admin":
        return "/admin";
      default:
        return "/user-dashboard";
    }
  };

  if (loading) {
    return (
      <div className="p-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-4"></div>
          <div className="grid grid-cols-2 gap-3 mb-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-h-screen overflow-y-auto">
      {/* User Profile Header */}
      <div className="flex items-center space-x-3 mb-4 pb-4 border-b border-gray-200">
        <div className="w-12 h-12 bg-[#C70000] rounded-full flex items-center justify-center">
          <span className="text-white font-semibold text-lg">
            {user?.name?.charAt(0)?.toUpperCase()}
          </span>
        </div>
        <div className="flex-1">
          <h3 className="font-semibold text-gray-900">{user?.name}</h3>
          <div className="flex items-center space-x-2">
            <Badge variant="outline" className="text-xs">
              {user?.userType === "agent" && (
                <Briefcase className="h-3 w-3 mr-1" />
              )}
              {user?.userType === "seller" && <Home className="h-3 w-3 mr-1" />}
              {user?.userType === "buyer" && <User className="h-3 w-3 mr-1" />}
              {user?.userType?.charAt(0).toUpperCase() +
                user?.userType?.slice(1)}
            </Badge>
          </div>
        </div>
      </div>

      {/* Dashboard Stats */}
      {renderUserTypeStats()}

      {/* Quick Actions */}
      {renderQuickActions()}

      {/* Recent Properties (for sellers/agents) */}
      {(user?.userType === "seller" || user?.userType === "agent") &&
        properties.length > 0 && (
          <div className="mb-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">
              Recent Listings
            </h4>
            <div className="space-y-2">
              {properties.slice(0, 3).map((property) => (
                <div
                  key={property._id}
                  className="flex items-center space-x-3 p-2 bg-gray-50 rounded-lg"
                >
                  <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                    <Home className="h-4 w-4 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {property.title}
                    </p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500">
                      <span>₹{property.price.toLocaleString()}</span>
                      <span>•</span>
                      <span>{property.views} views</span>
                    </div>
                  </div>
                  <Badge
                    variant={
                      property.approvalStatus === "approved"
                        ? "default"
                        : "outline"
                    }
                    className="text-xs"
                  >
                    {property.approvalStatus}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        )}

      {/* Full Dashboard Button */}
      <div className="mb-4">
        <button
          onClick={() => navigateAndClose(getDashboardPath())}
          className="w-full bg-[#C70000] hover:bg-[#A60000] text-white py-2 px-4 rounded-lg text-sm font-medium transition-colors"
        >
          View Full Dashboard
        </button>
      </div>

      {/* Navigation Links */}
      <div className="space-y-1 mb-4 border-t border-gray-200 pt-4">
        <button
          onClick={() => navigateAndClose("/")}
          className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-lg text-sm"
        >
          Home
        </button>
        <button
          onClick={() => navigateAndClose("/categories")}
          className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-lg text-sm"
        >
          Categories
        </button>
        <button
          onClick={() => navigateAndClose("/properties")}
          className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded-lg text-sm"
        >
          Browse Properties
        </button>
      </div>

      {/* Logout Button */}
      <div className="border-t border-gray-200 pt-4">
        <button
          onClick={handleLogout}
          className="w-full flex items-center space-x-2 px-3 py-2 text-[#C70000] hover:bg-red-50 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span className="text-sm font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}
