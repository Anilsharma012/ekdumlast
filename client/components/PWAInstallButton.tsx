import { useState, useEffect } from "react";
import { Download, X, Smartphone, FileDown } from "lucide-react";
import { Button } from "./ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const PWAInstallButton = () => {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showInstallButton, setShowInstallButton] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    // Check if already installed
    const checkInstalled = () => {
      // Check if running in standalone mode (PWA is installed)
      if (window.matchMedia("(display-mode: standalone)").matches) {
        setIsInstalled(true);
        return;
      }

      // Check if already dismissed
      const dismissed = localStorage.getItem("pwa-install-dismissed");
      if (dismissed) {
        const dismissedTime = parseInt(dismissed);
        const daysSinceDismissed =
          (Date.now() - dismissedTime) / (1000 * 60 * 60 * 24);

        // Show again after 7 days
        if (daysSinceDismissed < 7) {
          setIsVisible(false);
          return;
        }
      }
    };

    checkInstalled();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowInstallButton(true);
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowInstallButton(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) {
      // Fallback for browsers that don't support the prompt
      setShowInstallButton(false);
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const choiceResult = await deferredPrompt.userChoice;

    if (choiceResult.outcome === "accepted") {
      console.log("User accepted the install prompt");
      setIsInstalled(true);
    } else {
      console.log("User dismissed the install prompt");
    }

    // Clear the saved prompt since it can only be used once
    setDeferredPrompt(null);
    setShowInstallButton(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem("pwa-install-dismissed", Date.now().toString());
  };

  const handleAPKDownload = async () => {
    try {
      // Check if APK is available
      const infoResponse = await fetch("/api/app/info");
      const infoData = await infoResponse.json();

      if (!infoData.success || !infoData.data.available) {
        alert("APK file is not available. Please contact admin.");
        return;
      }

      // Create a download link for the APK file
      const link = document.createElement("a");
      link.href = "/api/app/download";
      link.download = "AshishProperty.apk";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Track the download
      console.log("APK download initiated");
    } catch (error) {
      console.error("Error downloading APK:", error);
      alert("Failed to download APK. Please try again.");
    }
  };

  // Don't show if installed or not visible
  if (isInstalled || !isVisible) {
    return null;
  }

  // Show install button if browser supports PWA installation
  if (showInstallButton || deferredPrompt) {
    return (
      <div className="fixed bottom-20 left-4 right-4 z-40 md:left-auto md:right-4 md:w-80">
        <div className="bg-gradient-to-r from-[#C70000] to-[#A50000] text-white rounded-lg shadow-lg p-4 transform transition-all duration-300 hover:scale-105">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                <Smartphone className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-sm font-bold">Install App</h3>
                <p className="text-xs text-red-100">
                  Add to home screen for better experience
                </p>
              </div>
            </div>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>

          <div className="mt-3 flex space-x-2">
            <Button
              onClick={handleInstallClick}
              size="sm"
              className="flex-1 bg-white text-[#C70000] hover:bg-gray-100 font-medium"
            >
              <Download className="h-4 w-4 mr-2" />
              Install PWA
            </Button>
            <Button
              onClick={handleAPKDownload}
              size="sm"
              className="bg-white/20 text-white hover:bg-white/30 border-white/30"
              variant="outline"
            >
              <FileDown className="h-4 w-4 mr-1" />
              APK
            </Button>
            <Button
              onClick={handleDismiss}
              size="sm"
              variant="ghost"
              className="text-white hover:bg-white/20"
            >
              Later
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show general app promotion for browsers that don't support PWA prompts
  return (
    <div className="fixed bottom-20 left-4 right-4 z-40 md:left-auto md:right-4 md:w-80">
      <div className="bg-gradient-to-r from-[#C70000] to-[#A50000] text-white rounded-lg shadow-lg p-3 transform transition-all duration-300">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
              <Smartphone className="h-4 w-4 text-white" />
            </div>
            <div className="flex-1">
              <h3 className="text-sm font-bold">Install App</h3>
              <p className="text-xs text-red-100">
                Better experience on mobile
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              onClick={handleAPKDownload}
              size="sm"
              className="bg-white/20 text-white hover:bg-white/30 border-white/30 text-xs px-2 py-1"
              variant="outline"
            >
              <FileDown className="h-3 w-3 mr-1" />
              APK
            </Button>
            <button
              onClick={handleDismiss}
              className="p-1 hover:bg-white/20 rounded transition-colors"
            >
              <X className="h-4 w-4 text-white" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PWAInstallButton;
