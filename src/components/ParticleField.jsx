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
  const isMobile = useIsMobile(1280);
  const responsiveScale = useResponsiveScale();
  const { camera, size } = useThree();

  const pointsPerShape = useMemo(() => getPointsPerShape(isMobile), [isMobile]);

  const { shapes, edges } = useMemo(() => {
    return buildAllShapes(pointsPerShape);
  }, [pointsPerShape]);

  const maxShapeExtentY = useMemo(() => {
    let maxAbsY = 0;
    for (const shape of shapes) {
      for (let i = 1; i < shape.length; i += 3) {
        const ay = Math.abs(shape[i]);
        if (ay > maxAbsY) maxAbsY = ay;
      }
    }
    return maxAbsY > 0 ? maxAbsY * 2 : 1; // diâmetro vertical aproximado
  }, [shapes]);

  const cameraDistance = camera.position.z;

  const mobileFitScale = useMemo(() => {
    if (!isMobile) return null;
    const fullWorldHeight = getWorldViewportHeight(camera, cameraDistance);
    // Diminuímos o "respiro" para 0.28 (28%) para que o objeto fique ligeiramente
    // menor do que a área total de 35%, evitando bater no topo.
    const reservedWorldHeight = fullWorldHeight * 0.25;
    const targetExtent = reservedWorldHeight * 1.2;
    return targetExtent / maxShapeExtentY;
  }, [isMobile, camera, cameraDistance, maxShapeExtentY]);

  const mobileBaseY = useMemo(() => {
    if (!isMobile) return 0.5;

    // o 3D no meio da sua nova zona limite sem encostar em cima.
    return worldYForScreenFraction(camera, 0.191, cameraDistance);
  }, [isMobile, camera, cameraDistance, size]);

  const pointsRef = useRef();
  const groupRef = useRef();
  const linesARef = useRef();
  const linesBRef = useRef();

  const current = useMemo(() => new Float32Array(shapes[0]), [shapes]);

  const colors = useMemo(() => {
    const c = new Float32Array(pointsPerShape * 3);
    for (let i = 0; i < pointsPerShape; i++) {
      const mixAmt = (i % 5) / 5;
      const col = GOLD.clone().lerp(WHITE, mixAmt * 0.5);
      col.toArray(c, i * 3);
    }
    return c;
  }, [shapes, pointsPerShape]);

  const texture = useParticleTexture();
  useEffect(() => {
    return () => texture.dispose();
  }, [texture]);

  const lastFloor = useRef(-1);

  const mouseNDC = useRef(new THREE.Vector2(9999, 9999));
  const mouseWorld = useRef(new THREE.Vector3());
  const raycaster = useMemo(() => new THREE.Raycaster(), []);
  const pickPlane = useMemo(
    () => new THREE.Plane(new THREE.Vector3(0, 0, 1), 0),
    [],
  );
  const raycastHit = useRef(new THREE.Vector3());

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

      const hit = raycastHit.current;
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

    if (groupRef.current) {
      const width = window.innerWidth;
      let extraScale = 1;
      if (width >= 1280 && width < 1500) extraScale = 1.15;
      if (width <= 1024 && width > 768) extraScale = 0.75;
      if (width <= 768) extraScale = 0.6;

      const baseScale = isMobile
        ? (mobileFitScale || responsiveScale) * extraScale
        : responsiveScale;

      const pulseAmplitude = isMobile ? 0.4 : 0.4;
      const transitionPulse = Math.sin(frac * Math.PI);
      const targetScale = baseScale * (1 + transitionPulse * pulseAmplitude);
      const nextScale = THREE.MathUtils.lerp(
        groupRef.current.scale.x,
        targetScale,
        0.08,
      );
      groupRef.current.scale.setScalar(nextScale);

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
      position={isMobile ? [0, mobileBaseY, 0] : [6.2, 0.1, 0]}
      scale={isMobile ? mobileFitScale || responsiveScale : responsiveScale}
    >
      <points ref={pointsRef}>
        <bufferGeometry>
          <primitive attach="attributes-position" object={sharedPositionAttr} />
          <bufferAttribute attach="attributes-color" args={[colors, 3]} />
        </bufferGeometry>
        <pointsMaterial
          size={isMobile ? 0.1 : 0.15}
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
