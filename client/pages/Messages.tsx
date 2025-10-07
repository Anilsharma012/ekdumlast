import React, { useState, useEffect, useRef } from "react";
import { useAuth } from "../hooks/useAuth";
import { useNavigate, Link } from "react-router-dom";
import { api } from "../lib/api";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { Badge } from "../components/ui/badge";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  MessageSquare,
  Send,
  Search,
  Filter,
  Phone,
  Video,
  MoreHorizontal,
  Star,
  Archive,
  Trash2,
  Reply,
  Forward,
  User,
  Calendar,
  Clock,
  CheckCircle2,
  Circle,
  Home,
  MapPin,
  Eye,
  RefreshCw,
  Paperclip,
  Image,
  File,
  Download,
  AlertCircle,
} from "lucide-react";
import OLXStyleHeader from "../components/OLXStyleHeader";
import BottomNavigation from "../components/BottomNavigation";

interface Message {
  _id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderEmail: string;
  receiverId: string;
  content: string;
  propertyId?: string;
  propertyTitle?: string;
  propertyPrice?: number;
  attachments?: Attachment[];
  timestamp: string;
  isRead: boolean;
  messageType: "inquiry" | "reply" | "general";
}

interface Conversation {
  _id: string;
  participants: Participant[];
  property?: {
    _id: string;
    title: string;
    price: number;
    location: string;
    images: string[];
  };
  lastMessage: Message;
  unreadCount: number;
  isArchived: boolean;
  isStarred: boolean;
  updatedAt: string;
}

interface Participant {
  _id: string;
  name: string;
  email: string;
  userType: string;
  avatar?: string;
}

interface Attachment {
  name: string;
  type: string;
  size: number;
  url: string;
}

export default function Messages() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  // Data states
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] =
    useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [attachments, setAttachments] = useState<File[]>([]);

  // Filters
  const [filterBy, setFilterBy] = useState<
    "all" | "unread" | "starred" | "archived"
  >("all");

  useEffect(() => {
    if (!user) {
      navigate("/login");
      return;
    }
    fetchConversations();
  }, [user, navigate]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const fetchConversations = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await api.get("/messages/conversations", token);
      if (response.data.success) {
        const conversationsData = response.data.data;
        setConversations(conversationsData);

        // Auto-select first conversation if none selected
        if (conversationsData.length > 0 && !selectedConversation) {
          setSelectedConversation(conversationsData[0]);
          fetchMessages(conversationsData[0]._id);
        }
      }
    } catch (error) {
      console.error("Error fetching conversations:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      const response = await api.get(
        `/messages/conversation/${conversationId}`,
        token,
      );
      if (response.data.success) {
        setMessages(response.data.data);
        // Mark messages as read
        await markConversationAsRead(conversationId);
      }
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() && attachments.length === 0) return;
    if (!selectedConversation) return;

    try {
      setSending(true);
      const token = localStorage.getItem("token");
      if (!token) return;

      const formData = new FormData();
      formData.append("conversationId", selectedConversation._id);
      formData.append("content", newMessage);
      formData.append("messageType", "reply");

      // Add attachments
      attachments.forEach((file) => {
        formData.append("attachments", file);
      });

      const response = await api.post("/messages/send", formData, token, {
        "Content-Type": "multipart/form-data",
      });

      if (response.data.success) {
        setNewMessage("");
        setAttachments([]);
        fetchMessages(selectedConversation._id);
        fetchConversations(); // Refresh conversations list
      }
    } catch (error) {
      console.error("Error sending message:", error);
    } finally {
      setSending(false);
    }
  };

  const markConversationAsRead = async (conversationId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      await api.put(`/messages/conversation/${conversationId}/read`, {}, token);

      // Update local state
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === conversationId ? { ...conv, unreadCount: 0 } : conv,
        ),
      );
    } catch (error) {
      console.error("Error marking conversation as read:", error);
    }
  };

  const toggleStarConversation = async (conversationId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      await api.put(`/messages/conversation/${conversationId}/star`, {}, token);

      // Update local state
      setConversations((prev) =>
        prev.map((conv) =>
          conv._id === conversationId
            ? { ...conv, isStarred: !conv.isStarred }
            : conv,
        ),
      );
    } catch (error) {
      console.error("Error toggling star:", error);
    }
  };

  const archiveConversation = async (conversationId: string) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      await api.put(
        `/messages/conversation/${conversationId}/archive`,
        {},
        token,
      );
      fetchConversations();
    } catch (error) {
      console.error("Error archiving conversation:", error);
    }
  };

  const deleteConversation = async (conversationId: string) => {
    if (!confirm("Are you sure you want to delete this conversation?")) return;

    try {
      const token = localStorage.getItem("token");
      if (!token) return;

      await api.delete(`/messages/conversation/${conversationId}`, token);
      fetchConversations();
      if (selectedConversation?._id === conversationId) {
        setSelectedConversation(null);
        setMessages([]);
      }
    } catch (error) {
      console.error("Error deleting conversation:", error);
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setAttachments((prev) => [...prev, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  };

  const getFilteredConversations = () => {
    let filtered = conversations;

    // Apply filter
    switch (filterBy) {
      case "unread":
        filtered = filtered.filter((conv) => conv.unreadCount > 0);
        break;
      case "starred":
        filtered = filtered.filter((conv) => conv.isStarred);
        break;
      case "archived":
        filtered = filtered.filter((conv) => conv.isArchived);
        break;
      default:
        filtered = filtered.filter((conv) => !conv.isArchived);
    }

    // Apply search
    if (searchTerm) {
      filtered = filtered.filter(
        (conv) =>
          conv.participants.some(
            (p) =>
              p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              p.email.toLowerCase().includes(searchTerm.toLowerCase()),
          ) ||
          conv.property?.title
            .toLowerCase()
            .includes(searchTerm.toLowerCase()) ||
          conv.lastMessage.content
            .toLowerCase()
            .includes(searchTerm.toLowerCase()),
      );
    }

    return filtered;
  };

  const getOtherParticipant = (conversation: Conversation) => {
    return conversation.participants.find((p) => p._id !== user?.id);
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = diff / (1000 * 60 * 60);

    if (hours < 24) {
      return date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (hours < 24 * 7) {
      return date.toLocaleDateString([], { weekday: "short" });
    } else {
      return date.toLocaleDateString([], { month: "short", day: "numeric" });
    }
  };

  const getFileIcon = (fileType: string) => {
    if (fileType.startsWith("image/")) return <Image className="h-4 w-4" />;
    return <File className="h-4 w-4" />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <OLXStyleHeader />
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <div className="animate-spin w-8 h-8 border-2 border-[#C70000] border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-gray-600">Loading messages...</p>
          </div>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <OLXStyleHeader />

      <div className="container mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
              <MessageSquare className="h-6 w-6" />
              <span>Messages</span>
            </h1>
            <p className="text-gray-600">Manage your conversations</p>
          </div>
          <Button onClick={fetchConversations} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <div className="lg:col-span-4 flex flex-col">
            <Card className="flex-1 flex flex-col">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-2">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search conversations..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Filter className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent>
                      <DropdownMenuItem onClick={() => setFilterBy("all")}>
                        All Messages
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterBy("unread")}>
                        Unread Only
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterBy("starred")}>
                        Starred
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setFilterBy("archived")}>
                        Archived
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto p-0">
                {getFilteredConversations().length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                    <p className="text-gray-500">No conversations found</p>
                  </div>
                ) : (
                  <div className="divide-y">
                    {getFilteredConversations().map((conversation) => {
                      const otherParticipant =
                        getOtherParticipant(conversation);
                      return (
                        <div
                          key={conversation._id}
                          className={`p-4 cursor-pointer hover:bg-gray-50 transition-colors ${
                            selectedConversation?._id === conversation._id
                              ? "bg-blue-50 border-r-2 border-blue-500"
                              : ""
                          }`}
                          onClick={() => {
                            setSelectedConversation(conversation);
                            fetchMessages(conversation._id);
                          }}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="w-10 h-10 bg-[#C70000] rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-medium text-white">
                                {otherParticipant?.name
                                  ?.charAt(0)
                                  ?.toUpperCase()}
                              </span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="text-sm font-medium text-gray-900 truncate">
                                  {otherParticipant?.name}
                                </h4>
                                <div className="flex items-center space-x-1">
                                  {conversation.isStarred && (
                                    <Star className="h-3 w-3 text-yellow-500 fill-current" />
                                  )}
                                  <span className="text-xs text-gray-500">
                                    {formatTime(conversation.updatedAt)}
                                  </span>
                                </div>
                              </div>

                              {conversation.property && (
                                <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
                                  <Home className="h-3 w-3" />
                                  <span className="truncate">
                                    {conversation.property.title}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center justify-between mt-1">
                                <p className="text-sm text-gray-600 truncate">
                                  {conversation.lastMessage.content}
                                </p>
                                {conversation.unreadCount > 0 && (
                                  <Badge className="bg-[#C70000] text-white text-xs">
                                    {conversation.unreadCount}
                                  </Badge>
                                )}
                              </div>
                            </div>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="p-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    toggleStarConversation(conversation._id);
                                  }}
                                >
                                  <Star className="h-4 w-4 mr-2" />
                                  {conversation.isStarred ? "Unstar" : "Star"}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    archiveConversation(conversation._id);
                                  }}
                                >
                                  <Archive className="h-4 w-4 mr-2" />
                                  Archive
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteConversation(conversation._id);
                                  }}
                                  className="text-red-600"
                                >
                                  <Trash2 className="h-4 w-4 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Chat Area */}
          <div className="lg:col-span-8 flex flex-col">
            {selectedConversation ? (
              <Card className="flex-1 flex flex-col">
                {/* Chat Header */}
                <CardHeader className="border-b">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-[#C70000] rounded-full flex items-center justify-center">
                        <span className="text-sm font-medium text-white">
                          {getOtherParticipant(selectedConversation)
                            ?.name?.charAt(0)
                            ?.toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <h3 className="font-medium text-gray-900">
                          {getOtherParticipant(selectedConversation)?.name}
                        </h3>
                        <p className="text-sm text-gray-500">
                          {getOtherParticipant(selectedConversation)?.userType}
                        </p>
                      </div>
                    </div>

                    {selectedConversation.property && (
                      <Link
                        to={`/property/${selectedConversation.property._id}`}
                      >
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-2" />
                          View Property
                        </Button>
                      </Link>
                    )}
                  </div>

                  {selectedConversation.property && (
                    <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-12 h-12 bg-gray-200 rounded overflow-hidden">
                          {selectedConversation.property.images?.[0] ? (
                            <img
                              src={selectedConversation.property.images[0]}
                              alt="Property"
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Home className="h-6 w-6 text-gray-400" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <h4 className="font-medium text-sm">
                            {selectedConversation.property.title}
                          </h4>
                          <p className="text-sm text-[#C70000] font-bold">
                            ₹
                            {selectedConversation.property.price.toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500">
                            <MapPin className="inline h-3 w-3 mr-1" />
                            {selectedConversation.property.location}
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardHeader>

                {/* Messages */}
                <CardContent className="flex-1 overflow-y-auto p-4 space-y-4">
                  {messages.length === 0 ? (
                    <div className="text-center py-8">
                      <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      <p className="text-gray-500">No messages yet</p>
                      <p className="text-sm text-gray-400">
                        Start the conversation!
                      </p>
                    </div>
                  ) : (
                    messages.map((message) => {
                      const isOwn = message.senderId === user?.id;
                      return (
                        <div
                          key={message._id}
                          className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                        >
                          <div
                            className={`max-w-[70%] rounded-lg p-3 ${
                              isOwn
                                ? "bg-[#C70000] text-white"
                                : "bg-gray-100 text-gray-900"
                            }`}
                          >
                            <p className="text-sm">{message.content}</p>

                            {message.attachments &&
                              message.attachments.length > 0 && (
                                <div className="mt-2 space-y-2">
                                  {message.attachments.map(
                                    (attachment, index) => (
                                      <div
                                        key={index}
                                        className={`flex items-center space-x-2 p-2 rounded ${
                                          isOwn ? "bg-red-800" : "bg-gray-200"
                                        }`}
                                      >
                                        {getFileIcon(attachment.type)}
                                        <span className="text-xs flex-1 truncate">
                                          {attachment.name}
                                        </span>
                                        <Button
                                          size="sm"
                                          variant="ghost"
                                          className="p-1"
                                          onClick={() =>
                                            window.open(
                                              attachment.url,
                                              "_blank",
                                            )
                                          }
                                        >
                                          <Download className="h-3 w-3" />
                                        </Button>
                                      </div>
                                    ),
                                  )}
                                </div>
                              )}

                            <div className="flex items-center justify-between mt-2">
                              <span
                                className={`text-xs ${
                                  isOwn ? "text-red-200" : "text-gray-500"
                                }`}
                              >
                                {formatTime(message.timestamp)}
                              </span>
                              {isOwn && (
                                <div className="flex items-center space-x-1">
                                  {message.isRead ? (
                                    <CheckCircle2 className="h-3 w-3 text-red-200" />
                                  ) : (
                                    <Circle className="h-3 w-3 text-red-200" />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </CardContent>

                {/* Message Input */}
                <div className="border-t p-4">
                  {attachments.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-2">
                      {attachments.map((file, index) => (
                        <div
                          key={index}
                          className="flex items-center space-x-2 bg-gray-100 rounded-lg p-2"
                        >
                          {getFileIcon(file.type)}
                          <span className="text-sm truncate max-w-[100px]">
                            {file.name}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="p-1"
                            onClick={() => removeAttachment(index)}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex items-end space-x-2">
                    <div className="flex-1">
                      <Textarea
                        placeholder="Type your message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        rows={1}
                        className="resize-none"
                        onKeyPress={(e) => {
                          if (e.key === "Enter" && !e.shiftKey) {
                            e.preventDefault();
                            sendMessage();
                          }
                        }}
                      />
                    </div>

                    <div className="flex space-x-1">
                      <input
                        type="file"
                        multiple
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                        accept="image/*,.pdf,.doc,.docx"
                      />
                      <label htmlFor="file-upload">
                        <Button variant="outline" size="sm" asChild>
                          <span>
                            <Paperclip className="h-4 w-4" />
                          </span>
                        </Button>
                      </label>

                      <Button
                        onClick={sendMessage}
                        disabled={
                          sending ||
                          (!newMessage.trim() && attachments.length === 0)
                        }
                        className="bg-[#C70000] hover:bg-[#A60000]"
                      >
                        {sending ? (
                          <RefreshCw className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <MessageSquare className="mx-auto h-16 w-16 text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Select a conversation
                  </h3>
                  <p className="text-gray-500">
                    Choose a conversation from the list to start messaging
                  </p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
}
