import { memo, useEffect, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import ParticleField from "./ParticleField";
import ParticleCanvas from "./ParticleCanvas";

/**
 * Governador de qualidade: mede o tempo médio de frame e só DEGRADA (nunca sobe
 * de volta, para evitar oscilação).
 *   nível 0: tudo ligado
 *   nível 1: pixel ratio 1 + fundo "lite" (metade dos nós, sem cauda/cometas)
 *   nível 2: fundo desligado (fica só o 3D principal)
 */
function QualityGovernor({ level, onLevel }) {
  const setDpr = useThree((state) => state.setDpr);
  const acc = useRef({ time: 0, frames: 0, warmup: 2.5 });

  useFrame((_, delta) => {
    if (delta > 0.25) return; // aba oculta / pausa: ignora
    const a = acc.current;
    if (a.warmup > 0) {
      a.warmup -= delta;
      return;
    }
    a.time += delta;
    a.frames += 1;
    if (a.time >= 2) {
      const avgMs = (a.time / a.frames) * 1000;
      a.time = 0;
      a.frames = 0;
      // nível 0 -> 1 só abaixo de ~20 fps; nível 1 -> 2 só abaixo de ~12 fps (casos extremos)
      const limit = level === 0 ? 50 : 80;
      if (avgMs > limit && level < 2) {
        a.warmup = 1.5;
        onLevel(level + 1);
      }
    }
  });

  useEffect(() => {
    if (level >= 1) setDpr(1);
  }, [level, setDpr]);

  return null;
}

function prefersReducedMotion() {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

// Memoizado: não re-renderiza quando o App muda de estado.
function Scene3D({ scrollProgress, isMobile }) {
  const [level, setLevel] = useState(0);
  const showBackground = !isMobile && level < 2 && !prefersReducedMotion();

  return (
    <Canvas
      camera={{ position: [0, 0, 9], fov: 60 }}
      dpr={[1, isMobile || level >= 1 ? 1.25 : 1.5]}
      gl={{
        powerPreference: "high-performance",
        antialias: false,
        alpha: true,
        stencil: false,
      }}
      eventSource={document.getElementById("root")}
      eventPrefix="client"
      onCreated={({ gl }) => {
        gl.domElement.addEventListener(
          "webglcontextlost",
          (event) => event.preventDefault(),
          false,
        );
      }}
    >
      <ambientLight intensity={1} />
      <ParticleField scrollProgress={scrollProgress} />
      {showBackground && <ParticleCanvas lite={level >= 1} />}
      <QualityGovernor level={level} onLevel={setLevel} />
    </Canvas>
  );
}

export default memo(Scene3D);
