import React, { useMemo, useRef, useEffect, useState } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { buildAllShapes, POINTS_PER_SHAPE } from "../hooks/shapes";
import { useIsMobile, useResponsiveScale } from "../hooks/useIsMobile";

const GOLD = new THREE.Color("#ffe27a");
const WHITE = new THREE.Color("#ffffff");

function useParticleTexture() {
  return useMemo(() => {
    const size = 64;
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext("2d");
    const gradient = ctx.createRadialGradient(
      size / 2,
      size / 2,
      0,
      size / 2,
      size / 2,
      size / 2,
    );
    gradient.addColorStop(0, "rgba(255,255,255,1)");
    gradient.addColorStop(0.3, "rgba(255,230,150,0.9)");
    gradient.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, []);
}

export default function ParticleField({ scrollProgress }) {
  const isMobile = useIsMobile(768);
  const responsiveScale = useResponsiveScale();

  const { shapes, edges } = useMemo(() => {
    return buildAllShapes();
  }, [isMobile]);

  const pointsRef = useRef();
  const groupRef = useRef();
  const linesARef = useRef();
  const linesBRef = useRef();

  const [isMobileState, setIsMobileState] = useState(false);

  const current = useMemo(() => new Float32Array(shapes[0]), [shapes]);

  const colors = useMemo(() => {
    const c = new Float32Array(POINTS_PER_SHAPE * 3);
    for (let i = 0; i < POINTS_PER_SHAPE; i++) {
      const mixAmt = (i % 5) / 5;
      const col = GOLD.clone().lerp(WHITE, mixAmt * 0.5);
      col.toArray(c, i * 3);
    }
    return c;
  }, [shapes]);

  const texture = useParticleTexture();
  const lastFloor = useRef(-1);

  const { camera, size } = useThree();
  const mouseNDC = useRef(new THREE.Vector2(9999, 9999));
  const mouseWorld = useRef(new THREE.Vector3());
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pickPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
    [],
  );

  const initialIndexA = useMemo(() => {
    return edges && edges[0] ? new THREE.BufferAttribute(edges[0], 1) : null;
  }, [edges]);

  const initialIndexB = useMemo(() => {
    const targetIdx = edges && edges.length > 1 ? 1 : 0;
    return edges && edges[targetIdx]
      ? new THREE.BufferAttribute(edges[targetIdx], 1)
      : null;
  }, [edges]);

  useEffect(() => {
    const handleResize = () => setIsMobileState(window.innerWidth < 768);
    handleResize();
    window.addEventListener("resize", handleResize);

    const onMove = (e) => {
      mouseNDC.current.x = (e.clientX / size.width) * 2 - 1;
      mouseNDC.current.y = -(e.clientY / size.height) * 2 + 1;
    };
    const onLeave = () => {
      mouseNDC.current.set(9999, 9999);
    };

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerleave", onLeave);

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerleave", onLeave);
    };
  }, [size]);

  useFrame((state) => {
    const time = state.clock.elapsedTime;
    const rawProgress = (scrollProgress?.current || 0) * (shapes.length - 1);
    const clamped = Math.min(Math.max(rawProgress, 0), shapes.length - 1);
    const floor = Math.min(
      Math.floor(clamped),
      shapes.length - 2 >= 0 ? shapes.length - 2 : 0,
    );
    const frac = shapes.length > 1 ? clamped - floor : 0;

    const shapeA = shapes[Math.min(floor, shapes.length - 1)];
    const shapeB = shapes[Math.min(floor + 1, shapes.length - 1)];

    if (!isMobile) {
      raycaster.setFromCamera(mouseNDC.current, camera);
      const hit = new THREE.Vector3();
      const didHit = raycaster.ray.intersectPlane(pickPlane, hit);
      if (didHit && groupRef.current) {
        groupRef.current.worldToLocal(hit);
        mouseWorld.current.copy(hit);
      }
    }

    const posAttr = pointsRef.current.geometry.attributes.position;
    const arr = posAttr.array;
    const REPEL_RADIUS = 0.5;
    const REPEL_STRENGTH = 0.2;
    const isMouseActive = mouseNDC.current.x < 100;

    for (let i = 0; i < POINTS_PER_SHAPE; i++) {
      const ix = i * 3;
      const tx = shapeA[ix] + (shapeB[ix] - shapeA[ix]) * frac;
      const ty = shapeA[ix + 1] + (shapeB[ix + 1] - shapeA[ix + 1]) * frac;
      const tz = shapeA[ix + 2] + (shapeB[ix + 2] - shapeA[ix + 2]) * frac;

      current[ix] += (tx - current[ix]) * 0.08;
      current[ix + 1] += (ty - current[ix + 1]) * 0.08;
      current[ix + 2] += (tz - current[ix + 2]) * 0.08;

      let px = current[ix];
      let py = current[ix + 1];
      let pz = current[ix + 2];

      if (isMouseActive && !isMobile) {
        const dx = px - mouseWorld.current.x;
        const dy = py - mouseWorld.current.y;
        const dist = Math.hypot(dx, dy);
        if (dist < REPEL_RADIUS && dist > 0.0001) {
          const force = (1 - dist / REPEL_RADIUS) * REPEL_STRENGTH;
          px += (dx / dist) * force;
          py += (dy / dist) * force;
        }
      }

      arr[ix] = px;
      arr[ix + 1] = py;
      arr[ix + 2] = pz;
    }
    posAttr.needsUpdate = true;

    if (groupRef.current) {
      // ZOOM na transição, agora combinado com a escala responsiva: em vez
      // de um valor fixo (0.8 mobile / 1.25 desktop), baseScale vem do hook
      // useResponsiveScale — encolhe gradualmente conforme a tela fica menor.
      const baseScale = responsiveScale;
      const transitionPulse = Math.sin(frac * Math.PI);
      const targetScale = baseScale * (1 + transitionPulse * 0.4);
      const nextScale = THREE.MathUtils.lerp(
        groupRef.current.scale.x,
        targetScale,
        0.08,
      );
      groupRef.current.scale.setScalar(nextScale);

      const baseY = isMobile ? 2.5 : 0.1;
      const baseX = isMobile ? 0 : 6.2;

      const floatOffset = Math.sin(time * 1.5) * 0.15;

      const targetX =
        isMouseActive && !isMobile ? baseX + mouseNDC.current.x * 0.5 : baseX;
      const targetY =
        isMouseActive && !isMobile
          ? baseY + mouseNDC.current.y * 0.5 + floatOffset
          : baseY + floatOffset;

      groupRef.current.position.x = THREE.MathUtils.lerp(
        groupRef.current.position.x,
        targetX,
        0.05,
      );
      groupRef.current.position.y = THREE.MathUtils.lerp(
        groupRef.current.position.y,
        targetY,
        0.05,
      );

      const targetRotationX =
        isMouseActive && !isMobile ? -mouseNDC.current.y * 0.15 : 0;
      const targetRotationY =
        isMouseActive && !isMobile ? mouseNDC.current.x * 0.15 : 0;

      groupRef.current.rotation.x = THREE.MathUtils.lerp(
        groupRef.current.rotation.x,
        targetRotationX,
        0.05,
      );
      groupRef.current.rotation.y = THREE.MathUtils.lerp(
        groupRef.current.rotation.y,
        targetRotationY,
        0.05,
      );
    }

    if (floor !== lastFloor.current) {
      lastFloor.current = floor;
      if (linesARef.current && edges[Math.min(floor, edges.length - 1)]) {
        linesARef.current.geometry.setIndex(
          new THREE.BufferAttribute(
            edges[Math.min(floor, edges.length - 1)],
            1,
          ),
        );
      }
      if (linesBRef.current && edges[Math.min(floor + 1, edges.length - 1)]) {
        linesBRef.current.geometry.setIndex(
          new THREE.BufferAttribute(
            edges[Math.min(floor + 1, edges.length - 1)],
            1,
          ),
        );
      }
    }

    if (linesARef.current && linesBRef.current) {
      linesARef.current.material.opacity = (1 - frac) * 0.05;
      linesBRef.current.material.opacity = frac * 0.05;
      linesARef.current.geometry.attributes.position.needsUpdate = true;
      linesBRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  const sharedPositionAttr = useMemo(
    () => new THREE.BufferAttribute(current, 3),
    [current],
  );

  return (
    <group
      ref={groupRef}
      position={isMobile ? [0, 2.5, 0] : [6.2, 0.1, 0]}
      scale={responsiveScale}
    >
      <points ref={pointsRef}>
        <bufferGeometry>
          <primitive attach="attributes-position" object={sharedPositionAttr} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={isMobile ? 0.08 : 0.12}
          map={texture}
          vertexColors
          transparent
          opacity={1}
          alphaTest={0.01}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          sizeAttenuation
        />
      </points>

      <lineSegments ref={linesARef}>
        <bufferGeometry>
          <primitive attach="attributes-position" object={sharedPositionAttr} />
          {initialIndexA && <primitive attach="index" object={initialIndexA} />}
        </bufferGeometry>
        <lineBasicMaterial
          color="#dbb057"
          transparent
          opacity={0.05}
          depthWrite={false}
        />
      </lineSegments>

      <lineSegments ref={linesBRef}>
        <bufferGeometry>
          <primitive attach="attributes-position" object={sharedPositionAttr} />
          {initialIndexB && <primitive attach="index" object={initialIndexB} />}
        </bufferGeometry>
        <lineBasicMaterial
          color="#dbb057"
          transparent
          opacity={0}
          depthWrite={false}
        />
      </lineSegments>
    </group>
  );
}
