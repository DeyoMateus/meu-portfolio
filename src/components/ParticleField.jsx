import React, { useMemo, useRef, useEffect } from "react";

import { useFrame, useThree } from "@react-three/fiber";

import * as THREE from "three";

import { buildAllShapes, getPointsPerShape } from "../hooks/shapes";

import { useIsMobile, useResponsiveScale } from "../hooks/useIsMobile";

const GOLD = new THREE.Color("#ffe27a");

const WHITE = new THREE.Color("#ffffff");

function getWorldViewportHeight(camera, distance) {
  const vFOV = THREE.MathUtils.degToRad(camera.fov);

  return 2 * Math.tan(vFOV / 2) * distance;
}

function worldYForScreenFraction(camera, fractionFromTop, distance) {
  const fullHeight = getWorldViewportHeight(camera, distance);

  return (fullHeight / 2) * (1 - 2 * fractionFromTop);
}

function useParticleTexture() {
  return useMemo(() => {
    const size = 256;

    const canvas = document.createElement("canvas");

    canvas.width = canvas.height = size;

    const ctx = canvas.getContext("2d");

    if (!ctx) {
      return null;
    }

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

    tex.minFilter = THREE.LinearFilter;

    tex.magFilter = THREE.LinearFilter;

    tex.needsUpdate = true;

    return tex;
  }, []);
}

export default function ParticleField({ scrollProgress }) {
  const isMobile = useIsMobile(1280);

  const responsiveScale = useResponsiveScale();

  const { camera, size } = useThree();

  // ==========================================================
  // QUANTIDADE
  // ==========================================================

  const pointsPerShape = useMemo(() => getPointsPerShape(isMobile), [isMobile]);

  // ==========================================================
  // FORMAS
  // ==========================================================

  const { shapes, edges } = useMemo(() => {
    return buildAllShapes(pointsPerShape, isMobile);
  }, [pointsPerShape, isMobile]);

  // ==========================================================
  // EXTENSÃO
  // ==========================================================

  const maxShapeExtentY = useMemo(() => {
    let maxAbsY = 0;

    for (const shape of shapes) {
      for (let i = 1; i < shape.length; i += 3) {
        const value = Math.abs(shape[i]);

        if (value > maxAbsY) {
          maxAbsY = value;
        }
      }
    }

    return maxAbsY > 0 ? maxAbsY * 2 : 1;
  }, [shapes]);

  const cameraDistance = camera.position.z;

  // ==========================================================
  // ESCALA MOBILE
  // ==========================================================

  const mobileFitScale = useMemo(() => {
    if (!isMobile) {
      return null;
    }

    const fullWorldHeight = getWorldViewportHeight(camera, cameraDistance);

    const reservedWorldHeight = fullWorldHeight * 0.35;

    const targetExtent = reservedWorldHeight * 1.2;

    return targetExtent / maxShapeExtentY;
  }, [isMobile, camera, cameraDistance, maxShapeExtentY]);

  // ==========================================================
  // POSIÇÃO MOBILE
  // ==========================================================

  const mobileBaseY = useMemo(() => {
    if (!isMobile) {
      return 0.5;
    }

    return worldYForScreenFraction(camera, 0.191, cameraDistance);
  }, [isMobile, camera, cameraDistance, size]);

  // ==========================================================
  // REFS
  // ==========================================================

  const pointsRef = useRef();

  const groupRef = useRef();

  const linesARef = useRef();

  const linesBRef = useRef();

  // ==========================================================
  // POSIÇÃO ATUAL
  // ==========================================================

  const current = useMemo(() => new Float32Array(shapes[0]), [shapes]);

  // ==========================================================
  // CORES
  // ==========================================================

  const colors = useMemo(() => {
    const array = new Float32Array(pointsPerShape * 3);

    for (let i = 0; i < pointsPerShape; i++) {
      const mix = (i % 5) / 5;

      const color = GOLD.clone().lerp(WHITE, mix * 0.5);

      color.toArray(array, i * 3);
    }

    return array;
  }, [pointsPerShape]);

  // ==========================================================
  // TEXTURA
  // ==========================================================

  const texture = useParticleTexture();

  useEffect(() => {
    return () => {
      if (texture) {
        texture.dispose();
      }
    };
  }, [texture]);

  // ==========================================================
  // MOUSE
  // ==========================================================

  const mouseNDC = useRef(new THREE.Vector2(9999, 9999));

  const mouseWorld = useRef(new THREE.Vector3());

  const raycaster = useMemo(() => new THREE.Raycaster(), []);

  const pickPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
    [],
  );

  const raycastHit = useRef(new THREE.Vector3());

  const lastFloor = useRef(-1);

  // ==========================================================
  // ÍNDICES INICIAIS
  // ==========================================================

  const initialIndexA = useMemo(() => {
    if (!edges || !edges[0]) {
      return null;
    }

    return new THREE.BufferAttribute(edges[0], 1);
  }, [edges]);

  const initialIndexB = useMemo(() => {
    const target = edges && edges.length > 1 ? 1 : 0;

    if (!edges || !edges[target]) {
      return null;
    }

    return new THREE.BufferAttribute(edges[target], 1);
  }, [edges]);

  // ==========================================================
  // MOUSE
  // ==========================================================

  useEffect(() => {
    const onMove = (event) => {
      mouseNDC.current.x = (event.clientX / size.width) * 2 - 1;

      mouseNDC.current.y = -(event.clientY / size.height) * 2 + 1;
    };

    const onLeave = () => {
      mouseNDC.current.set(9999, 9999);
    };

    window.addEventListener("pointermove", onMove, {
      passive: true,
    });

    window.addEventListener("pointerleave", onLeave);

    return () => {
      window.removeEventListener("pointermove", onMove);

      window.removeEventListener("pointerleave", onLeave);
    };
  }, [size]);

  // ==========================================================
  // ANIMAÇÃO
  // ==========================================================

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

    // ========================================================
    // INTERAÇÃO DESKTOP
    // ========================================================

    if (!isMobile) {
      raycaster.setFromCamera(mouseNDC.current, camera);

      const hit = raycastHit.current;

      const didHit = raycaster.ray.intersectPlane(pickPlane, hit);

      if (didHit && groupRef.current) {
        groupRef.current.worldToLocal(hit);

        mouseWorld.current.copy(hit);
      }
    }

    if (!pointsRef.current) {
      return;
    }

    // ========================================================
    // POSIÇÃO DAS PARTÍCULAS
    // ========================================================

    const posAttr = pointsRef.current.geometry.attributes.position;

    const arr = posAttr.array;

    const REPEL_RADIUS = 0.5;

    const REPEL_STRENGTH = 0.2;

    const isMouseActive = mouseNDC.current.x < 100;

    for (let i = 0; i < pointsPerShape; i++) {
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

    // ========================================================
    // ESCALA / POSIÇÃO
    // ========================================================

    if (groupRef.current) {
      const width = window.innerWidth;

      let extraScale = 1;

      if (width >= 1280 && width < 1500) {
        extraScale = 1.15;
      }

      if (width <= 1024 && width > 768) {
        extraScale = 0.75;
      }

      if (width <= 768) {
        extraScale = 0.6;
      }

      const baseScale = isMobile
        ? (mobileFitScale || responsiveScale) * extraScale
        : responsiveScale;

      const transitionPulse = Math.sin(frac * Math.PI);

      const targetScale = baseScale * (1 + transitionPulse * 0.4);

      const nextScale = THREE.MathUtils.lerp(
        groupRef.current.scale.x,
        targetScale,
        0.08,
      );

      groupRef.current.scale.setScalar(nextScale);

      // ------------------------------------------------------
      // PARTÍCULAS
      // Mantidas normais.
      // ------------------------------------------------------

      if (pointsRef.current) {
        const pointSize = isMobile ? 0.035 : 0.15;

        pointsRef.current.material.size =
          pointSize * (isMobile ? nextScale : 1);

        pointsRef.current.material.opacity = 1;
      }

      const baseY = isMobile ? mobileBaseY : 0.1;

      const baseX = isMobile ? 0 : 6.2;

      const floatOffset = Math.sin(time * 1.5) * 0.05;

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

    // ========================================================
    // ATUALIZA ÍNDICES
    // ========================================================

    if (floor !== lastFloor.current) {
      lastFloor.current = floor;

      const indexA = edges[Math.min(floor, edges.length - 1)];

      const indexB = edges[Math.min(floor + 1, edges.length - 1)];

      if (linesARef.current && indexA) {
        linesARef.current.geometry.setIndex(
          new THREE.BufferAttribute(indexA, 1),
        );
      }

      if (linesBRef.current && indexB) {
        linesBRef.current.geometry.setIndex(
          new THREE.BufferAttribute(indexB, 1),
        );
      }
    }

    // ========================================================
    // LINHAS
    //
    // TODAS usam a mesma lógica visual.
    // Isso significa que o cristal terá a mesma
    // espessura visual da carta.
    // ========================================================

    if (linesARef.current && linesBRef.current) {
      const lineOpacity = isMobile ? 0.12 : 0.05;

      linesARef.current.material.opacity = (1 - frac) * lineOpacity;

      linesBRef.current.material.opacity = frac * lineOpacity;

      linesARef.current.geometry.attributes.position.needsUpdate = true;

      linesBRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  // ==========================================================
  // ATRIBUTO COMPARTILHADO
  // ==========================================================

  const sharedPositionAttr = useMemo(
    () => new THREE.BufferAttribute(current, 3),
    [current],
  );

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <group
      ref={groupRef}
      position={isMobile ? [0, mobileBaseY, 0] : [6.2, 0.1, 0]}
      scale={isMobile ? mobileFitScale || responsiveScale : responsiveScale}
    >
      {/* ======================================================
          PARTÍCULAS
          ====================================================== */}

      <points ref={pointsRef}>
        <bufferGeometry>
          <primitive attach="attributes-position" object={sharedPositionAttr} />

          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>

        <pointsMaterial
          size={isMobile ? 0.035 : 0.15}
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

      {/* ======================================================
          LINHAS — FORMA ATUAL
          ====================================================== */}

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

      {/* ======================================================
          LINHAS — PRÓXIMA FORMA
          ====================================================== */}

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
