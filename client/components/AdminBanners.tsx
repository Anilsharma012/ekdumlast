import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Switch } from "./ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Plus,
  Edit2,
  Trash2,
  Save,
  X,
  Upload,
  Search,
  Image as ImageIcon,
  Link,
  ArrowUpDown,
} from "lucide-react";
import { BannerAd } from "@shared/types";
import { useToast } from "./ui/use-toast";

interface AdminBannersProps {
  token: string;
}

export default function AdminBanners({ token }: AdminBannersProps) {
  const [banners, setBanners] = useState<BannerAd[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerAd | null>(null);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    title: "",
    imageUrl: "",
    link: "",
    isActive: true,
    sortOrder: 1,
  });

  useEffect(() => {
    fetchBanners();
  }, [search, currentPage]);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: "10",
        ...(search && { search }),
      });

      const response = await fetch(`/api/admin/banners?${params}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();

      if (data.success) {
        setBanners(data.data.banners);
        setTotalPages(data.data.pagination.pages);
        setTotal(data.data.pagination.total);
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to fetch banners",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error fetching banners:", error);
      toast({
        title: "Error",
        description: "Failed to fetch banners",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleImageUpload = async (file: File) => {
    if (file.size > 2 * 1024 * 1024) {
      toast({
        title: "Error",
        description: "Image size must be less than 2MB",
        variant: "destructive",
      });
      return;
    }

    try {
      setUploading(true);
      const uploadFormData = new FormData();
      uploadFormData.append("image", file);

      const response = await fetch("/api/admin/banners/upload", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: uploadFormData,
      });

      const data = await response.json();

      if (data.success) {
        handleInputChange("imageUrl", data.data.imageUrl);
        toast({
          title: "Success",
          description: "Image uploaded successfully",
        });
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to upload image",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast({
        title: "Error",
        description: "Failed to upload image",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (
      !formData.title.trim() ||
      !formData.imageUrl.trim() ||
      !formData.link.trim()
    ) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const isEditing = !!editingBanner;
      const url = isEditing
        ? `/api/admin/banners/${editingBanner._id}`
        : "/api/admin/banners";

      const method = isEditing ? "PUT" : "POST";

      // Optimistic update for editing
      if (isEditing) {
        const updatedBanner = { ...editingBanner, ...formData };
        setBanners((prev) =>
          prev.map((b) => (b._id === editingBanner._id ? updatedBanner : b)),
        );
      }

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: `Banner ${isEditing ? "updated" : "created"} successfully`,
        });
        fetchBanners(); // Refresh to get accurate data
        resetForm();
        setShowDialog(false);
      } else {
        // Revert optimistic update on error
        if (isEditing) {
          setBanners((prev) =>
            prev.map((b) => (b._id === editingBanner._id ? editingBanner : b)),
          );
        }
        toast({
          title: "Error",
          description:
            data.error || `Failed to ${isEditing ? "update" : "create"} banner`,
          variant: "destructive",
        });
      }
    } catch (error) {
      // Revert optimistic update on error
      if (editingBanner) {
        setBanners((prev) =>
          prev.map((b) => (b._id === editingBanner._id ? editingBanner : b)),
        );
      }
      console.error("Error saving banner:", error);
      toast({
        title: "Error",
        description: `Failed to ${editingBanner ? "update" : "create"} banner`,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (bannerId: string) => {
    if (!confirm("Are you sure you want to delete this banner?")) {
      return;
    }

    try {
      // Optimistic update
      const bannerToDelete = banners.find((b) => b._id === bannerId);
      setBanners((prev) => prev.filter((b) => b._id !== bannerId));

      const response = await fetch(`/api/admin/banners/${bannerId}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: "Banner deleted successfully",
        });
        fetchBanners(); // Refresh pagination counts
      } else {
        // Revert optimistic update on error
        if (bannerToDelete) {
          setBanners((prev) => [...prev, bannerToDelete]);
        }
        toast({
          title: "Error",
          description: data.error || "Failed to delete banner",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Revert optimistic update on error
      fetchBanners();
      console.error("Error deleting banner:", error);
      toast({
        title: "Error",
        description: "Failed to delete banner",
        variant: "destructive",
      });
    }
  };

  const handleToggleActive = async (banner: BannerAd) => {
    try {
      // Optimistic update
      const updatedBanner = { ...banner, isActive: !banner.isActive };
      setBanners((prev) =>
        prev.map((b) => (b._id === banner._id ? updatedBanner : b)),
      );

      const response = await fetch(`/api/admin/banners/${banner._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isActive: !banner.isActive }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: "Success",
          description: `Banner ${!banner.isActive ? "activated" : "deactivated"}`,
        });
      } else {
        // Revert optimistic update on error
        setBanners((prev) =>
          prev.map((b) => (b._id === banner._id ? banner : b)),
        );
        toast({
          title: "Error",
          description: data.error || "Failed to update banner",
          variant: "destructive",
        });
      }
    } catch (error) {
      // Revert optimistic update on error
      setBanners((prev) =>
        prev.map((b) => (b._id === banner._id ? banner : b)),
      );
      console.error("Error toggling banner:", error);
      toast({
        title: "Error",
        description: "Failed to update banner",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (banner: BannerAd) => {
    setFormData({
      title: banner.title,
      imageUrl: banner.imageUrl,
      link: banner.link,
      isActive: banner.isActive,
      sortOrder: banner.sortOrder,
    });
    setEditingBanner(banner);
    setShowDialog(true);
  };

  const resetForm = () => {
    setFormData({
      title: "",
      imageUrl: "",
      link: "",
      isActive: true,
      sortOrder: 1,
    });
    setEditingBanner(null);
  };

  if (loading && banners.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#C70000] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading banners...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Banner Management</h1>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button
              onClick={resetForm}
              className="bg-[#C70000] hover:bg-[#A60000] text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Banner
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingBanner ? "Edit Banner" : "Add New Banner"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Title *
                </label>
                <Input
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  placeholder="Enter banner title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Image *
                </label>
                <div className="space-y-2">
                  <div className="flex space-x-2">
                    <Input
                      value={formData.imageUrl}
                      onChange={(e) =>
                        handleInputChange("imageUrl", e.target.value)
                      }
                      placeholder="Enter image URL or upload image"
                      required
                    />
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleImageUpload(file);
                      }}
                      className="hidden"
                      id="image-upload"
                    />
                    <label
                      htmlFor="image-upload"
                      className="px-3 py-2 border border-gray-300 rounded-md cursor-pointer hover:bg-gray-50 flex items-center"
                    >
                      <Upload className="h-4 w-4" />
                    </label>
                  </div>
                  <p className="text-xs text-gray-500">Max file size: 2MB</p>
                  {formData.imageUrl && (
                    <div className="w-full h-32 bg-gray-100 rounded-lg overflow-hidden">
                      <img
                        src={formData.imageUrl}
                        alt="Banner preview"
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            "/placeholder.svg";
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Link URL *
                </label>
                <Input
                  value={formData.link}
                  onChange={(e) => handleInputChange("link", e.target.value)}
                  placeholder="https://example.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">
                  Sort Order
                </label>
                <Input
                  type="number"
                  min="1"
                  value={formData.sortOrder}
                  onChange={(e) =>
                    handleInputChange(
                      "sortOrder",
                      parseInt(e.target.value) || 1,
                    )
                  }
                  placeholder="1"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Lower numbers appear first
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    handleInputChange("isActive", checked)
                  }
                />
                <label className="text-sm font-medium">Active</label>
              </div>

              <div className="flex space-x-2 pt-4">
                <Button
                  onClick={handleSubmit}
                  className="bg-[#C70000] hover:bg-[#A60000] text-white"
                  disabled={uploading}
                >
                  <Save className="h-4 w-4 mr-2" />
                  {editingBanner ? "Update Banner" : "Create Banner"}
                </Button>
                <Button
                  onClick={() => {
                    setShowDialog(false);
                    resetForm();
                  }}
                  variant="outline"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Search */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search banners..."
            className="pl-10"
          />
        </div>
        <div className="text-sm text-gray-500">
          {total} banner{total !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Banners Table */}
      <div className="bg-white rounded-lg shadow border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-20">Image</TableHead>
              <TableHead>Title</TableHead>
              <TableHead>Link</TableHead>
              <TableHead className="w-24">
                <div className="flex items-center">
                  <ArrowUpDown className="h-4 w-4 mr-1" />
                  Order
                </div>
              </TableHead>
              <TableHead className="w-20">Status</TableHead>
              <TableHead className="w-32">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {banners.map((banner) => (
              <TableRow key={banner._id}>
                <TableCell>
                  <div className="w-16 h-10 bg-gray-100 rounded overflow-hidden">
                    <img
                      src={banner.imageUrl}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = "/placeholder.svg";
                      }}
                    />
                  </div>
                </TableCell>
                <TableCell className="font-medium">{banner.title}</TableCell>
                <TableCell>
                  <a
                    href={banner.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800 flex items-center"
                  >
                    <Link className="h-3 w-3 mr-1" />
                    <span className="truncate max-w-32">{banner.link}</span>
                  </a>
                </TableCell>
                <TableCell>{banner.sortOrder}</TableCell>
                <TableCell>
                  <Switch
                    checked={banner.isActive}
                    onCheckedChange={() => handleToggleActive(banner)}
                    size="sm"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex space-x-1">
                    <Button
                      onClick={() => handleEdit(banner)}
                      variant="outline"
                      size="sm"
                    >
                      <Edit2 className="h-3 w-3" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(banner._id!)}
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {banners.length === 0 && !loading && (
          <div className="text-center py-12">
            <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No Banners Found
            </h3>
            <p className="text-gray-600 mb-4">
              {search
                ? "No banners match your search"
                : "Create your first banner to get started"}
            </p>
            <Button
              onClick={() => {
                resetForm();
                setShowDialog(true);
              }}
              className="bg-[#C70000] hover:bg-[#A60000] text-white"
            >
              Create Banner
            </Button>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Page {currentPage} of {totalPages}
          </div>
          <div className="flex space-x-2">
            <Button
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              variant="outline"
              size="sm"
            >
              Previous
            </Button>
            <Button
              onClick={() =>
                setCurrentPage((prev) => Math.min(totalPages, prev + 1))
              }
              disabled={currentPage === totalPages}
              variant="outline"
              size="sm"
            >
              Next
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
