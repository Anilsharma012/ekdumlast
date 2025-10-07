import { RequestHandler } from "express";
import { getDatabase } from "../db/mongodb";
import { ApiResponse } from "@shared/types";
import crypto from "crypto";

interface PhonePeConfig {
  enabled: boolean;
  merchantId: string;
  saltKey: string;
  saltIndex: string;
  testMode: boolean;
}

// Get PhonePe configuration
const getPhonePeConfig = async (): Promise<PhonePeConfig | null> => {
  try {
    const db = getDatabase();
    const settings = await db.collection("admin_settings").findOne({});

    console.log("📋 PhonePe config check:", {
      hasSettings: !!settings,
      hasPayment: !!settings?.payment,
      hasPhonePe: !!settings?.payment?.phonePe,
      enabled: settings?.payment?.phonePe?.enabled,
    });

    if (
      settings &&
      settings.payment &&
      settings.payment.phonePe &&
      settings.payment.phonePe.enabled
    ) {
      const config = settings.payment.phonePe as PhonePeConfig;

      // Validate required fields
      if (!config.merchantId || !config.saltKey || !config.saltIndex) {
        console.error("❌ PhonePe configuration incomplete:", {
          hasMerchantId: !!config.merchantId,
          hasSaltKey: !!config.saltKey,
          hasSaltIndex: !!config.saltIndex,
        });
        return null;
      }

      console.log("✅ PhonePe config validated successfully");
      return config;
    }

    console.log("❌ PhonePe not enabled or configured");
    return null;
  } catch (error) {
    console.error("Error getting PhonePe config:", error);
    return null;
  }
};

// Generate checksum for PhonePe API
const generateChecksum = (
  payload: string,
  endpoint: string,
  saltKey: string,
  saltIndex: string,
): string => {
  const data = payload + endpoint + saltKey;
  const hash = crypto.createHash("sha256").update(data).digest("hex");
  return hash + "###" + saltIndex;
};

// Verify checksum from PhonePe callback
const verifyChecksum = (
  response: string,
  xVerify: string,
  saltKey: string,
): boolean => {
  try {
    const [hash, saltIndex] = xVerify.split("###");
    const data = response + saltKey;
    const calculatedHash = crypto
      .createHash("sha256")
      .update(data)
      .digest("hex");
    return calculatedHash === hash;
  } catch (error) {
    console.error("Error verifying checksum:", error);
    return false;
  }
};

// PhonePe payment callback handler
export const phonePeCallback: RequestHandler = async (req, res) => {
  try {
    console.log("PhonePe callback received:", req.body);

    const config = await getPhonePeConfig();
    if (!config) {
      console.error("PhonePe configuration not found");
      return res.status(400).json({
        success: false,
        error: "PhonePe not configured",
      });
    }

    const { response } = req.body;
    const xVerify = req.headers["x-verify"] as string;

    if (!response || !xVerify) {
      console.error("Missing response or x-verify header");
      return res.status(400).json({
        success: false,
        error: "Invalid callback data",
      });
    }

    // Verify the checksum
    if (!verifyChecksum(response, xVerify, config.saltKey)) {
      console.error("Checksum verification failed");
      return res.status(400).json({
        success: false,
        error: "Invalid checksum",
      });
    }

    // Decode the response
    const decodedResponse = JSON.parse(
      Buffer.from(response, "base64").toString(),
    );
    console.log("Decoded PhonePe response:", decodedResponse);

    const db = getDatabase();
    const { merchantTransactionId, transactionId, amount, state } =
      decodedResponse.data;

    // Update transaction status in database
    await db.collection("transactions").updateOne(
      { phonepeTransactionId: merchantTransactionId },
      {
        $set: {
          status: state === "COMPLETED" ? "paid" : "failed",
          phonepeTransactionId: transactionId,
          phonepeResponse: decodedResponse,
          updatedAt: new Date(),
        },
      },
    );

    // If payment successful, activate the package
    if (state === "COMPLETED") {
      // Find the transaction and activate package
      const transaction = await db.collection("transactions").findOne({
        phonepeTransactionId: merchantTransactionId,
      });

      if (transaction) {
        // Activate the package for the user
        await db.collection("user_packages").insertOne({
          userId: transaction.userId,
          packageId: transaction.packageId,
          propertyId: transaction.propertyId,
          transactionId: transaction._id,
          activatedAt: new Date(),
          expiresAt: new Date(
            Date.now() +
              (transaction.packageDuration || 30) * 24 * 60 * 60 * 1000,
          ),
          status: "active",
          createdAt: new Date(),
        });

        console.log(
          "Package activated successfully for transaction:",
          merchantTransactionId,
        );
      }
    }

    res.json({
      success: true,
      message: "Callback processed successfully",
    });
  } catch (error) {
    console.error("PhonePe callback error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process callback",
    });
  }
};

// Get payment status from PhonePe
export const getPhonePePaymentStatus: RequestHandler = async (req, res) => {
  try {
    const { transactionId } = req.params;
    const config = await getPhonePeConfig();

    if (!config) {
      return res.status(400).json({
        success: false,
        error: "PhonePe not configured",
      });
    }

    const endpoint = `/pg/v1/status/${config.merchantId}/${transactionId}`;
    const checksum = generateChecksum(
      "",
      endpoint,
      config.saltKey,
      config.saltIndex,
    );

    const apiUrl = config.testMode
      ? "https://api-preprod.phonepe.com/apis/pg-sandbox"
      : "https://api.phonepe.com/apis/hermes";

    const response = await fetch(`${apiUrl}${endpoint}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "X-VERIFY": checksum,
        "X-MERCHANT-ID": config.merchantId,
      },
    });

    const responseData = await response.json();

    // Update local transaction status
    if (responseData.success) {
      const db = getDatabase();
      await db.collection("transactions").updateOne(
        { phonepeTransactionId: transactionId },
        {
          $set: {
            status: responseData.data.state === "COMPLETED" ? "paid" : "failed",
            phonepeResponse: responseData.data,
            updatedAt: new Date(),
          },
        },
      );
    }

    const apiResponse: ApiResponse<any> = {
      success: responseData.success,
      data: responseData.data,
    };

    res.json(apiResponse);
  } catch (error) {
    console.error("Error checking PhonePe payment status:", error);
    res.status(500).json({
      success: false,
      error: "Failed to check payment status",
    });
  }
};

// Create PhonePe transaction
export const createPhonePeTransaction: RequestHandler = async (req, res) => {
  try {
    const { packageId, propertyId, paymentMethod, paymentDetails } = req.body;
    const userId = (req as any).userId;

    console.log("🔄 Creating PhonePe transaction:", {
      userId,
      packageId,
      propertyId,
      paymentMethod,
      paymentDetails,
    });

    // Validate required fields
    if (!packageId || !paymentMethod || !paymentDetails) {
      return res.status(400).json({
        success: false,
        error:
          "Missing required fields: packageId, paymentMethod, paymentDetails",
      });
    }

    if (!paymentDetails.merchantTransactionId) {
      return res.status(400).json({
        success: false,
        error: "Missing merchantTransactionId in paymentDetails",
      });
    }

    const db = getDatabase();

    // Check PhonePe configuration
    const phonePeConfig = await getPhonePeConfig();
    if (!phonePeConfig) {
      return res.status(400).json({
        success: false,
        error:
          "PhonePe is not configured or enabled. Please check admin settings.",
      });
    }

    // Get package details with ObjectId validation
    let packageObjectId;
    try {
      packageObjectId = new ObjectId(packageId);
    } catch (error) {
      return res.status(400).json({
        success: false,
        error: "Invalid package ID format",
      });
    }

    const packageData = await db
      .collection("ad_packages")
      .findOne({ _id: packageObjectId });
    if (!packageData) {
      return res.status(404).json({
        success: false,
        error: "Package not found",
      });
    }

    console.log("✅ Package found:", {
      id: packageData._id,
      name: packageData.name,
      price: packageData.price,
    });

    // Create transaction record
    const transaction = {
      userId,
      packageId,
      propertyId,
      amount: packageData.price,
      currency: "INR",
      paymentMethod: "phonepe",
      paymentDetails,
      phonepeTransactionId: paymentDetails.merchantTransactionId,
      status: "pending",
      packageName: packageData.name,
      packageDuration: packageData.duration,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const result = await db.collection("transactions").insertOne(transaction);

    // Try to initiate PhonePe pay API server-side so secrets never leave server
    let instrumentResponse: any = null;
    try {
      const merchantTransactionId = paymentDetails.merchantTransactionId;
      const baseUrl =
        req.headers.origin || `${req.protocol}://${req.get("host")}`;
      const paymentRequest = {
        merchantTransactionId,
        merchantUserId: userId,
        amount: packageData.price * 100,
        redirectUrl: `${baseUrl}/payment-callback?packageId=${packageId}&propertyId=${propertyId || ""}&transactionId=${merchantTransactionId}`,
        redirectMode: "POST",
        callbackUrl: `${baseUrl}/api/payments/phonepe/callback`,
        mobileNumber: (req as any).userPhone || undefined,
        paymentInstrument: { type: "PAY_PAGE" },
      };

      const payloadString = JSON.stringify(paymentRequest);
      const base64Payload = Buffer.from(payloadString).toString("base64");
      const endpoint = "/pg/v1/pay";
      const checksum = generateChecksum(
        base64Payload,
        endpoint,
        phonePeConfig.saltKey,
        phonePeConfig.saltIndex,
      );
      const apiUrl = phonePeConfig.testMode
        ? "https://api-preprod.phonepe.com/apis/pg-sandbox"
        : "https://api.phonepe.com/apis/hermes";

      const phonepeResp = await fetch(`${apiUrl}${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-VERIFY": checksum,
          "X-MERCHANT-ID": phonePeConfig.merchantId,
        },
        body: JSON.stringify({ request: base64Payload }),
      });

      const phonepeData = await phonepeResp.json().catch(() => null);
      if (phonepeResp.ok && phonepeData) {
        instrumentResponse = phonepeData.data || phonepeData;
      } else {
        console.error(
          "PhonePe initiation failed:",
          phonepeResp.status,
          phonepeData,
        );
      }
    } catch (err) {
      console.error("Error initiating PhonePe API:", err);
    }

    const response: ApiResponse<{
      transactionId: string;
      status: string;
      instrumentResponse?: any;
    }> = {
      success: true,
      data: {
        transactionId: result.insertedId.toString(),
        status: "pending",
        instrumentResponse,
      },
    };

    res.json(response);
  } catch (error) {
    console.error("Error creating PhonePe transaction:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create transaction",
    });
  }
};

// Payment methods endpoint with PhonePe
export const getPaymentMethodsWithPhonePe: RequestHandler = async (
  req,
  res,
) => {
  try {
    const db = getDatabase();
    const config = await getPhonePeConfig();

    // Get other payment methods from existing endpoint logic
    const paymentMethods = {
      upi: {
        enabled: true,
        upiId: "aashishproperty@paytm",
        qrCode: "/api/payments/upi-qr",
      },
      bankTransfer: {
        enabled: true,
        bankName: "State Bank of India",
        accountNumber: "1234567890",
        ifscCode: "SBIN0001234",
        accountHolder: "Aashish Property",
      },
      online: {
        enabled: true,
        gateways: ["razorpay", "stripe"],
      },
      phonepe: {
        enabled: config?.enabled || false,
        merchantId: config?.merchantId || "",
        testMode: config?.testMode || true,
      },
    };

    const response: ApiResponse<any> = {
      success: true,
      data: paymentMethods,
    };

    res.json(response);
  } catch (error) {
    console.error("Error fetching payment methods:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch payment methods",
    });
  }
};
