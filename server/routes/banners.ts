import { RequestHandler } from "express";
import { getDatabase } from "../db/mongodb";
import { BannerAd, ApiResponse } from "@shared/types";
import { ObjectId } from "mongodb";
import multer from "multer";

// Configure multer for image upload with 2MB limit
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Public route: GET /api/banners?active=true (sorted by sortOrder)
export const getActiveBanners: RequestHandler = async (req, res) => {
  try {
    let db;
    try {
      db = getDatabase();
    } catch (dbError) {
      console.log("⚠️ Database not ready, returning empty banners array");
      return res.json({
        success: true,
        data: [],
      });
    }

    const { active } = req.query;

    // Build filter
    const filter: any = {};
    if (active === "true" || active === "1") {
      filter.isActive = true;
    }

    const banners = await db
      .collection("banners")
      .find(filter)
      .sort({ sortOrder: 1, createdAt: -1 }) // Sort by sortOrder ascending, then by creation date
      .toArray();

    const response: ApiResponse<BannerAd[]> = {
      success: true,
      data: banners as BannerAd[],
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching banners:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch banners",
    });
  }
};

// Admin route: GET /api/admin/banners?search=&page=&limit=
export const getAllBanners: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { search = "", page = "1", limit = "10" } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Build search filter
    const filter: any = {};
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: "i" } },
        { link: { $regex: search, $options: "i" } },
      ];
    }

    const [banners, total] = await Promise.all([
      db
        .collection("banners")
        .find(filter)
        .sort({ sortOrder: 1, createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .toArray(),
      db.collection("banners").countDocuments(filter),
    ]);

    const response: ApiResponse<{
      banners: BannerAd[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }> = {
      success: true,
      data: {
        banners: banners as BannerAd[],
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching banners:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch banners",
    });
  }
};

// Admin route: POST /api/admin/banners
export const createBanner: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { title, imageUrl, link, isActive, sortOrder } = req.body;

    // Validate required fields
    if (
      !title ||
      !imageUrl ||
      !link ||
      typeof isActive !== "boolean" ||
      typeof sortOrder !== "number"
    ) {
      return res.status(400).json({
        success: false,
        error:
          "Missing or invalid required fields: title, imageUrl, link, isActive, sortOrder",
      });
    }

    const bannerData: Omit<BannerAd, "_id"> = {
      title: title.trim(),
      imageUrl: imageUrl.trim(),
      link: link.trim(),
      isActive,
      sortOrder,
      createdAt: new Date(),
    };

    const result = await db.collection("banners").insertOne(bannerData);

    const response: ApiResponse<{ _id: string; banner: BannerAd }> = {
      success: true,
      data: {
        _id: result.insertedId.toString(),
        banner: {
          ...bannerData,
          _id: result.insertedId.toString(),
        } as BannerAd,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error creating banner:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create banner",
    });
  }
};

// Admin route: PUT /api/admin/banners/:id
export const updateBanner: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { title, imageUrl, link, isActive, sortOrder } = req.body;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid banner ID",
      });
    }

    // Build update object with only provided fields
    const updateData: any = {};
    if (title !== undefined) updateData.title = title.trim();
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl.trim();
    if (link !== undefined) updateData.link = link.trim();
    if (isActive !== undefined) updateData.isActive = isActive;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const result = await db
      .collection("banners")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Banner not found",
      });
    }

    // Get updated banner
    const updatedBanner = await db
      .collection("banners")
      .findOne({ _id: new ObjectId(id) });

    const response: ApiResponse<{ banner: BannerAd }> = {
      success: true,
      data: { banner: updatedBanner as BannerAd },
    };

    res.json(response);
  } catch (error) {
    console.error("Error updating banner:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update banner",
    });
  }
};

// Admin route: DELETE /api/admin/banners/:id
export const deleteBanner: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    // Validate ObjectId
    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid banner ID",
      });
    }

    const result = await db
      .collection("banners")
      .deleteOne({ _id: new ObjectId(id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Banner not found",
      });
    }

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: "Banner deleted successfully" },
    };

    res.json(response);
  } catch (error) {
    console.error("Error deleting banner:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete banner",
    });
  }
};

// Upload middleware for image uploads
export const uploadBannerImage = upload.single("image");

// Image upload handler
export const handleImageUpload: RequestHandler = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: "No image file provided",
      });
    }

    // In a real implementation, you would upload to cloud storage (AWS S3, Cloudinary, etc.)
    // For now, we'll simulate this with a placeholder URL
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 9);
    const extension = req.file.originalname.split(".").pop();
    const imageUrl = `/uploads/banners/${timestamp}-${random}.${extension}`;

    const response: ApiResponse<{ imageUrl: string }> = {
      success: true,
      data: { imageUrl },
    };

    res.json(response);
  } catch (error) {
    console.error("Error uploading image:", error);
    res.status(500).json({
      success: false,
      error: "Failed to upload image",
    });
  }
};

// Initialize default banners (for setup)
export const initializeBanners: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { force } = req.query;

    // Check if banners already exist
    const existingCount = await db.collection("banners").countDocuments();
    if (existingCount > 0 && force !== "true") {
      return res.json({
        success: true,
        message: "Banners already initialized",
        existingCount,
        hint: "Use ?force=true to clear and reinitialize",
      });
    }

    // If force=true, clear existing banners first
    if (force === "true" && existingCount > 0) {
      console.log("🧹 Force mode: Clearing existing banners...");
      await db.collection("banners").deleteMany({});
      console.log(`✅ Cleared ${existingCount} existing banners`);
    }

    const defaultBanners: Omit<BannerAd, "_id">[] = [
      {
        title: "Welcome to Aashish Property",
        imageUrl:
          "https://images.unsplash.com/photo-1560518883-ce09059eeffa?w=1200&h=400&fit=crop",
        link: "/properties",
        isActive: true,
        sortOrder: 1,
        createdAt: new Date(),
      },
      {
        title: "Find Your Dream Home",
        imageUrl:
          "https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=1200&h=400&fit=crop",
        link: "/buy",
        isActive: true,
        sortOrder: 2,
        createdAt: new Date(),
      },
      {
        title: "Premium Properties in Rohtak",
        imageUrl:
          "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=1200&h=400&fit=crop",
        link: "/premium",
        isActive: true,
        sortOrder: 3,
        createdAt: new Date(),
      },
    ];

    await db.collection("banners").insertMany(defaultBanners);

    res.json({
      success: true,
      message: "Default banners initialized successfully",
    });
  } catch (error) {
    console.error("Error initializing banners:", error);
    res.status(500).json({
      success: false,
      error: "Failed to initialize banners",
    });
  }
};
