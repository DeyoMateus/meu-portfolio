import { useState, useEffect } from "react";

export function useIsMobile(breakpoint = 1280) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= breakpoint);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, [breakpoint]);

  return isMobile;
}

export function useResponsiveScale() {
  const getScale = (width) => {
    if (width <= 360) return 0.35;
    if (width <= 420) return 0.42;
    if (width <= 480) return 0.5;
    if (width <= 640) return 0.6;
    if (width <= 768) return 0.7;
    if (width <= 850) return 0.78;
    if (width <= 1024) return 0.88;
    if (width <= 1280) return 1.05;
    if (width <= 1500) return 1.15;
    return 1.25;
  };

  const [scale, setScale] = useState(() =>
    typeof window !== "undefined" ? getScale(window.innerWidth) : 1.25,
  );

  useEffect(() => {
    const handleResize = () => setScale(getScale(window.innerWidth));
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return scale;
}
