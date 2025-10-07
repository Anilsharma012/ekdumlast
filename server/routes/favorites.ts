import { RequestHandler } from "express";
import { getDatabase } from "../db/mongodb";
import { ObjectId } from "mongodb";

// Get user's favorites
export const getFavorites: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const userId = (req as any).userId;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    // Get user's favorites with property details
    const favorites = await db
      .collection("favorites")
      .aggregate([
        {
          $match: {
            userId: userId,
          },
        },
        {
          $lookup: {
            from: "properties",
            localField: "propertyId",
            foreignField: "_id",
            as: "property",
          },
        },
        {
          $unwind: "$property",
        },
        {
          $match: {
            "property.status": "active",
            "property.approvalStatus": "approved",
          },
        },
        {
          $sort: { createdAt: -1 },
        },
      ])
      .toArray();

    res.json({
      success: true,
      data: favorites.map((fav) => ({
        _id: fav._id,
        propertyId: fav.propertyId,
        addedAt: fav.createdAt,
        property: fav.property,
      })),
    });
  } catch (error) {
    console.error("Error fetching favorites:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch favorites",
    });
  }
};

// Add property to favorites
export const addToFavorites: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const userId = (req as any).userId;
    const { propertyId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    if (!ObjectId.isValid(propertyId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid property ID",
      });
    }

    // Check if property exists and is active
    const property = await db.collection("properties").findOne({
      _id: new ObjectId(propertyId),
      status: "active",
      approvalStatus: "approved",
    });

    if (!property) {
      return res.status(404).json({
        success: false,
        error: "Property not found",
      });
    }

    // Check if already in favorites
    const existing = await db.collection("favorites").findOne({
      userId: userId,
      propertyId: new ObjectId(propertyId),
    });

    if (existing) {
      return res.status(400).json({
        success: false,
        error: "Property already in favorites",
      });
    }

    // Add to favorites
    const result = await db.collection("favorites").insertOne({
      userId: userId,
      propertyId: new ObjectId(propertyId),
      createdAt: new Date(),
    });

    res.status(201).json({
      success: true,
      data: {
        _id: result.insertedId,
        propertyId: propertyId,
        message: "Property added to favorites",
      },
    });
  } catch (error) {
    console.error("Error adding to favorites:", error);
    res.status(500).json({
      success: false,
      error: "Failed to add to favorites",
    });
  }
};

// Remove property from favorites
export const removeFromFavorites: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const userId = (req as any).userId;
    const { propertyId } = req.params;

    if (!userId) {
      return res.status(401).json({
        success: false,
        error: "Authentication required",
      });
    }

    if (!ObjectId.isValid(propertyId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid property ID",
      });
    }

    // Remove from favorites
    const result = await db.collection("favorites").deleteOne({
      userId: userId,
      propertyId: new ObjectId(propertyId),
    });

    if (result.deletedCount === 0) {
      return res.status(404).json({
        success: false,
        error: "Property not found in favorites",
      });
    }

    res.json({
      success: true,
      message: "Property removed from favorites",
    });
  } catch (error) {
    console.error("Error removing from favorites:", error);
    res.status(500).json({
      success: false,
      error: "Failed to remove from favorites",
    });
  }
};

// Check if property is in favorites
export const checkFavorite: RequestHandler = async (req, res) => {
  try {
    const db = getDatabase();
    const userId = (req as any).userId;
    const { propertyId } = req.params;

    if (!userId) {
      return res.json({
        success: true,
        data: { isFavorite: false },
      });
    }

    if (!ObjectId.isValid(propertyId)) {
      return res.status(400).json({
        success: false,
        error: "Invalid property ID",
      });
    }

    // Check if in favorites
    const favorite = await db.collection("favorites").findOne({
      userId: userId,
      propertyId: new ObjectId(propertyId),
    });

    res.json({
      success: true,
      data: { isFavorite: !!favorite },
    });
  } catch (error) {
    console.error("Error checking favorite:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check favorite status",
    });
  }
};
