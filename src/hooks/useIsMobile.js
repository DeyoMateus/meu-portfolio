import { useEffect, useState } from "react";

export function useIsMobile(breakpoint = 1280) {
  const getIsMobile = () => {
    if (typeof window === "undefined") {
      return false;
    }

    return window.innerWidth <= breakpoint;
  };

  const [isMobile, setIsMobile] = useState(getIsMobile);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);

    const update = () => {
      setIsMobile(mediaQuery.matches);
    };

    update();

    mediaQuery.addEventListener("change", update);

    return () => {
      mediaQuery.removeEventListener("change", update);
    };
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

  const [scale, setScale] = useState(() => {
    if (typeof window === "undefined") {
      return 1;
    }

    return getScale(window.innerWidth);
  });

  useEffect(() => {
    const updateScale = () => {
      setScale(getScale(window.innerWidth));
    };

    updateScale();

    window.addEventListener("resize", updateScale);

    return () => {
      window.removeEventListener("resize", updateScale);
    };
  }, []);

  return scale;
}
