import React, { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import {
  CreditCard,
  Smartphone,
  Building2,
  Check,
  Copy,
  ExternalLink,
  AlertCircle,
  CheckCircle,
  Zap,
} from "lucide-react";
import { phonePeService } from "../lib/phonepe";

interface PaymentFormProps {
  packageId: string;
  propertyId?: string;
  amount: number;
  onPaymentComplete: (transactionId: string) => void;
  onCancel: () => void;
}

interface PaymentMethods {
  upi: {
    enabled: boolean;
    upiId: string;
    qrCode: string;
  };
  bankTransfer: {
    enabled: boolean;
    bankName: string;
    accountNumber: string;
    ifscCode: string;
    accountHolder: string;
  };
  online: {
    enabled: boolean;
    gateways: string[];
  };
  phonepe: {
    enabled: boolean;
    merchantId: string;
    testMode: boolean;
  };
}

export default function PaymentForm({
  packageId,
  propertyId,
  amount,
  onPaymentComplete,
  onCancel,
}: PaymentFormProps) {
  const [paymentMethod, setPaymentMethod] = useState<
    "upi" | "bank_transfer" | "online" | "phonepe"
  >("phonepe");
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethods | null>(
    null,
  );
  const [loading, setLoading] = useState(false);
  const [transactionId, setTransactionId] = useState("");
  const [upiId, setUpiId] = useState("");
  const [showSuccess, setShowSuccess] = useState(false);
  const [copiedText, setCopiedText] = useState("");

  useEffect(() => {
    fetchPaymentMethods();
  }, []);

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch("/api/payments/methods");
      const data = await response.json();

      if (data.success) {
        setPaymentMethods(data.data);
      }
    } catch (error) {
      console.error("Error fetching payment methods:", error);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(""), 2000);
  };

  const createTransaction = async (paymentDetails: any) => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");

      const response = await fetch("/api/payments/transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          packageId,
          propertyId,
          paymentMethod,
          paymentDetails,
        }),
      });

      const data = await response.json();

      if (data.success) {
        if (data.data.status === "paid") {
          // Free package - immediate success
          setShowSuccess(true);
          setTimeout(() => {
            onPaymentComplete(data.data.transactionId);
          }, 2000);
        } else {
          // Paid package - show pending status
          setShowSuccess(true);
          setTimeout(() => {
            onPaymentComplete(data.data.transactionId);
          }, 2000);
        }
      } else {
        alert(data.error || "Failed to create transaction");
      }
    } catch (error) {
      console.error("Error creating transaction:", error);
      alert("Failed to process payment");
    } finally {
      setLoading(false);
    }
  };

  const handleUPIPayment = () => {
    if (!upiId.trim()) {
      alert("Please enter your UPI ID");
      return;
    }

    createTransaction({
      upiId: upiId,
      transactionId: transactionId,
    });
  };

  const handleBankTransfer = () => {
    if (!transactionId.trim()) {
      alert("Please enter the transaction reference number");
      return;
    }

    createTransaction({
      bankAccount: paymentMethods?.bankTransfer.accountNumber,
      transactionId: transactionId,
    });
  };

  const handleOnlinePayment = () => {
    // In a real implementation, this would integrate with payment gateways
    createTransaction({
      gateway: "razorpay",
      transactionId: `ONLINE_${Date.now()}`,
    });
  };

  const handlePhonePePayment = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem("token");
      if (!token) {
        alert("Please login to continue");
        return;
      }

      // Get user info from token or localStorage
      const userInfo = JSON.parse(localStorage.getItem("user") || "{}");

      const paymentResult = await phonePeService.initiatePayment({
        amount: amount,
        packageId: packageId,
        propertyId: propertyId,
        userId: userInfo.id || "user_" + Date.now(),
        userPhone: userInfo.phone,
      });

      if (paymentResult.success && paymentResult.data) {
        // Redirect to PhonePe payment page
        const redirectInfo = paymentResult.data.instrumentResponse.redirectInfo;
        window.location.href = redirectInfo.url;
      } else {
        alert(paymentResult.error || "Failed to initiate PhonePe payment");
      }
    } catch (error: any) {
      console.error("PhonePe payment error:", error);
      alert("Failed to process PhonePe payment: " + error.message);
    } finally {
      setLoading(false);
    }
  };

  if (!paymentMethods) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin w-8 h-8 border-2 border-[#C70000] border-t-transparent rounded-full mx-auto mb-4"></div>
          <p className="text-gray-600">Loading payment options...</p>
        </div>
      </div>
    );
  }

  if (showSuccess) {
    return (
      <div className="text-center py-12">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 text-green-600 rounded-full mb-4">
          <CheckCircle className="h-8 w-8" />
        </div>
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          Payment Submitted!
        </h3>
        <p className="text-gray-600 mb-4">
          {amount === 0
            ? "Your free package has been activated immediately."
            : "Your payment is being processed. You'll receive a confirmation once it's verified."}
        </p>
        <div className="animate-pulse text-[#C70000]">
          Redirecting to dashboard...
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Complete Payment
        </h2>
        <p className="text-gray-600">
          Total Amount: <span className="font-semibold">₹{amount}</span>
        </p>
      </div>

      {/* Payment Method Selection */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {paymentMethods.phonepe?.enabled && (
          <button
            onClick={() => setPaymentMethod("phonepe")}
            className={`p-4 border-2 rounded-lg transition-all ${
              paymentMethod === "phonepe"
                ? "border-[#C70000] bg-red-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <Zap className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <div className="text-sm font-semibold">PhonePe</div>
            <div className="text-xs text-gray-500">Instant payment</div>
          </button>
        )}

        {paymentMethods.upi.enabled && (
          <button
            onClick={() => setPaymentMethod("upi")}
            className={`p-4 border-2 rounded-lg transition-all ${
              paymentMethod === "upi"
                ? "border-[#C70000] bg-red-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <Smartphone className="h-8 w-8 mx-auto mb-2 text-blue-600" />
            <div className="text-sm font-semibold">UPI Payment</div>
            <div className="text-xs text-gray-500">Pay via UPI apps</div>
          </button>
        )}

        {paymentMethods.bankTransfer.enabled && (
          <button
            onClick={() => setPaymentMethod("bank_transfer")}
            className={`p-4 border-2 rounded-lg transition-all ${
              paymentMethod === "bank_transfer"
                ? "border-[#C70000] bg-red-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <Building2 className="h-8 w-8 mx-auto mb-2 text-green-600" />
            <div className="text-sm font-semibold">Bank Transfer</div>
            <div className="text-xs text-gray-500">Direct bank transfer</div>
          </button>
        )}

        {paymentMethods.online.enabled && (
          <button
            onClick={() => setPaymentMethod("online")}
            className={`p-4 border-2 rounded-lg transition-all ${
              paymentMethod === "online"
                ? "border-[#C70000] bg-red-50"
                : "border-gray-200 hover:border-gray-300"
            }`}
          >
            <CreditCard className="h-8 w-8 mx-auto mb-2 text-purple-600" />
            <div className="text-sm font-semibold">Online Payment</div>
            <div className="text-xs text-gray-500">
              Card, Net Banking, Wallet
            </div>
          </button>
        )}
      </div>

      {/* Payment Form */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        {paymentMethod === "upi" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Smartphone className="h-5 w-5 mr-2 text-blue-600" />
              UPI Payment
            </h3>

            {/* UPI ID to Pay */}
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-900">
                    Pay to UPI ID:
                  </p>
                  <p className="text-lg font-mono text-blue-800">
                    {paymentMethods.upi.upiId}
                  </p>
                </div>
                <Button
                  onClick={() => handleCopy(paymentMethods.upi.upiId, "UPI ID")}
                  variant="outline"
                  size="sm"
                >
                  {copiedText === "UPI ID" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>

            {/* Amount Display */}
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="text-sm text-gray-600">Amount to Pay:</p>
              <p className="text-2xl font-bold text-gray-900">₹{amount}</p>
            </div>

            {/* User UPI ID Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your UPI ID *
              </label>
              <Input
                type="text"
                placeholder="yourname@paytm"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                required
              />
            </div>

            {/* Transaction ID Input */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Reference Number (after payment)
              </label>
              <Input
                type="text"
                placeholder="Enter UPI transaction ID"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
              />
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-yellow-400 mt-0.5 mr-3" />
                <div>
                  <h4 className="text-sm font-medium text-yellow-800">
                    Payment Instructions
                  </h4>
                  <ol className="text-sm text-yellow-700 mt-1 list-decimal list-inside space-y-1">
                    <li>Copy the UPI ID above</li>
                    <li>Open your UPI app (PayTM, GPay, PhonePe, etc.)</li>
                    <li>Send ₹{amount} to the UPI ID</li>
                    <li>Enter your UPI ID and transaction ID here</li>
                    <li>Click "Complete Payment" below</li>
                  </ol>
                </div>
              </div>
            </div>

            <Button
              onClick={handleUPIPayment}
              disabled={loading}
              className="w-full bg-[#C70000] hover:bg-[#A60000] text-white"
            >
              {loading ? "Processing..." : "Complete Payment"}
            </Button>
          </div>
        )}

        {paymentMethod === "bank_transfer" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Building2 className="h-5 w-5 mr-2 text-green-600" />
              Bank Transfer
            </h3>

            <div className="bg-green-50 p-4 rounded-lg space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-900">
                    Bank Name:
                  </p>
                  <p className="font-semibold">
                    {paymentMethods.bankTransfer.bankName}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-900">
                    Account Number:
                  </p>
                  <p className="font-mono text-lg">
                    {paymentMethods.bankTransfer.accountNumber}
                  </p>
                </div>
                <Button
                  onClick={() =>
                    handleCopy(
                      paymentMethods.bankTransfer.accountNumber,
                      "Account Number",
                    )
                  }
                  variant="outline"
                  size="sm"
                >
                  {copiedText === "Account Number" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-900">
                    IFSC Code:
                  </p>
                  <p className="font-mono text-lg">
                    {paymentMethods.bankTransfer.ifscCode}
                  </p>
                </div>
                <Button
                  onClick={() =>
                    handleCopy(
                      paymentMethods.bankTransfer.ifscCode,
                      "IFSC Code",
                    )
                  }
                  variant="outline"
                  size="sm"
                >
                  {copiedText === "IFSC Code" ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div>
                <p className="text-sm font-medium text-green-900">
                  Account Holder:
                </p>
                <p className="font-semibold">
                  {paymentMethods.bankTransfer.accountHolder}
                </p>
              </div>

              <div>
                <p className="text-sm font-medium text-green-900">
                  Amount to Transfer:
                </p>
                <p className="text-2xl font-bold text-green-800">₹{amount}</p>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Transaction Reference Number *
              </label>
              <Input
                type="text"
                placeholder="Enter bank transaction reference number"
                value={transactionId}
                onChange={(e) => setTransactionId(e.target.value)}
                required
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-start">
                <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5 mr-3" />
                <div>
                  <h4 className="text-sm font-medium text-blue-800">
                    Bank Transfer Instructions
                  </h4>
                  <ol className="text-sm text-blue-700 mt-1 list-decimal list-inside space-y-1">
                    <li>Transfer ₹{amount} to the above bank account</li>
                    <li>Keep the transaction receipt</li>
                    <li>Enter the reference number here</li>
                    <li>
                      We will verify and activate your package within 2-4 hours
                    </li>
                  </ol>
                </div>
              </div>
            </div>

            <Button
              onClick={handleBankTransfer}
              disabled={loading || !transactionId.trim()}
              className="w-full bg-[#C70000] hover:bg-[#A60000] text-white"
            >
              {loading ? "Processing..." : "Submit Bank Transfer"}
            </Button>
          </div>
        )}

        {paymentMethod === "phonepe" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <Zap className="h-5 w-5 mr-2 text-purple-600" />
              PhonePe Payment
            </h3>

            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-purple-800 font-medium">Amount: ₹{amount}</p>
              <p className="text-sm text-purple-700 mt-1">
                You will be redirected to PhonePe secure payment gateway
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 border border-gray-200 rounded-lg">
                <div className="text-sm font-medium">UPI Apps</div>
                <div className="text-xs text-gray-500">
                  PhonePe, GPay, PayTM
                </div>
              </div>
              <div className="text-center p-3 border border-gray-200 rounded-lg">
                <div className="text-sm font-medium">Cards & Banking</div>
                <div className="text-xs text-gray-500">
                  Debit/Credit, Net Banking
                </div>
              </div>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-start">
                <CheckCircle className="h-5 w-5 text-green-400 mt-0.5 mr-3" />
                <div>
                  <h4 className="text-sm font-medium text-green-800">
                    PhonePe Benefits
                  </h4>
                  <ul className="text-sm text-green-700 mt-1 space-y-1">
                    <li>• Instant payment confirmation</li>
                    <li>• Secure payment gateway</li>
                    <li>• Multiple payment options</li>
                    <li>• No hidden charges</li>
                  </ul>
                </div>
              </div>
            </div>

            <Button
              onClick={handlePhonePePayment}
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white"
            >
              {loading ? "Redirecting..." : "Pay with PhonePe"}
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}

        {paymentMethod === "online" && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center">
              <CreditCard className="h-5 w-5 mr-2 text-purple-600" />
              Online Payment
            </h3>

            <div className="bg-purple-50 p-4 rounded-lg">
              <p className="text-purple-800 font-medium">Amount: ₹{amount}</p>
              <p className="text-sm text-purple-700 mt-1">
                You will be redirected to secure payment gateway
              </p>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="text-center p-3 border border-gray-200 rounded-lg">
                <div className="text-sm font-medium">Cards</div>
                <div className="text-xs text-gray-500">Visa, Mastercard</div>
              </div>
              <div className="text-center p-3 border border-gray-200 rounded-lg">
                <div className="text-sm font-medium">Net Banking</div>
                <div className="text-xs text-gray-500">All major banks</div>
              </div>
              <div className="text-center p-3 border border-gray-200 rounded-lg">
                <div className="text-sm font-medium">Wallets</div>
                <div className="text-xs text-gray-500">PayTM, PhonePe</div>
              </div>
            </div>

            <Button
              onClick={handleOnlinePayment}
              disabled={loading}
              className="w-full bg-[#C70000] hover:bg-[#A60000] text-white"
            >
              {loading ? "Processing..." : "Pay Now"}
              <ExternalLink className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>

      {/* Cancel Button */}
      <div className="flex justify-center">
        <Button onClick={onCancel} variant="outline" disabled={loading}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
