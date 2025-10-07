import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { Property } from "@shared/types";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import SellerNotifications from "../components/SellerNotifications";
import {
  Plus,
  Home,
  Eye,
  MessageSquare,
  TrendingUp,
  Clock,
  CheckCircle,
  XCircle,
  User,
  Settings,
  LogOut,
  Phone,
  Mail,
  MapPin,
  Calendar,
  RefreshCw,
} from "lucide-react";
import OLXStyleHeader from "../components/OLXStyleHeader";
import BottomNavigation from "../components/BottomNavigation";

export default function SellerDashboard() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [properties, setProperties] = useState<Property[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [stats, setStats] = useState({
    totalProperties: 0,
    pendingApproval: 0,
    approved: 0,
    rejected: 0,
    totalViews: 0,
    totalInquiries: 0,
  });

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }

    if (user.userType !== "seller") {
      // Redirect to appropriate dashboard
      switch (user.userType) {
        case "buyer":
          navigate("/buyer-dashboard");
          break;
        case "agent":
          navigate("/agent-dashboard");
          break;
        default:
          navigate("/user-dashboard");
      }
      return;
    }

    // Redirect to enhanced dashboard
    navigate("/enhanced-seller-dashboard");
    return;

    // fetchUserProperties();
  }, [user, navigate]);

  const fetchUserProperties = async () => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        navigate("/login");
        return;
      }

      const response = await api.get("/user/properties", token);
      if (response.data.success) {
        const userProperties = response.data.data as Property[];
        setProperties(userProperties);

        // Calculate stats
        const totalViews = userProperties.reduce(
          (sum, prop) => sum + prop.views,
          0,
        );
        const totalInquiries = userProperties.reduce(
          (sum, prop) => sum + prop.inquiries,
          0,
        );

        setStats({
          totalProperties: userProperties.length,
          pendingApproval: userProperties.filter(
            (p) => p.approvalStatus === "pending",
          ).length,
          approved: userProperties.filter(
            (p) => p.approvalStatus === "approved",
          ).length,
          rejected: userProperties.filter(
            (p) => p.approvalStatus === "rejected",
          ).length,
          totalViews,
          totalInquiries,
        });
      }
    } catch (error: any) {
      console.error("Error fetching properties:", error);
      if (error.message.includes("401") || error.message.includes("403")) {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        navigate("/login");
        return;
      }
      setError("Failed to load your properties. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "pending":
        return (
          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
            Pending Review
          </Badge>
        );
      case "approved":
        return (
          <Badge variant="default" className="bg-green-100 text-green-800">
            Approved
          </Badge>
        );
      case "rejected":
        return (
          <Badge variant="destructive" className="bg-red-100 text-red-800">
            Rejected
          </Badge>
        );
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <OLXStyleHeader />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-[#C70000] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading your dashboard...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <OLXStyleHeader />

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Seller Dashboard
            </h1>
            <p className="text-gray-600">Welcome back, {user?.name}!</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button onClick={fetchUserProperties} variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button onClick={handleLogout} variant="outline" size="sm">
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                Total Properties
              </CardTitle>
              <Home className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalProperties}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {stats.pendingApproval}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {stats.approved}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.rejected}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Views</CardTitle>
              <Eye className="h-4 w-4 text-blue-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {stats.totalViews}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inquiries</CardTitle>
              <MessageSquare className="h-4 w-4 text-purple-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-purple-600">
                {stats.totalInquiries}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link to="/post-property">
                <Button className="w-full bg-[#C70000] hover:bg-[#A60000] text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  Post New Property
                </Button>
              </Link>
              <Link to="/my-properties">
                <Button variant="outline" className="w-full">
                  <Home className="h-4 w-4 mr-2" />
                  Manage Properties
                </Button>
              </Link>
              <Link to="/messages">
                <Button variant="outline" className="w-full">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  View Messages
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Messages & Notifications */}
        <SellerNotifications />

        {/* User Profile */}
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <User className="h-4 w-4 text-gray-400" />
                <span className="font-medium">{user?.name}</span>
              </div>
              <div className="flex items-center space-x-2">
                <Mail className="h-4 w-4 text-gray-400" />
                <span>{user?.email}</span>
              </div>
              {user?.phone && (
                <div className="flex items-center space-x-2">
                  <Phone className="h-4 w-4 text-gray-400" />
                  <span>{user.phone}</span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="bg-blue-100 text-blue-800">
                  {user?.userType?.charAt(0).toUpperCase() +
                    user?.userType?.slice(1)}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recent Properties */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Your Recent Properties</CardTitle>
            <Link to="/my-properties">
              <Button variant="outline" size="sm">
                View All
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {properties.length === 0 ? (
              <div className="text-center py-8">
                <Home className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                <p className="text-gray-500 mb-4">
                  You haven't posted any properties yet
                </p>
                <Link to="/post-property">
                  <Button className="bg-[#C70000] hover:bg-[#A60000] text-white">
                    <Plus className="h-4 w-4 mr-2" />
                    Post Your First Property
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="space-y-4">
                {properties.slice(0, 3).map((property) => (
                  <div
                    key={property._id}
                    className="border border-gray-200 rounded-lg p-4"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900">
                          {property.title}
                        </h3>
                        <p className="text-sm text-gray-500 mt-1">
                          <MapPin className="inline h-3 w-3 mr-1" />
                          {property.location.address}
                        </p>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className="text-lg font-bold text-[#C70000]">
                            ₹{property.price.toLocaleString()}
                          </span>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Eye className="h-3 w-3" />
                            <span>{property.views} views</span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-500">
                            <Calendar className="h-3 w-3" />
                            <span>
                              {new Date(
                                property.createdAt,
                              ).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-end space-y-2">
                        {getStatusBadge(property.approvalStatus)}
                        <Button size="sm" variant="outline">
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <BottomNavigation />
    </div>
  );
}
