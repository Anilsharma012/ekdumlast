import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Send,
  Phone,
  MoreVertical,
  ImageIcon,
  Search,
  Circle,
  AlertCircle,
} from "lucide-react";
import Header from "../components/Header";
import BottomNavigation from "../components/BottomNavigation";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { ChatConversation, ChatMessage } from "@shared/chat-types";
import { ApiResponse } from "@shared/types";
import { useAuth } from "../hooks/useAuth";

interface ConversationWithDetails extends ChatConversation {
  participantDetails: Array<{
    _id: string;
    name: string;
    userType: string;
  }>;
  propertyDetails?: Array<{
    _id: string;
    title: string;
    price: number;
    images: string[];
    location: { address: string };
  }>;
  unreadCount: number;
}

export default function Chat() {
  const [searchParams] = useSearchParams();
  const { user, token, isAuthenticated, loading: authLoading } = useAuth();
  const conversationId = searchParams.get("conversation");
  const propertyId = searchParams.get("propertyId");

  const [conversations, setConversations] = useState<ConversationWithDetails[]>(
    [],
  );
  const [currentConversation, setCurrentConversation] =
    useState<ConversationWithDetails | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [startingPropertyChat, setStartingPropertyChat] = useState(false);
  const [error, setError] = useState("");

  // Fetch conversations from API
  const fetchConversations = async () => {
    if (!token) return;

    try {
      const response = await fetch("/api/chat/conversations", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data: ApiResponse<ConversationWithDetails[]> =
        await response.json();

      if (data.success && data.data) {
        setConversations(data.data);
      } else {
        setError(data.error || "Failed to load conversations");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    }
  };

  // Fetch messages for a conversation
  const fetchMessages = async (convId: string) => {
    if (!token) return;

    try {
      const response = await fetch(
        `/api/chat/conversations/${convId}/messages`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data: ApiResponse<{ messages: ChatMessage[] }> =
        await response.json();

      if (data.success && data.data) {
        setMessages(data.data.messages);
      } else {
        setError(data.error || "Failed to load messages");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    }
  };

  useEffect(() => {
    // Wait for auth loading to complete
    if (authLoading) return;

    if (!isAuthenticated) {
      window.location.href = "/auth";
      return;
    }

    setLoading(true);
    setError("");

    fetchConversations().then(() => {
      if (conversationId) {
        fetchMessages(conversationId);
      }
      setLoading(false);
    });
  }, [conversationId, isAuthenticated, token, authLoading]);

  useEffect(() => {
    if (conversationId && conversations.length > 0) {
      const conv = conversations.find((c) => c._id === conversationId);
      if (conv) {
        setCurrentConversation(conv);
      }
    }
  }, [conversationId, conversations]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !currentConversation || sendingMessage || !token)
      return;

    setSendingMessage(true);
    setError("");

    try {
      const response = await fetch("/api/chat/messages", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          conversationId: currentConversation._id,
          message: newMessage,
          messageType: "text",
        }),
      });

      const data: ApiResponse<{ messageId: string; conversationId: string }> =
        await response.json();

      if (data.success) {
        // Add message to local state immediately
        const optimisticMessage: ChatMessage = {
          _id: data.data!.messageId,
          conversationId: currentConversation._id!,
          senderId: user!.id,
          senderName: user!.name,
          senderType: user!.userType,
          message: newMessage,
          messageType: "text",
          readBy: [
            {
              userId: user!.id,
              readAt: new Date(),
            },
          ] as any,
          createdAt: new Date(),
        };

        setMessages((prev) => [...prev, optimisticMessage]);
        setNewMessage("");

        // Refresh conversations to update last message
        fetchConversations();
      } else {
        setError(data.error || "Failed to send message");
      }
    } catch (error) {
      setError("Network error. Please try again.");
    } finally {
      setSendingMessage(false);
    }
  };

  const handleConversationSelect = (conversation: ConversationWithDetails) => {
    setCurrentConversation(conversation);
    fetchMessages(conversation._id!);
    window.history.pushState({}, "", `/chat?conversation=${conversation._id}`);
  };

  const handleBackToList = () => {
    setCurrentConversation(null);
    window.history.pushState({}, "", "/chat");
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
    } else if (days === 1) {
      return "Yesterday";
    } else if (days < 7) {
      return date.toLocaleDateString("en-US", { weekday: "short" });
    } else {
      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      });
    }
  };

  const filteredConversations = conversations.filter((conversation) => {
    const otherParticipant = conversation.participantDetails[0];
    const property = conversation.propertyDetails?.[0];

    return (
      otherParticipant?.name
        .toLowerCase()
        .includes(searchQuery.toLowerCase()) ||
      property?.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.lastMessage?.message
        .toLowerCase()
        .includes(searchQuery.toLowerCase())
    );
  });

  // Show loading while auth is loading
  if (authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-[#C70000] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <p className="text-gray-600">Please login to access chat</p>
            <Button
              onClick={() => (window.location.href = "/auth")}
              className="mt-4 bg-[#C70000] hover:bg-[#A60000] text-white"
            >
              Sign In / Sign Up
            </Button>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-[#C70000] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading chats...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  // Individual conversation view
  if (currentConversation) {
    const otherParticipant = currentConversation.participantDetails[0];
    const property = currentConversation.propertyDetails?.[0];

    return (
      <div className="min-h-screen bg-gray-50 flex flex-col">
        {/* Conversation Header */}
        <header className="bg-white border-b px-4 py-3 flex items-center space-x-3">
          <button onClick={handleBackToList} className="p-1">
            <ArrowLeft className="h-6 w-6 text-gray-700" />
          </button>

          <div className="w-10 h-10 bg-[#C70000] rounded-full flex items-center justify-center">
            <span className="text-white font-semibold">
              {otherParticipant?.name?.charAt(0) || "U"}
            </span>
          </div>

          <div className="flex-1">
            <h3 className="font-semibold text-gray-900">
              {otherParticipant?.name || "Unknown User"}
            </h3>
            <div className="flex items-center space-x-1">
              <Circle className="h-2 w-2 text-green-500 fill-current" />
              <span className="text-xs text-gray-500">Online</span>
            </div>
          </div>

          <div className="flex space-x-2">
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <Phone className="h-5 w-5 text-gray-600" />
            </button>
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <MoreVertical className="h-5 w-5 text-gray-600" />
            </button>
          </div>
        </header>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-b border-red-200 p-3 flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Property Card (if conversation is about a property) */}
        {property && (
          <div className="bg-white border-b p-4">
            <div className="flex items-center space-x-3 bg-gray-50 rounded-lg p-3">
              <img
                src={property.images[0] || "/placeholder.svg"}
                alt={property.title}
                className="w-16 h-16 object-cover rounded-lg"
              />
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 text-sm">
                  {property.title}
                </h4>
                <p className="text-xs text-gray-600">
                  {property.location.address}
                </p>
                <p className="text-sm font-semibold text-[#C70000]">
                  ₹{(property.price / 100000).toFixed(1)}L
                </p>
              </div>
              <Button size="sm" variant="outline" className="text-xs">
                View
              </Button>
            </div>
          </div>
        )}

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map((message) => (
            <div
              key={message._id}
              className={`flex ${
                message.senderId === user?.id ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                  message.senderId === user?.id
                    ? "bg-[#C70000] text-white"
                    : "bg-white text-gray-900"
                } shadow-sm`}
              >
                <p className="text-sm">{message.message}</p>
                <p
                  className={`text-xs mt-1 ${
                    message.senderId === user?.id
                      ? "text-red-100"
                      : "text-gray-500"
                  }`}
                >
                  {formatTime(message.createdAt)}
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* Message Input */}
        <div className="bg-white border-t p-4">
          <div className="flex items-center space-x-2">
            <button className="p-2 hover:bg-gray-100 rounded-full">
              <ImageIcon className="h-5 w-5 text-gray-600" />
            </button>
            <Input
              placeholder="Type a message..."
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              onKeyPress={(e) => e.key === "Enter" && handleSendMessage()}
              className="flex-1"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!newMessage.trim() || sendingMessage}
              className="bg-[#C70000] hover:bg-[#A60000] text-white p-2"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Chat list view
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />

      <div className="bg-white border-b p-4">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Chats</h1>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 flex items-center space-x-2">
            <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="pb-20">
        {filteredConversations.length === 0 ? (
          <div className="text-center py-20">
            <div className="bg-white rounded-lg p-8 mx-4 shadow-sm">
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                No conversations yet
              </h3>
              <p className="text-gray-600 mb-4">
                Start chatting with property owners and agents by visiting
                property listings.
              </p>
              <Button
                onClick={() => (window.location.href = "/")}
                className="bg-[#C70000] hover:bg-[#A60000] text-white"
              >
                Browse Properties
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            {filteredConversations.map((conversation) => {
              const otherParticipant = conversation.participantDetails[0];
              const property = conversation.propertyDetails?.[0];

              return (
                <div
                  key={conversation._id}
                  onClick={() => handleConversationSelect(conversation)}
                  className="bg-white border-b p-4 hover:bg-gray-50 cursor-pointer"
                >
                  <div className="flex items-center space-x-3">
                    <div className="relative">
                      <div className="w-12 h-12 bg-[#C70000] rounded-full flex items-center justify-center">
                        <span className="text-white font-semibold">
                          {otherParticipant?.name?.charAt(0) || "U"}
                        </span>
                      </div>
                      {conversation.unreadCount > 0 && (
                        <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#C70000] rounded-full flex items-center justify-center">
                          <span className="text-white text-xs font-bold">
                            {conversation.unreadCount > 9
                              ? "9+"
                              : conversation.unreadCount}
                          </span>
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 truncate">
                          {otherParticipant?.name || "Unknown User"}
                        </h3>
                        <span className="text-xs text-gray-500">
                          {formatTime(conversation.lastMessageAt)}
                        </span>
                      </div>

                      {property && (
                        <p className="text-xs text-gray-600 truncate">
                          Property: {property.title}
                        </p>
                      )}

                      <div className="flex items-center justify-between mt-1">
                        <p
                          className={`text-sm truncate ${
                            conversation.unreadCount > 0
                              ? "text-gray-900 font-medium"
                              : "text-gray-600"
                          }`}
                        >
                          {conversation.lastMessage?.message ||
                            "No messages yet"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <BottomNavigation />
    </div>
  );
}
