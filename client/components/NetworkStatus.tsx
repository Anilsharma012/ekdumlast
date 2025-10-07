import React, { useState, useEffect } from "react";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";
import {
  Wifi,
  WifiOff,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  X,
} from "lucide-react";

interface NetworkStatus {
  isOnline: boolean;
  serverReachable: boolean;
  lastChecked: Date;
  connectionQuality: "excellent" | "good" | "fair" | "poor" | "offline";
}

const NetworkStatusComponent: React.FC = () => {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: navigator.onLine,
    serverReachable: false,
    lastChecked: new Date(),
    connectionQuality: "good",
  });
  const [isVisible, setIsVisible] = useState(false);
  const [isChecking, setIsChecking] = useState(false);

  // Temporarily disable network status to prevent fetch errors
  if (process.env.NODE_ENV === "development") {
    return null;
  }

  const checkConnection = async () => {
    if (isChecking) return; // Prevent overlapping checks

    setIsChecking(true);

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // Increased timeout

      const startTime = Date.now();
      const response = await fetch("/api/health", {
        method: "GET",
        signal: controller.signal,
        cache: "no-cache",
        headers: {
          "Content-Type": "application/json",
        },
      });

      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      let quality: "excellent" | "good" | "fair" | "poor" | "offline" = "good";

      if (!navigator.onLine) {
        quality = "offline";
      } else if (!response.ok) {
        quality = "poor";
      } else if (latency < 200) {
        quality = "excellent";
      } else if (latency < 500) {
        quality = "good";
      } else if (latency < 1000) {
        quality = "fair";
      } else {
        quality = "poor";
      }

      setStatus({
        isOnline: navigator.onLine,
        serverReachable: response.ok,
        lastChecked: new Date(),
        connectionQuality: quality,
      });
    } catch (error) {
      // Handle different error types more gracefully
      if (error instanceof Error && error.name === "AbortError") {
        console.warn("NetworkStatus: Connection check timed out");
      } else {
        console.warn("NetworkStatus: Connection check failed:", error);
      }

      setStatus({
        isOnline: navigator.onLine,
        serverReachable: false,
        lastChecked: new Date(),
        connectionQuality: navigator.onLine ? "poor" : "offline",
      });
    } finally {
      setIsChecking(false);
    }
  };

  useEffect(() => {
    // Initial check
    checkConnection();

    // Set up event listeners
    const handleOnline = () => {
      setStatus((prev) => ({ ...prev, isOnline: true }));
      setIsVisible(true);
      checkConnection();
      setTimeout(() => setIsVisible(false), 3000);
    };

    const handleOffline = () => {
      setStatus((prev) => ({
        ...prev,
        isOnline: false,
        serverReachable: false,
        connectionQuality: "offline",
      }));
      setIsVisible(true);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Periodic check - reduced frequency to avoid spam
    const interval = setInterval(checkConnection, 60000); // Changed from 30s to 60s

    // Show status if connection is poor
    if (
      !status.isOnline ||
      !status.serverReachable ||
      status.connectionQuality === "poor"
    ) {
      setIsVisible(true);
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      clearInterval(interval);
    };
  }, []);

  const getStatusIcon = () => {
    if (!status.isOnline) {
      return <WifiOff className="h-4 w-4 text-red-500" />;
    }

    if (!status.serverReachable) {
      return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }

    switch (status.connectionQuality) {
      case "excellent":
      case "good":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "fair":
        return <Wifi className="h-4 w-4 text-yellow-500" />;
      case "poor":
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
      default:
        return <WifiOff className="h-4 w-4 text-red-500" />;
    }
  };

  const getStatusText = () => {
    if (!status.isOnline) {
      return "Offline";
    }

    if (!status.serverReachable) {
      return "Server Unreachable";
    }

    switch (status.connectionQuality) {
      case "excellent":
        return "Excellent Connection";
      case "good":
        return "Good Connection";
      case "fair":
        return "Fair Connection";
      case "poor":
        return "Poor Connection";
      default:
        return "Unknown Status";
    }
  };

  const getStatusColor = () => {
    if (!status.isOnline || status.connectionQuality === "offline") {
      return "bg-red-100 border-red-200 text-red-800";
    }

    if (!status.serverReachable || status.connectionQuality === "poor") {
      return "bg-orange-100 border-orange-200 text-orange-800";
    }

    if (status.connectionQuality === "fair") {
      return "bg-yellow-100 border-yellow-200 text-yellow-800";
    }

    return "bg-green-100 border-green-200 text-green-800";
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <Card className={`border ${getStatusColor()}`}>
        <CardContent className="flex items-center justify-between p-3">
          <div className="flex items-center space-x-2">
            {getStatusIcon()}
            <div>
              <p className="text-sm font-medium">{getStatusText()}</p>
              <p className="text-xs opacity-75">
                Last checked: {status.lastChecked.toLocaleTimeString()}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={checkConnection}
              disabled={isChecking}
              className="h-6 w-6 p-0"
            >
              <RefreshCw
                className={`h-3 w-3 ${isChecking ? "animate-spin" : ""}`}
              />
            </Button>

            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsVisible(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default NetworkStatusComponent;
