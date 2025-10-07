import { RequestHandler } from "express";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export interface AuthenticatedRequest extends Request {
  userId?: string;
  userType?: string;
  email?: string;
  role?: string;
}

export const authenticateToken: RequestHandler = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Access token required",
    });
  }

  jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
    if (err) {
      return res.status(403).json({
        success: false,
        error: "Invalid or expired token",
      });
    }

    (req as any).userId = decoded.userId;
    (req as any).userType = decoded.userType;
    (req as any).email = decoded.email;
    (req as any).role = decoded.role;
    next();
  });
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  const userType = (req as any).userType;
  const role = (req as any).role;

  console.log("🔐 Admin middleware check:", { userType, role, userId: (req as any).userId });

  // Allow admin userType or staff userType with any role
  if (userType !== "admin" && userType !== "staff") {
    console.log("❌ Access denied - not admin or staff");
    return res.status(403).json({
      success: false,
      error: "Admin access required",
    });
  }

  console.log("✅ Admin access granted");
  next();
};

export const requireSellerOrAgent: RequestHandler = (req, res, next) => {
  const userType = (req as any).userType;

  if (!["seller", "agent", "admin"].includes(userType)) {
    return res.status(403).json({
      success: false,
      error: "Seller or agent access required",
    });
  }

  next();
};

// Role-based permission checking
export const requirePermission = (permission: string): RequestHandler => {
  return (req, res, next) => {
    const userType = (req as any).userType;
    const role = (req as any).role;

    // Admin always has all permissions
    if (userType === "admin") {
      return next();
    }

    // Staff members need to have specific permissions based on their role
    if (userType === "staff") {
      const rolePermissions: Record<string, string[]> = {
        super_admin: ["*"], // Super admin has all permissions
        content_manager: [
          "content.view", "content.create", "content.manage", "blog.manage", "blog.view"
        ],
        sales_manager: [
          "users.view", "sellers.manage", "sellers.verify", "sellers.view",
          "payments.view", "packages.manage", "ads.view", "analytics.view"
        ],
        support_executive: [
          "users.view", "support.view", "reports.view", "content.view"
        ],
        admin: [
          "content.view", "users.view", "ads.view", "analytics.view"
        ]
      };

      const userPermissions = rolePermissions[role] || [];

      // Check if user has the required permission or super admin access
      if (userPermissions.includes("*") || userPermissions.includes(permission)) {
        return next();
      }
    }

    return res.status(403).json({
      success: false,
      error: `Permission required: ${permission}`,
    });
  };
};
