import { motion, AnimatePresence } from "framer-motion";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import logo from "@/assets/brototype-logo.png";

interface StickyNavProps {
  onGetStarted: () => void;
}

export const StickyNav = ({ onGetStarted }: StickyNavProps) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollY = window.scrollY;
      const heroHeight = window.innerHeight; // 100vh
      setIsVisible(scrollY > heroHeight);
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.nav
          className="fixed top-0 left-0 right-0 z-40 bg-black/50 backdrop-blur-lg border-b border-white/10"
          initial={{ y: -100, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -100, opacity: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
        >
          <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Brototype Logo" className="w-8 h-8" />
              <span className="text-lg font-semibold gradient-text">Brototype Connect</span>
            </div>
            <Button
              onClick={onGetStarted}
              className="rounded-full px-6 py-2 gradient-text-hover"
            >
              Get Started
            </Button>
          </div>
        </motion.nav>
      )}
    </AnimatePresence>
  );
};
