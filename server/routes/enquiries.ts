import { RequestHandler } from "express";
import { ObjectId } from "mongodb";
import { getDatabase } from "../db/mongodb";

interface EnquiryData {
  propertyId: string;
  name: string;
  phone: string;
  message: string;
  timestamp: string;
}

interface EnquiryDocument extends EnquiryData {
  _id?: ObjectId;
  createdAt: Date;
  updatedAt: Date;
  status: "new" | "contacted" | "closed";
}

// POST /api/enquiries - Submit a new enquiry
export const submitEnquiry: RequestHandler = async (req, res) => {
  try {
    const { propertyId, name, phone, message, timestamp } =
      req.body as EnquiryData;

    // Validate required fields
    if (!propertyId || !name || !phone || !message) {
      return res.status(400).json({
        success: false,
        message: "Missing required fields: propertyId, name, phone, message",
      });
    }

    // Validate propertyId format
    if (!ObjectId.isValid(propertyId)) {
      return res.status(400).json({
        success: false,
        message: "Invalid property ID format",
      });
    }

    // Validate phone number (basic validation)
    const phoneRegex = /^[+]?[0-9\s\-\(\)]{10,15}$/;
    if (!phoneRegex.test(phone.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid phone number format",
      });
    }

    // Validate name (no empty or only whitespace)
    if (!name.trim() || name.trim().length < 2) {
      return res.status(400).json({
        success: false,
        message: "Name must be at least 2 characters long",
      });
    }

    // Validate message (minimum length)
    if (!message.trim() || message.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Message must be at least 10 characters long",
      });
    }

    const db = await getDatabase();

    // Verify property exists and is active
    const property = await db.collection("properties").findOne({
      _id: new ObjectId(propertyId),
      status: "active",
      approvalStatus: "approved",
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        message: "Property not found or not available",
      });
    }

    // Create enquiry document
    const enquiryDoc: EnquiryDocument = {
      propertyId: propertyId,
      name: name.trim(),
      phone: phone.trim(),
      message: message.trim(),
      timestamp: timestamp || new Date().toISOString(),
      createdAt: new Date(),
      updatedAt: new Date(),
      status: "new",
    };

    // Insert enquiry
    const result = await db.collection("enquiries").insertOne(enquiryDoc);

    if (!result.acknowledged) {
      return res.status(500).json({
        success: false,
        message: "Failed to save enquiry",
      });
    }

    // Update property inquiries count (analytics)
    await db.collection("properties").updateOne(
      { _id: new ObjectId(propertyId) },
      {
        $inc: { inquiries: 1 },
        $set: { updatedAt: new Date() },
      },
    );

    // Log the enquiry for analytics
    await db.collection("analytics").insertOne({
      type: "enquiry",
      propertyId: propertyId,
      enquiryId: result.insertedId,
      userAgent: req.headers["user-agent"],
      ip: req.ip || req.connection.remoteAddress,
      timestamp: new Date(),
      metadata: {
        propertyTitle: property.title,
        propertyType: property.propertyType,
        location: property.location,
      },
    });

    console.log(
      `✅ New enquiry received for property ${propertyId} from ${name} (${phone})`,
    );

    res.status(201).json({
      success: true,
      message: "Enquiry submitted successfully",
      data: {
        enquiryId: result.insertedId,
        propertyId: propertyId,
        propertyTitle: property.title,
        submittedAt: enquiryDoc.createdAt,
      },
    });
  } catch (error) {
    console.error("❌ Error submitting enquiry:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// GET /api/enquiries - Get all enquiries (admin only)
export const getEnquiries: RequestHandler = async (req, res) => {
  try {
    const { page = "1", limit = "20", status, propertyId } = req.query;

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const db = await getDatabase();

    // Build filter
    const filter: any = {};
    if (status && typeof status === "string") {
      filter.status = status;
    }
    if (
      propertyId &&
      typeof propertyId === "string" &&
      ObjectId.isValid(propertyId)
    ) {
      filter.propertyId = propertyId;
    }

    // Get enquiries with property details
    const enquiries = await db
      .collection("enquiries")
      .aggregate([
        { $match: filter },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limitNum },
        {
          $lookup: {
            from: "properties",
            localField: "propertyId",
            foreignField: "_id",
            as: "property",
            pipeline: [
              {
                $project: {
                  title: 1,
                  propertyType: 1,
                  location: 1,
                  price: 1,
                  images: { $arrayElemAt: ["$images", 0] },
                },
              },
            ],
          },
        },
        {
          $unwind: {
            path: "$property",
            preserveNullAndEmptyArrays: true,
          },
        },
      ])
      .toArray();

    // Get total count
    const total = await db.collection("enquiries").countDocuments(filter);

    res.json({
      success: true,
      data: enquiries,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error("❌ Error fetching enquiries:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};

// PUT /api/enquiries/:id/status - Update enquiry status
export const updateEnquiryStatus: RequestHandler = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid enquiry ID",
      });
    }

    if (!["new", "contacted", "closed"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Invalid status. Must be 'new', 'contacted', or 'closed'",
      });
    }

    const db = await getDatabase();

    const result = await db.collection("enquiries").updateOne(
      { _id: new ObjectId(id) },
      {
        $set: {
          status,
          updatedAt: new Date(),
        },
      },
    );

    if (result.matchedCount === 0) {
      return res.status(404).json({
        success: false,
        message: "Enquiry not found",
      });
    }

    res.json({
      success: true,
      message: "Enquiry status updated successfully",
    });
  } catch (error) {
    console.error("❌ Error updating enquiry status:", error);
    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
