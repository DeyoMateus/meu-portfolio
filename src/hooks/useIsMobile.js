import { useState, useEffect } from "react";

export function useIsMobile(breakpoint = 768) {
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

/**
 * useResponsiveScale
 * ---------------------------------------------------------------------
 * Em vez de um único "é mobile ou não" (0.8 fixo), calcula um multiplicador
 * de escala GRADUAL de acordo com a largura real da tela. Isso resolve o
 * problema das formas "explodindo": um iPhone SE (375px) e um tablet
 * (760px) antes usavam a MESMA escala 0.8 — só que o SE tem bem menos
 * espaço horizontal visível (a câmera do Three.js usa FOV vertical fixo,
 * então em telas estreitas e altas o campo de visão horizontal encolhe),
 * então as partículas pareciam estourar pra fora da área útil.
 */
export function useResponsiveScale() {
  const getScale = (width) => {
    if (width <= 360) return 0.4;
    if (width <= 420) return 0.48;
    if (width <= 480) return 0.55;
    if (width <= 640) return 0.65;
    if (width <= 768) return 0.75;
    if (width <= 1024) return 1.0;
    return 1.25; // desktop — mesmo valor que já era usado antes
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
