import { RequestHandler } from "express";
import { getDatabase } from "../db/mongodb";
import { Property, SearchFilters, ApiResponse } from "@shared/types";
import { ObjectId } from "mongodb";
import multer from "multer";
import path from "path";
import fs from "fs";

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(process.cwd(), "uploads", "properties");
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      file.fieldname + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

// Get all properties with optional filtering
export const getProperties: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const {
      propertyType,
      subCategory,
      priceType,
      sector,
      mohalla,
      landmark,
      minPrice,
      maxPrice,
      bedrooms,
      bathrooms,
      minArea,
      maxArea,
      sortBy = "date_desc",
      page = "1",
      limit = "20",
    } = req.query;

    // Build filter object - only show approved properties on public listing
    const filter: any = { status: "active", approvalStatus: "approved" };

    if (propertyType) filter.propertyType = propertyType;
    if (subCategory) filter.subCategory = subCategory;
    if (priceType) filter.priceType = priceType;
    if (sector) filter["location.sector"] = sector;
    if (mohalla) filter["location.mohalla"] = mohalla;
    if (landmark) filter["location.landmark"] = landmark;
    if (bedrooms)
      filter["specifications.bedrooms"] = parseInt(bedrooms as string);
    if (bathrooms)
      filter["specifications.bathrooms"] = parseInt(bathrooms as string);

    // Price range filter
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = parseInt(minPrice as string);
      if (maxPrice) filter.price.$lte = parseInt(maxPrice as string);
    }

    // Area range filter
    if (minArea || maxArea) {
      filter["specifications.area"] = {};
      if (minArea)
        filter["specifications.area"].$gte = parseInt(minArea as string);
      if (maxArea)
        filter["specifications.area"].$lte = parseInt(maxArea as string);
    }

    // Build sort object
    let sort: any = {};
    switch (sortBy) {
      case "price_asc":
        sort.price = 1;
        break;
      case "price_desc":
        sort.price = -1;
        break;
      case "area_desc":
        sort["specifications.area"] = -1;
        break;
      case "date_asc":
        sort.createdAt = 1;
        break;
      default:
        sort.createdAt = -1;
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const properties = await db
      .collection("properties")
      .find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum)
      .toArray();

    const total = await db.collection("properties").countDocuments(filter);

    const response: ApiResponse<{
      properties: Property[];
      pagination: {
        page: number;
        limit: number;
        total: number;
        pages: number;
      };
    }> = {
      success: true,
      data: {
        properties: properties as unknown as Property[],
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
    console.error("Error fetching properties:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch properties",
    });
  }
};

// Get property by ID
export const getPropertyById: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid property ID",
      });
    }

    const property = await db
      .collection("properties")
      .findOne({ _id: new ObjectId(id) });

    if (!property) {
      return res.status(404).json({
        success: false,
        error: "Property not found",
      });
    }

    // Increment view count
    await db
      .collection("properties")
      .updateOne({ _id: new ObjectId(id) }, { $inc: { views: 1 } });

    const response: ApiResponse<Property> = {
      success: true,
      data: property as unknown as Property,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching property:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch property",
    });
  }
};

// Create new property
export const createProperty: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    // Handle image uploads
    const images: string[] = [];
    if (req.files && Array.isArray(req.files)) {
      req.files.forEach((file: any) => {
        images.push(`/uploads/properties/${file.filename}`);
      });
    }

    // Parse JSON fields
    const location =
      typeof req.body.location === "string"
        ? JSON.parse(req.body.location)
        : req.body.location;

    const specifications =
      typeof req.body.specifications === "string"
        ? JSON.parse(req.body.specifications)
        : req.body.specifications;

    const amenities =
      typeof req.body.amenities === "string"
        ? JSON.parse(req.body.amenities)
        : req.body.amenities;

    const contactInfo =
      typeof req.body.contactInfo === "string"
        ? JSON.parse(req.body.contactInfo)
        : req.body.contactInfo;

    // Check if this is a premium listing
    const isPremium = req.body.premium === "true";
    const contactVisible = req.body.contactVisible === "true";

    const propertyData: Omit<Property, "_id"> = {
      title: req.body.title,
      description: req.body.description,
      price: parseInt(req.body.price),
      priceType: req.body.priceType,
      propertyType: req.body.propertyType,
      subCategory: req.body.subCategory,
      location,
      specifications: {
        ...specifications,
        bedrooms: specifications.bedrooms
          ? parseInt(specifications.bedrooms)
          : undefined,
        bathrooms: specifications.bathrooms
          ? parseInt(specifications.bathrooms)
          : undefined,
        area: parseInt(specifications.area),
        floor: specifications.floor
          ? parseInt(specifications.floor)
          : undefined,
        totalFloors: specifications.totalFloors
          ? parseInt(specifications.totalFloors)
          : undefined,
        parking: specifications.parking === "yes",
      },
      images,
      amenities: amenities || [],
      ownerId: userId,
      ownerType: (req as any).userType || "seller",
      contactInfo,
      status: "active",
      approvalStatus: "pending",
      featured: false,
      premium: isPremium,
      premiumApprovalStatus: isPremium ? "pending" : undefined,
      contactVisible: contactVisible,
      views: 0,
      inquiries: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("properties").insertOne(propertyData);

    const response: ApiResponse<{ _id: string }> = {
      success: true,
      data: { _id: result.insertedId.toString() },
      message: "Property created successfully",
    };

    res.status(201).json(response);
  } catch (error) {
    console.error("Error creating property:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create property",
    });
  }
};

// Get featured properties
export const getFeaturedProperties: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();

    const properties = await db
      .collection("properties")
      .find({ status: "active", featured: true, approvalStatus: "approved" })
      .sort({ createdAt: -1 })
      .limit(10)
      .toArray();

    const response: ApiResponse<Property[]> = {
      success: true,
      data: properties as unknown as Property[],
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching featured properties:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch featured properties",
    });
  }
};

// Get user's properties (for user dashboard)
export const getUserProperties: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const userId = (req as any).userId; // From auth middleware

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "User not authenticated",
      });
    }

    const properties = await db
      .collection("properties")
      .find({ ownerId: userId })
      .sort({ createdAt: -1 })
      .toArray();

    const response: ApiResponse<Property[]> = {
      success: true,
      data: properties as unknown as Property[],
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching user properties:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch user properties",
    });
  }
};

// Get user's notifications
export const getUserNotifications: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).userId;
    const db = getDatabase();

    const notifications = await db
      .collection("user_notifications")
      .find({ userId: new ObjectId(userId) })
      .sort({ createdAt: -1 })
      .toArray();

    res.json({
      success: true,
      data: notifications,
    });
  } catch (error) {
    console.error("Error fetching user notifications:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch notifications",
    });
  }
};

// Mark user notification as read
export const markUserNotificationAsRead: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { notificationId } = req.params;
    const db = getDatabase();

    if (!ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid notification ID",
      });
    }

    await db
      .collection("user_notifications")
      .updateOne(
        {
          _id: new ObjectId(notificationId),
          userId: new ObjectId(userId)
        },
        {
          $set: {
            isRead: true,
            readAt: new Date()
          }
        }
      );

    res.json({
      success: true,
      message: "Notification marked as read",
    });
  } catch (error) {
    console.error("Error marking notification as read:", error);
    res.status(500).json({
      success: false,
      error: "Failed to mark notification as read",
    });
  }
};

// Delete user notification
export const deleteUserNotification: RequestHandler = async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { notificationId } = req.params;
    const db = getDatabase();

    if (!ObjectId.isValid(notificationId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid notification ID",
      });
    }

    await db
      .collection("user_notifications")
      .deleteOne({
        _id: new ObjectId(notificationId),
        userId: new ObjectId(userId)
      });

    res.json({
      success: true,
      message: "Notification deleted",
    });
  } catch (error) {
    console.error("Error deleting notification:", error);
    res.status(500).json({
      success: false,
      error: "Failed to delete notification",
    });
  }
};

// Get pending properties (for admin approval)
export const getPendingProperties: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();

    const properties = await db
      .collection("properties")
      .find({ approvalStatus: "pending" })
      .sort({ createdAt: -1 })
      .toArray();

    const response: ApiResponse<Property[]> = {
      success: true,
      data: properties as unknown as Property[],
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching pending properties:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch pending properties",
    });
  }
};

// Approve or reject property (admin only)
export const updatePropertyApproval: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { approvalStatus, adminComments, rejectionReason } = req.body;
    const adminId = (req as any).userId; // From auth middleware

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        error: "Invalid property ID",
      });
    }

    if (!["approved", "rejected"].includes(approvalStatus)) {
      return res.status(400).json({
        success: false,
        error: "Invalid approval status",
      });
    }

    const updateData: any = {
      approvalStatus,
      updatedAt: new Date(),
    };

    if (approvalStatus === "approved") {
      updateData.approvedAt = new Date();
      updateData.approvedBy = adminId;
    }

    if (adminComments) {
      updateData.adminComments = adminComments;
    }

    if (rejectionReason && approvalStatus === "rejected") {
      updateData.rejectionReason = rejectionReason;
    }

    const result = await db
      .collection("properties")
      .updateOne({ _id: new ObjectId(id) }, { $set: updateData });

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Property not found",
      });
    }

    const response: ApiResponse<{ message: string }> = {
      success: true,
      data: { message: `Property ${approvalStatus} successfully` },
    };

    res.json(response);
  } catch (error) {
    console.error("Error updating property approval:", error);
    res.status(500).json({
      success: false,
      error: "Failed to update property approval",
    });
  }
};
