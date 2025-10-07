import React from "react";
import { Home, MessageCircle, Plus, User, FileText } from "lucide-react";
import { useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useUnreadCount } from "../hooks/useUnreadCount";

export default function BottomNavigation() {
  const location = useLocation();
  const unreadCount = useUnreadCount();
  const { isAuthenticated } = useAuth();

  const navItems = [
    {
      icon: Home,
      label: "Home",
      path: "/",
      active: location.pathname === "/",
    },
    {
      icon: FileText,
      label: "My Ads",
      path: isAuthenticated
        ? "/account/my-ads"
        : `/auth?returnTo=${encodeURIComponent("/account/my-ads")}`,
      active: location.pathname === "/account/my-ads",
    },
    {
      icon: null, // Center button placeholder
      label: "",
      path: "",
      active: false,
    },
    {
      icon: MessageCircle,
      label: "Chat",
      path: "/chat",
      active: location.pathname === "/chat",
    },
    {
      icon: User,
      label: "My Account",
      path: "/my-account",
      active: location.pathname === "/my-account",
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 shadow-lg">
      <div className="flex items-center justify-around h-16 relative">
        {navItems.map((item, index) => {
          if (index === 2) {
            // Center add button
            return (
              <div key="add-button" className="flex-1 flex justify-center">
                <a
                  href={isAuthenticated ? "/post-property" : `/auth?returnTo=${encodeURIComponent("/post-property")}`}
                  className="w-14 h-14 bg-[#C70000] rounded-full flex items-center justify-center shadow-lg transform -translate-y-2 hover:bg-[#A60000] transition-colors active:scale-95"
                >
                  <Plus className="h-6 w-6 text-white" />
                </a>
              </div>
            );
          }

          const IconComponent = item.icon!;
          return (
            <a
              key={item.label}
              href={item.path}
              className={`flex-1 flex flex-col items-center justify-center py-2 relative transition-colors ${
                item.active
                  ? "text-[#C70000]"
                  : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <div className="relative">
                <IconComponent
                  className={`h-6 w-6 mb-1 ${
                    item.active ? "text-[#C70000]" : "text-gray-500"
                  }`}
                />
                {item.label === "Chat" && unreadCount > 0 && (
                  <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#C70000] rounded-full flex items-center justify-center">
                    <span className="text-white text-xs font-bold">
                      {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                  </div>
                )}
              </div>
              <span className="text-xs font-medium">{item.label}</span>
            </a>
          );
        })}
      </div>
    </nav>
  );
}
