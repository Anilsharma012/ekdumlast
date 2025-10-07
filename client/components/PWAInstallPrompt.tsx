import React, { useState, useEffect } from "react";
import { X, Star, Download } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

export default function PWAInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Listen for the beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setShowPrompt(true);
    };

    // Listen for the appinstalled event
    const handleAppInstalled = () => {
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    // Show prompt after 2 seconds if not already shown
    const timer = setTimeout(() => {
      if (!isInstalled && !localStorage.getItem('pwa-prompt-dismissed')) {
        setShowPrompt(true);
      }
    }, 2000);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
      clearTimeout(timer);
    };
  }, [isInstalled]);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        setShowPrompt(false);
      }
    } else {
      // Fallback for browsers that don't support the API
      alert('To install this app, use your browser\'s "Add to Home Screen" option.');
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (isInstalled || !showPrompt) {
    return null;
  }

  return (
    <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 w-80">
      <div className="bg-blue-600 text-white rounded-xl shadow-2xl overflow-hidden mx-4">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 hover:bg-blue-700 rounded-full"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-4 text-center">
          <div className="w-16 h-16 bg-white rounded-xl flex items-center justify-center mx-auto mb-3">
            <img
              src="/favicon.ico"
              alt="App Icon"
              className="w-10 h-10"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = 'none';
                target.nextElementSibling?.classList.remove('hidden');
              }}
            />
            <div className="w-10 h-10 bg-[#C70000] rounded-xl hidden items-center justify-center">
              <span className="text-white font-bold">AP</span>
            </div>
          </div>

          <h3 className="font-bold text-lg mb-1">Ashish Property App</h3>
          <p className="text-sm opacity-90 mb-2">Buy & Sell better with app</p>

          <div className="flex items-center justify-center space-x-1 mb-4">
            <div className="flex">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <span className="text-sm opacity-90 ml-2">4.5 • 10Cr+ Downloads</span>
          </div>

          <button
            onClick={handleInstallClick}
            className="w-full bg-white text-blue-600 py-3 rounded-lg font-bold text-lg hover:bg-gray-100 transition-colors flex items-center justify-center space-x-2 shadow-lg"
          >
            <Download className="h-5 w-5" />
            <span>Install App</span>
          </button>
        </div>
      </div>
    </div>
  );
}
