import { motion } from "framer-motion";
import { useState, useEffect } from "react";

export const CustomCursor = () => {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isHoveringInteractive, setIsHoveringInteractive] = useState(false);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({ x: e.clientX, y: e.clientY });
    };

    const handleMouseEnter = () => setIsHoveringInteractive(true);
    const handleMouseLeave = () => setIsHoveringInteractive(false);

    window.addEventListener("mousemove", handleMouseMove);

    // Add event listeners to all interactive elements
    const interactiveElements = document.querySelectorAll("button, a, [role='button']");
    interactiveElements.forEach((el) => {
      el.addEventListener("mouseenter", handleMouseEnter);
      el.addEventListener("mouseleave", handleMouseLeave);
    });

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      interactiveElements.forEach((el) => {
        el.removeEventListener("mouseenter", handleMouseEnter);
        el.removeEventListener("mouseleave", handleMouseLeave);
      });
    };
  }, []);

  const cursorVariants = {
    default: {
      scale: 1,
      backgroundColor: "rgba(255, 255, 255, 0.2)",
      boxShadow: "0 0 10px rgba(255, 255, 255, 0.3)",
    },
    hover: {
      scale: 1.5,
      backgroundColor: "hsl(var(--primary))",
      boxShadow: "0 0 20px hsl(var(--primary) / 0.6), 0 0 40px hsl(var(--primary) / 0.3)",
    },
  };

  return (
    <motion.div
      className="fixed top-0 left-0 w-6 h-6 rounded-full pointer-events-none z-[9999] mix-blend-difference"
      style={{
        x: mousePosition.x - 12,
        y: mousePosition.y - 12,
      }}
      variants={cursorVariants}
      animate={isHoveringInteractive ? "hover" : "default"}
      transition={{ type: "spring", stiffness: 500, damping: 28 }}
    />
  );
};
