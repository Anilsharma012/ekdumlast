import React, { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import {
  Bell,
  MessageSquare,
  Crown,
  CheckCircle,
  Clock,
  User,
  Home,
  AlertCircle,
  RefreshCw,
  Eye,
  EyeOff,
} from "lucide-react";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";

interface SellerNotification {
  id: string;
  title: string;
  message: string;
  type: string;
  sender_role: string;
  sender_name: string;
  isRead: boolean;
  createdAt: string;
  source: string;
  priority?: string;
  propertyId?: string;
  propertyTitle?: string;
  conversationId?: string;
  unreadCount?: number;
}

interface NotificationsResponse {
  success: boolean;
  data: SellerNotification[];
  total: number;
  unreadCount: number;
}

export default function SellerNotifications() {
  const { token } = useAuth();
  const [notifications, setNotifications] = useState<SellerNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [unreadCount, setUnreadCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchNotifications();

    // Set up auto-refresh every 10 seconds for real-time updates
    const interval = setInterval(() => fetchNotifications(true), 10000);

    // Listen for notification events
    const handleNotificationUpdate = () => {
      console.log("🔔 Notification update event received");
      fetchNotifications(true);
    };

    // Listen for admin notification events
    window.addEventListener("adminNotification", handleNotificationUpdate);
    window.addEventListener("newMessage", handleNotificationUpdate);
    window.addEventListener("notificationUpdate", handleNotificationUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener("adminNotification", handleNotificationUpdate);
      window.removeEventListener("newMessage", handleNotificationUpdate);
      window.removeEventListener(
        "notificationUpdate",
        handleNotificationUpdate,
      );
    };
  }, [token]);

  const fetchNotifications = async (silent = false) => {
    if (!token) return;

    try {
      if (!silent) setLoading(true);
      setRefreshing(true);
      setError("");

      console.log("📬 Fetching seller notifications...");

      const response = await fetch("/api/seller/notifications", {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data: NotificationsResponse = await response.json();

      if (data.success) {
        setNotifications(data.data || []);
        setUnreadCount(data.unreadCount || 0);
        console.log(
          `✅ Loaded ${data.data?.length || 0} notifications (${data.unreadCount || 0} unread)`,
        );
      } else {
        setError(data.error || "Failed to load notifications");
        console.error("❌ Failed to fetch notifications:", data.error);
      }
    } catch (error: any) {
      console.error("❌ Network error fetching notifications:", error);
      setError("Network error. Please check your connection.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const markAsRead = async (notificationId: string) => {
    if (!token) return;

    try {
      const response = await fetch(
        `/api/seller/notifications/${notificationId}/read`,
        {
          method: "PUT",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        },
      );

      if (response.ok) {
        setNotifications((prev) =>
          prev.map((notif) =>
            notif.id === notificationId ? { ...notif, isRead: true } : notif,
          ),
        );
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const getNotificationIcon = (type: string, source: string) => {
    switch (type) {
      case "welcome":
      case "account":
        return <User className="h-5 w-5 text-blue-500" />;
      case "premium_offer":
      case "premium":
        return <Crown className="h-5 w-5 text-yellow-500" />;
      case "property_inquiry":
      case "conversation":
        return <Home className="h-5 w-5 text-green-500" />;
      case "direct_message":
        return <MessageSquare className="h-5 w-5 text-purple-500" />;
      case "admin_notification":
        return <Bell className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-500" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return "Just now";
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400)
      return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const handleNotificationClick = (notification: SellerNotification) => {
    // Mark as read
    if (!notification.isRead) {
      markAsRead(notification.id);
    }

    // Navigate based on notification type
    if (notification.conversationId) {
      window.location.href = `/conversation/${notification.conversationId}`;
    } else if (notification.propertyId) {
      window.location.href = `/property/${notification.propertyId}`;
    } else if (notification.type === "premium_offer") {
      window.location.href = "/packages";
    }
  };

  if (loading && notifications.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Messages & Notifications
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin w-6 h-6 border-2 border-red-500 border-t-transparent rounded-full mr-3"></div>
            <span className="text-gray-600">Loading messages...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center">
            <Bell className="h-5 w-5 mr-2" />
            Messages & Notifications
            {unreadCount > 0 && (
              <Badge className="ml-2 bg-red-500 text-white">
                {unreadCount}
              </Badge>
            )}
          </CardTitle>
          <Button
            onClick={() => fetchNotifications()}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw
              className={`h-4 w-4 mr-2 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
              <span className="text-red-700">{error}</span>
            </div>
            <Button
              onClick={() => fetchNotifications()}
              variant="outline"
              size="sm"
              className="mt-2"
            >
              Try Again
            </Button>
          </div>
        )}

        {notifications.length === 0 ? (
          <div className="text-center py-8">
            <Bell className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-600 mb-2">
              No messages yet
            </h3>
            <p className="text-gray-500">
              When you receive messages or notifications, they'll appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                  notification.isRead
                    ? "bg-white border-gray-200"
                    : "bg-blue-50 border-blue-200 shadow-sm"
                }`}
                onClick={() => handleNotificationClick(notification)}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0">
                    {getNotificationIcon(
                      notification.type,
                      notification.source,
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4
                        className={`text-sm font-medium ${
                          notification.isRead
                            ? "text-gray-900"
                            : "text-blue-900"
                        }`}
                      >
                        {notification.title}
                      </h4>
                      <div className="flex items-center space-x-2">
                        {notification.priority && (
                          <Badge
                            className={`text-xs ${getPriorityColor(notification.priority)}`}
                          >
                            {notification.priority}
                          </Badge>
                        )}
                        {notification.isRead ? (
                          <Eye className="h-3 w-3 text-gray-400" />
                        ) : (
                          <EyeOff className="h-3 w-3 text-blue-500" />
                        )}
                      </div>
                    </div>

                    <p
                      className={`text-sm mt-1 ${
                        notification.isRead ? "text-gray-600" : "text-blue-800"
                      }`}
                    >
                      {notification.message}
                    </p>

                    <div className="flex items-center justify-between mt-2">
                      <div className="flex items-center space-x-2 text-xs text-gray-500">
                        <span>From: {notification.sender_name}</span>
                        {notification.propertyTitle && (
                          <>
                            <span>•</span>
                            <span>Re: {notification.propertyTitle}</span>
                          </>
                        )}
                        {notification.unreadCount &&
                          notification.unreadCount > 1 && (
                            <>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs">
                                {notification.unreadCount} messages
                              </Badge>
                            </>
                          )}
                      </div>
                      <span className="text-xs text-gray-400">
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {notifications.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center justify-between text-sm text-gray-500">
              <span>{notifications.length} total messages</span>
              <Button
                onClick={() => (window.location.href = "/chats")}
                variant="outline"
                size="sm"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                View All Chats
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
