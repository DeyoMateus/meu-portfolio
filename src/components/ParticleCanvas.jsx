import { useEffect, useRef } from "react";
import * as THREE from "three";

export default function ParticleCanvas() {
  const mountRef = useRef(null);

  useEffect(() => {
    const currentMount = mountRef.current;
    if (!currentMount) return;

    // ==========================================
    // 0. CUSTOM SHADERS (Controle de Tamanho, Opacidade e Brilho GPU)
    // ==========================================
    const vertexShader = `
      attribute float size;
      attribute vec3 customColor;
      attribute float customAlpha;
      
      varying vec3 vColor;
      varying float vAlpha;
      
      void main() {
        vColor = customColor;
        vAlpha = customAlpha;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        gl_PointSize = size * (40.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `;

    const fragmentShader = `
      uniform sampler2D pointTexture;
      uniform float globalOpacity;
      
      varying vec3 vColor;
      varying float vAlpha;
      
      void main() {
        vec4 texColor = texture2D(pointTexture, gl_PointCoord);
        gl_FragColor = vec4(vColor, texColor.a * vAlpha * globalOpacity);
      }
    `;

    // Textura Starburst (Micro Raios Luminosos)
    const createSparkleTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext("2d");
      const cx = 64,
        cy = 64;

      const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14);
      grad.addColorStop(0, "rgba(255, 255, 255, 1)");
      grad.addColorStop(0.4, "rgba(255, 230, 160, 0.9)");
      grad.addColorStop(1, "rgba(255, 180, 50, 0)");
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(cx, cy, 14, 0, Math.PI * 2);
      ctx.fill();

      const drawRayPair = (angle, length, width) => {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(angle);

        const rayGrad = ctx.createLinearGradient(0, 0, length, 0);
        rayGrad.addColorStop(0, "rgba(255, 255, 255, 1)");
        rayGrad.addColorStop(0.3, "rgba(255, 220, 130, 0.8)");
        rayGrad.addColorStop(1, "rgba(255, 150, 0, 0)");

        ctx.fillStyle = rayGrad;
        ctx.beginPath();
        ctx.moveTo(0, -width / 2);
        ctx.lineTo(length, 0);
        ctx.lineTo(0, width / 2);
        ctx.closePath();
        ctx.fill();

        ctx.beginPath();
        ctx.moveTo(0, -width / 2);
        ctx.lineTo(-length, 0);
        ctx.lineTo(0, width / 2);
        ctx.closePath();
        ctx.fill();

        ctx.restore();
      };

      drawRayPair(0, 50, 3);
      drawRayPair(Math.PI / 2, 50, 3);
      drawRayPair(Math.PI / 4, 28, 2);
      drawRayPair(-Math.PI / 4, 28, 2);

      return new THREE.CanvasTexture(canvas);
    };

    // Textura com Núcleo Intenso e Aura Suave
    const createCoreGlowTexture = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 128;
      canvas.height = 128;
      const ctx = canvas.getContext("2d");

      const grad = ctx.createRadialGradient(64, 64, 0, 64, 64, 60);
      grad.addColorStop(0, "rgba(255, 255, 255, 1)"); // Núcleo hiper-brilhante
      grad.addColorStop(0.18, "rgba(255, 245, 210, 0.95)"); // Transição do núcleo
      grad.addColorStop(0.5, "rgba(255, 180, 50, 0.35)"); // Aura externa suave
      grad.addColorStop(1, "rgba(0, 0, 0, 0)"); // Desvanecimento
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(64, 64, 60, 0, Math.PI * 2);
      ctx.fill();

      return new THREE.CanvasTexture(canvas);
    };

    const sparkleTexture = createSparkleTexture();
    const coreTexture = createCoreGlowTexture();

    // ==========================================
    // 1. CENA E CÂMERA
    // ==========================================
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x020712);

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      150,
    );
    camera.position.set(0, 0, 15);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    currentMount.appendChild(renderer.domElement);

    const mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    const handleMouseMove = (event) => {
      mouse.targetX = (event.clientX / window.innerWidth - 0.5) * 1.5;
      mouse.targetY = -(event.clientY / window.innerHeight - 0.5) * 1.5;
    };
    window.addEventListener("mousemove", handleMouseMove);

    // Paleta de Cores
    const cWhite = new THREE.Color(0xffffff);
    const cGold = new THREE.Color(0xffd700);
    const cAmber = new THREE.Color(0xd47a15);
    const cDarkBlue = new THREE.Color(0x111c3a);

    // ==========================================
    // 2. PARTÍCULAS AMBIENTES (PROFUNDIDADE 3D + AURA PULSANTE)
    // ==========================================
    const NODE_COUNT = 280;
    const nodePositions = new Float32Array(NODE_COUNT * 3);
    const nodeColors = new Float32Array(NODE_COUNT * 3);
    const nodeAlphas = new Float32Array(NODE_COUNT);
    const nodeSizes = new Float32Array(NODE_COUNT);
    const nodeVelocities = [];

    for (let i = 0; i < NODE_COUNT; i++) {
      const z = (Math.random() - 0.5) * 32 - 4; // Distribuição profunda no eixo Z (-20 a +12)
      // Fator de camada de profundidade (0.1 = fundo distante, 1.0 = primeiro plano)
      const depthFactor = Math.max(0.15, (z + 20) / 32);

      nodePositions[i * 3] = (Math.random() - 0.5) * 60;
      nodePositions[i * 3 + 1] = (Math.random() - 0.5) * 28;
      nodePositions[i * 3 + 2] = z;

      const baseSize = (1.9 + Math.random() * 0.45) * (0.6 + depthFactor * 0.7);

      nodeSizes[i] = baseSize;
      nodeAlphas[i] = 0.8;
      nodeColors[i * 3] = cGold.r;
      nodeColors[i * 3 + 1] = cGold.g;
      nodeColors[i * 3 + 2] = cGold.b;

      nodeVelocities.push({
        phaseY: Math.random() * Math.PI * 2,
        pulseSpeed: 0.8 + Math.random() * 1.2, // Pulso lento e hipnótico
        speedY: (0.0004 + Math.random() * 0.0006) * depthFactor,
        baseSpeedX: (-0.0025 - Math.random() * 0.002) * depthFactor,
        depthFactor,
        baseSize,
      });
    }

    const nodeGeometry = new THREE.BufferGeometry();
    nodeGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(nodePositions, 3),
    );
    nodeGeometry.setAttribute(
      "customColor",
      new THREE.BufferAttribute(nodeColors, 3),
    );
    nodeGeometry.setAttribute(
      "customAlpha",
      new THREE.BufferAttribute(nodeAlphas, 1),
    );
    nodeGeometry.setAttribute("size", new THREE.BufferAttribute(nodeSizes, 1));

    const nodeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: coreTexture },
        globalOpacity: { value: 0.85 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const nodePoints = new THREE.Points(nodeGeometry, nodeMaterial);
    scene.add(nodePoints);

    // --- CAUDA DAS PARTÍCULAS (20% MAIOR NO SCROLL) ---
    const DOTS_PER_TAIL = 28;
    const TOTAL_TAIL_POINTS = NODE_COUNT * DOTS_PER_TAIL;

    const tailPositions = new Float32Array(TOTAL_TAIL_POINTS * 3);
    const tailColors = new Float32Array(TOTAL_TAIL_POINTS * 3);
    const tailAlphas = new Float32Array(TOTAL_TAIL_POINTS);
    const tailSizes = new Float32Array(TOTAL_TAIL_POINTS);

    for (let i = 0; i < TOTAL_TAIL_POINTS; i++) {
      tailSizes[i] = Math.random() * 1.8 + 0.4;
      tailAlphas[i] = 1.0;
    }

    const tailGeometry = new THREE.BufferGeometry();
    tailGeometry.setAttribute(
      "position",
      new THREE.BufferAttribute(tailPositions, 3),
    );
    tailGeometry.setAttribute(
      "customColor",
      new THREE.BufferAttribute(tailColors, 3),
    );
    tailGeometry.setAttribute(
      "customAlpha",
      new THREE.BufferAttribute(tailAlphas, 1),
    );
    tailGeometry.setAttribute("size", new THREE.BufferAttribute(tailSizes, 1));

    const tailMaterial = new THREE.ShaderMaterial({
      uniforms: {
        pointTexture: { value: sparkleTexture },
        globalOpacity: { value: 0.0 },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const tailPoints = new THREE.Points(tailGeometry, tailMaterial);
    scene.add(tailPoints);

    // ==========================================
    // 3. ESTRELAS CADENTES (COMETAS AFINADOS)
    // ==========================================
    const COMET_COUNT = 12;
    const comets = [];
    const COMET_TAIL_DOTS = 90;

    for (let c = 0; c < COMET_COUNT; c++) {
      const headGeo = new THREE.BufferGeometry();
      headGeo.setAttribute(
        "position",
        new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3),
      );
      const headMat = new THREE.PointsMaterial({
        map: coreTexture,
        color: 0xffffff,
        size: 1.3,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const headMesh = new THREE.Points(headGeo, headMat);
      scene.add(headMesh);

      const ctPos = new Float32Array(COMET_TAIL_DOTS * 3);
      const ctCol = new Float32Array(COMET_TAIL_DOTS * 3);
      const ctAlphas = new Float32Array(COMET_TAIL_DOTS);
      const ctSizes = new Float32Array(COMET_TAIL_DOTS);

      for (let k = 0; k < COMET_TAIL_DOTS; k++) {
        ctSizes[k] = Math.random() * 2.5 + 0.5;
      }

      const tailGeo = new THREE.BufferGeometry();
      tailGeo.setAttribute("position", new THREE.BufferAttribute(ctPos, 3));
      tailGeo.setAttribute("customColor", new THREE.BufferAttribute(ctCol, 3));
      tailGeo.setAttribute(
        "customAlpha",
        new THREE.BufferAttribute(ctAlphas, 1),
      );
      tailGeo.setAttribute("size", new THREE.BufferAttribute(ctSizes, 1));

      const tailMat = new THREE.ShaderMaterial({
        uniforms: {
          pointTexture: { value: sparkleTexture },
          globalOpacity: { value: 0.0 },
        },
        vertexShader,
        fragmentShader,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      const tailMesh = new THREE.Points(tailGeo, tailMat);
      scene.add(tailMesh);

      comets.push({
        headMesh,
        headMat,
        tailMesh,
        tailMat,
        tailGeo,
        ctPos,
        ctCol,
        ctAlphas,
        pos: new THREE.Vector3(30, 0, 0),
        velocity: new THREE.Vector3(0, 0, 0),
        active: false,
        lastSpawn: -c * 5,
      });
    }

    // ==========================================
    // 4. CONTROLADOR DE SCROLL DINÂMICO
    // ==========================================
    let targetSpeedModifier = 0;
    let currentSpeedModifier = 0;
    let lastScrollY = window.scrollY;
    let scrollTimeout;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const deltaY = currentScrollY - lastScrollY;
      lastScrollY = currentScrollY;

      if (deltaY > 0) targetSpeedModifier = 0.095;
      else if (deltaY < 0) targetSpeedModifier = -0.095;

      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        targetSpeedModifier = 0;
      }, 150);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener(
      "wheel",
      (e) => {
        targetSpeedModifier = Math.sign(e.deltaY) * 0.095;
        clearTimeout(scrollTimeout);
        scrollTimeout = setTimeout(() => {
          targetSpeedModifier = 0;
        }, 150);
      },
      { passive: true },
    );

    // ==========================================
    // 5. LOOP DE ANIMAÇÃO
    // ==========================================
    const clock = new THREE.Clock();
    let animationFrameId;
    const X_BOUNDS = 30;
    const tmpColor = new THREE.Color();

    function animate() {
      animationFrameId = requestAnimationFrame(animate);
      const time = clock.getElapsedTime();

      // Parallax do Mouse
      camera.position.x += (mouse.targetX - camera.position.x) * 0.04;
      camera.position.y += (mouse.targetY - camera.position.y) * 0.04;
      camera.lookAt(0, 0, 0);

      // Suavização do Scroll
      currentSpeedModifier +=
        (targetSpeedModifier - currentSpeedModifier) * 0.08;
      const scrollIntensity = Math.abs(currentSpeedModifier);
      const isScrolling = scrollIntensity > 0.005;

      // Cauda 20% maior no valor máximo (Aumentado de 0.55 para 0.66)
      const MAX_TAIL_LENGTH = 0.66;
      const baseTailLength = Math.min(scrollIntensity * 3.6, MAX_TAIL_LENGTH);

      // Opacidade responsiva ao movimento
      tailMaterial.uniforms.globalOpacity.value = Math.min(
        1.0,
        scrollIntensity * 7.5,
      );

      const nPos = nodeGeometry.attributes.position.array;
      const nCol = nodeGeometry.attributes.customColor.array;
      const nAlp = nodeGeometry.attributes.customAlpha.array;
      const nSiz = nodeGeometry.attributes.size.array;

      const tPos = tailGeometry.attributes.position.array;
      const tCol = tailGeometry.attributes.customColor.array;
      const tAlp = tailGeometry.attributes.customAlpha.array;
      const tSiz = tailGeometry.attributes.size.array;

      let tailIdx = 0;

      for (let i = 0; i < NODE_COUNT; i++) {
        const vel = nodeVelocities[i];

        // Efeito Parallax de Velocidade conforme a profundidade
        const moveX =
          (vel.baseSpeedX + currentSpeedModifier) *
          (0.6 + vel.depthFactor * 0.8);

        nPos[i * 3] += moveX;
        nPos[i * 3 + 1] += Math.sin(time + vel.phaseY) * vel.speedY;

        // Reposição contínua no espaço 3D
        if (nPos[i * 3] < -X_BOUNDS) {
          nPos[i * 3] = X_BOUNDS;
          nPos[i * 3 + 1] = (Math.random() - 0.5) * 28;
        } else if (nPos[i * 3] > X_BOUNDS) {
          nPos[i * 3] = -X_BOUNDS;
          nPos[i * 3 + 1] = (Math.random() - 0.5) * 28;
        }

        // --- MICRO PULSAR (AURA EXPONENCIAL + NÚCLEO ILUMINADO) ---
        // Onda de pulsação normalizada (0.0 a 1.0)
        const pulse = Math.sin(time * vel.pulseSpeed + vel.phaseY) * 0.5 + 0.5;

        // Aura expande em tamanho
        nSiz[i] = vel.baseSize * (1.0 + 0.5 * pulse);

        // Quando a aura alcança seu pico de pulso, o núcleo fica mais brilhante e branco
        const coreBrilliance = Math.pow(pulse, 2.0); // Curva mais acentuada de pico
        tmpColor.lerpColors(cGold, cWhite, coreBrilliance * 0.85);

        nCol[i * 3] = tmpColor.r;
        nCol[i * 3 + 1] = tmpColor.g;
        nCol[i * 3 + 2] = tmpColor.b;
        nAlp[i] = (0.65 + 0.35 * pulse) * (0.7 + vel.depthFactor * 0.3);

        // --- CAUDA DAS PARTÍCULAS (ANIMAÇÃO DE VIAGEM INTERESTELAR) ---
        const tailDir = moveX > 0 ? -1 : 1;
        // O comprimento da cauda escala com a profundidade da partícula
        const particleTailLength =
          baseTailLength * (0.5 + vel.depthFactor * 0.7);

        for (let d = 0; d < DOTS_PER_TAIL; d++) {
          const t = (d + 1) / DOTS_PER_TAIL;
          const distOnTail = t * particleTailLength * tailDir;

          const spreadFactor = Math.pow(t, 1.3) * 0.035;
          const jitterY = Math.sin(time * 6 + i + d * 0.2) * spreadFactor;
          const jitterZ = Math.cos(time * 6 + i + d * 0.2) * spreadFactor;

          tPos[tailIdx * 3] = nPos[i * 3] + distOnTail;
          tPos[tailIdx * 3 + 1] = nPos[i * 3 + 1] + jitterY;
          tPos[tailIdx * 3 + 2] = nPos[i * 3 + 2] + jitterZ;

          // Gradiente cromático espacial da cauda
          if (t < 0.2) tmpColor.lerpColors(cWhite, cGold, t / 0.2);
          else if (t < 0.65)
            tmpColor.lerpColors(cGold, cAmber, (t - 0.2) / 0.45);
          else tmpColor.lerpColors(cAmber, cDarkBlue, (t - 0.65) / 0.35);

          tCol[tailIdx * 3] = tmpColor.r;
          tCol[tailIdx * 3 + 1] = tmpColor.g;
          tCol[tailIdx * 3 + 2] = tmpColor.b;

          tSiz[tailIdx] =
            (1.1 + 0.3 * pulse) * (1 - t * 0.4) * (0.6 + vel.depthFactor * 0.6);
          tAlp[tailIdx] = Math.pow(1 - t, 0.8) * (0.5 + 0.5 * pulse);

          tailIdx++;
        }
      }

      nodeGeometry.attributes.position.needsUpdate = true;
      nodeGeometry.attributes.customColor.needsUpdate = true;
      nodeGeometry.attributes.customAlpha.needsUpdate = true;
      nodeGeometry.attributes.size.needsUpdate = true;

      tailGeometry.attributes.position.needsUpdate = true;
      tailGeometry.attributes.customColor.needsUpdate = true;
      tailGeometry.attributes.customAlpha.needsUpdate = true;
      tailGeometry.attributes.size.needsUpdate = true;

      // --- ESTRELAS CADENTES (COMETAS) ---
      comets.forEach((cObj, idx) => {
        if (
          time - cObj.lastSpawn > 6.0 + idx * 4.0 &&
          !cObj.active &&
          !isScrolling
        ) {
          cObj.active = true;
          cObj.lastSpawn = time;
          cObj.pos.set(
            X_BOUNDS,
            (Math.random() - 0.5) * 16,
            (Math.random() - 0.5) * 8,
          );
          const speed = 0.18 + Math.random() * 0.04;
          const angle = (Math.random() - 0.5) * (Math.PI / 5); // até ~18° pra cima ou pra baixo
          cObj.velocity.set(
            -Math.cos(angle) * speed, // sempre negativo -> mantém a mesma direção
            Math.sin(angle) * speed,
            0,
          );
        }

        if (isScrolling) {
          cObj.headMat.opacity = 0;
          cObj.tailMat.uniforms.globalOpacity.value = 0;
          if (cObj.pos.x < -X_BOUNDS) cObj.active = false;
        } else if (cObj.active) {
          cObj.headMat.opacity = 1.0;
          cObj.tailMat.uniforms.globalOpacity.value = 1.0;

          cObj.pos.add(cObj.velocity);

          const hPos = cObj.headMesh.geometry.attributes.position.array;
          hPos[0] = cObj.pos.x;
          hPos[1] = cObj.pos.y;
          hPos[2] = cObj.pos.z;
          cObj.headMesh.geometry.attributes.position.needsUpdate = true;

          // Direção normalizada do movimento: a cauda sempre aponta pro lado
          // OPOSTO de onde o cometa está indo. Com isso, quando o ângulo muda,
          // a cauda inclina junto — não fica mais presa à horizontal.
          const speed = cObj.velocity.length();
          const dirX = cObj.velocity.x / speed;
          const dirY = cObj.velocity.y / speed;

          const tailLen = 2.8;
          for (let k = 0; k < COMET_TAIL_DOTS; k++) {
            const t = (k + 1) / COMET_TAIL_DOTS;

            const spread = Math.pow(t, 1.6) * 0.075;
            const offsetY = (Math.random() - 0.5) * spread;
            const offsetZ = (Math.random() - 0.5) * spread;

            cObj.ctPos[k * 3] = cObj.pos.x - dirX * t * tailLen;
            cObj.ctPos[k * 3 + 1] = cObj.pos.y - dirY * t * tailLen + offsetY;
            cObj.ctPos[k * 3 + 2] = cObj.pos.z + offsetZ;

            if (t < 0.2) tmpColor.lerpColors(cWhite, cGold, t / 0.2);
            else if (t < 0.65)
              tmpColor.lerpColors(cGold, cAmber, (t - 0.2) / 0.45);
            else tmpColor.lerpColors(cAmber, cDarkBlue, (t - 0.65) / 0.35);

            cObj.ctCol[k * 3] = tmpColor.r;
            cObj.ctCol[k * 3 + 1] = tmpColor.g;
            cObj.ctCol[k * 3 + 2] = tmpColor.b;

            cObj.ctAlphas[k] = Math.pow(1 - t, 0.8);
          }

          cObj.tailGeo.attributes.position.needsUpdate = true;
          cObj.tailGeo.attributes.customColor.needsUpdate = true;
          cObj.tailGeo.attributes.customAlpha.needsUpdate = true;

          if (cObj.pos.x < -X_BOUNDS - 4) {
            cObj.active = false;
          }
        }
      });

      renderer.render(scene, camera);
    }

    animate();

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);

      if (currentMount && renderer.domElement) {
        currentMount.removeChild(renderer.domElement);
      }

      scene.clear();
      renderer.dispose();
      sparkleTexture.dispose();
      coreTexture.dispose();
      nodeGeometry.dispose();
      nodeMaterial.dispose();
      tailGeometry.dispose();
      tailMaterial.dispose();
    };
  }, []);

  return (
    <div
      ref={mountRef}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: "100vw",
        height: "100vh",
        zIndex: -1,
        pointerEvents: "none",
      }}
    />
  );
}
