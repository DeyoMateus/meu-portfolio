export const DESKTOP_POINTS_PER_SHAPE = 1300;
export const MOBILE_POINTS_PER_SHAPE = 700;
export const POINTS_PER_SHAPE = DESKTOP_POINTS_PER_SHAPE;
export const V_POINTS_COUNT = 200;

export function getPointsPerShape(isMobile) {
  return isMobile ? MOBILE_POINTS_PER_SHAPE : DESKTOP_POINTS_PER_SHAPE;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function createSeededRandom(seed) {
  let s = seed;
  return function () {
    s = (s * 9301 + 49297) % 233280;
    return s / 233280;
  };
}

// ==========================================
// 1. LOGO FVF (DESKTOP)
// ==========================================
function generateLogoPositions(count) {
  const random = createSeededRandom(1337);
  const pos = new Float32Array(count * 3);

  const allSegments = [
    [
      [-1.05, 2.05, 0],
      [0.08, 0.42, 0],
    ],
    [
      [1.15, 1.95, 0],
      [0.08, 0.42, 0],
    ],
    [
      [-1.9, 1.3, 0],
      [0.85, -2.5, 0],
    ],
    [
      [-1.9, 1.3, 0],
      [-2.9, 0.15, 0],
    ],
    [
      [-0.95, -0.05, 0],
      [-1.9, -1.0, 0],
    ],
    [
      [1.95, 1.2, 0],
      [-0.85, -2.35, 0],
    ],
    [
      [1.95, 1.2, 0],
      [2.85, 0.05, 0],
    ],
    [
      [0.88, -0.1, 0],
      [1.78, -1.1, 0],
    ],
  ];

  const lengths = allSegments.map((seg, s) => {
    const dx = seg[1][0] - seg[0][0];
    const dy = seg[1][1] - seg[0][1];
    let len = Math.hypot(dx, dy);
    if (s === 0 || s === 1 || s === 3 || s === 6) len *= 1.6;
    return len;
  });

  const totalLength = lengths.reduce((a, b) => a + b, 0);
  const ribbonWidth = 0.55;
  let currentPoint = 0;

  for (let s = 0; s < allSegments.length; s++) {
    const seg = allSegments[s];
    const isLast = s === allSegments.length - 1;
    const ptsForSeg = isLast
      ? count - currentPoint
      : Math.round((lengths[s] / totalLength) * count);

    const dx = seg[1][0] - seg[0][0];
    const dy = seg[1][1] - seg[0][1];
    const len = lengths[s] || 1;
    const nx = -dy / len;
    const ny = dx / len;

    for (let j = 0; j < ptsForSeg; j++) {
      if (currentPoint >= count) break;
      const t = random();
      const xBase = lerp(seg[0][0], seg[1][0], t);
      const yBase = lerp(seg[0][1], seg[1][1], t);
      const offset = (random() - 0.5) * ribbonWidth;
      const jitter = (random() - 0.5) * 0.02;

      pos[currentPoint * 3] = xBase + nx * offset + jitter;
      pos[currentPoint * 3 + 1] = yBase + ny * offset + jitter;
      pos[currentPoint * 3 + 2] = (random() - 0.5) * 0.12;
      currentPoint++;
    }
  }

  return pos;
}

// ==========================================
// 1.1. LOGO FVF (MOBILE - Lógica da Carta)
// ==========================================
// CORREÇÃO VAZAMENTO: a versão anterior preenchia a "área" da logo com
// triângulos apontando pro centro [0,0,0]. Como a logo é um traço fino
// (V/X), não uma forma sólida, esses triângulos eram bem mais largos que
// o próprio traço — daí a nuvem de partículas escapando pra fora do
// desenho. Agora, IGUAL à lógica de segmento único do diamante/envelope,
// toda partícula (tanto a fase de aresta quanto a de preenchimento) fica
// restrita à faixa (ribbon) do PRÓPRIO traço — nunca sai da linha.
function generateLogoPositionsMobile(count) {
  const pos = new Float32Array(count * 3);
  const segIds = new Int32Array(count);

  const allSegments = [
    [
      [-1.05, 2.05, 0],
      [0.08, 0.42, 0],
    ],
    [
      [1.15, 1.95, 0],
      [0.08, 0.42, 0],
    ],
    [
      [-1.9, 1.3, 0],
      [0.85, -2.5, 0],
    ],
    [
      [-1.9, 1.3, 0],
      [-2.9, 0.15, 0],
    ],
    [
      [-0.95, -0.05, 0],
      [-1.9, -1.0, 0],
    ],
    [
      [1.95, 1.2, 0],
      [-0.85, -2.35, 0],
    ],
    [
      [1.95, 1.2, 0],
      [2.85, 0.05, 0],
    ],
    [
      [0.88, -0.1, 0],
      [1.78, -1.1, 0],
    ],
  ];

  const lengths = allSegments.map((seg, s) => {
    const dx = seg[1][0] - seg[0][0];
    const dy = seg[1][1] - seg[0][1];
    let len = Math.hypot(dx, dy);
    if (s === 0 || s === 1 || s === 3 || s === 6) len *= 1.6;
    return len;
  });
  const totalLength = lengths.reduce((a, b) => a + b, 0);

  // Fase 1 (aresta): núcleo fino e nítido do traço, alinhado à linha.
  // Fase 2 (preenchimento): dá "corpo"/brilho ao traço, mas ainda presa à
  // faixa (ribbon) do mesmo segmento — nunca alcança o centro da forma.
  const EDGE_RATIO = 0.65;
  const edgeCount = Math.floor(count * EDGE_RATIO);
  const fillCount = count - edgeCount;
  const edgeRibbonWidth = 0.14;
  const fillRibbonWidth = 0.5;

  let currentPoint = 0;

  for (let s = 0; s < allSegments.length; s++) {
    const seg = allSegments[s];
    const isLast = s === allSegments.length - 1;
    const ptsForSeg = isLast
      ? edgeCount - currentPoint
      : Math.round((lengths[s] / totalLength) * edgeCount);

    const dx = seg[1][0] - seg[0][0];
    const dy = seg[1][1] - seg[0][1];
    const len = lengths[s] || 1;
    const nx = -dy / len;
    const ny = dx / len;

    for (let j = 0; j < ptsForSeg; j++) {
      if (currentPoint >= edgeCount) break;
      const t = j / Math.max(1, ptsForSeg - 1);
      const offset = (Math.random() - 0.5) * edgeRibbonWidth;

      pos[currentPoint * 3] = lerp(seg[0][0], seg[1][0], t) + nx * offset;
      pos[currentPoint * 3 + 1] = lerp(seg[0][1], seg[1][1], t) + ny * offset;
      pos[currentPoint * 3 + 2] = (Math.random() - 0.5) * 0.05;
      segIds[currentPoint] = s;
      currentPoint++;
    }
  }

  for (let s = 0; s < allSegments.length; s++) {
    const seg = allSegments[s];
    const isLast = s === allSegments.length - 1;
    const ptsForSeg = isLast
      ? count - currentPoint
      : Math.round((lengths[s] / totalLength) * fillCount);

    const dx = seg[1][0] - seg[0][0];
    const dy = seg[1][1] - seg[0][1];
    const len = lengths[s] || 1;
    const nx = -dy / len;
    const ny = dx / len;

    for (let j = 0; j < ptsForSeg; j++) {
      if (currentPoint >= count) break;
      const t = Math.random();
      const offset = (Math.random() - 0.5) * fillRibbonWidth;

      pos[currentPoint * 3] = lerp(seg[0][0], seg[1][0], t) + nx * offset;
      pos[currentPoint * 3 + 1] = lerp(seg[0][1], seg[1][1], t) + ny * offset;
      pos[currentPoint * 3 + 2] = (Math.random() - 0.5) * 0.1;
      segIds[currentPoint] = s;
      currentPoint++;
    }
  }

  return { positions: pos, segIds };
}

// Igual ao princípio usado no diamante/envelope: só conecta pontos que
// pertencem ao MESMO traço (segId). Como aqui não existe mais uma "zona de
// preenchimento" compartilhada (cada ponto, de aresta ou preenchimento,
// pertence a um único traço), não precisamos do parâmetro extra de
// distância pra fill — um único limiar já garante que nenhuma linha
// atravesse de um traço pro outro.
function buildEdgesForLogoMobile(pos, segIds, maxDist = 0.3) {
  const indices = [];
  forEachNearbyPair(pos, maxDist, (i, j) => {
    if (segIds[i] !== segIds[j]) return;
    indices.push(i, j);
  });
  return new Uint16Array(indices);
}

// ==========================================
// 2. CRISTAL / QUARTZO (Usa lógica de segmentos e malhas estruturadas)
// ==========================================
function transformPoint(pt, center, rot) {
  let [x, y, z] = pt;
  const [rx, ry, rz] = rot;
  let x1 = x * Math.cos(rz) - y * Math.sin(rz);
  let y1 = x * Math.sin(rz) + y * Math.cos(rz);
  let z1 = z;
  let y2 = y1 * Math.cos(rx) - z1 * Math.sin(rx);
  let z2 = y1 * Math.sin(rx) + z1 * Math.cos(rx);
  let x3 = x1 * Math.cos(ry) + z2 * Math.sin(ry);
  let y3 = y2;
  let z3 = -x1 * Math.sin(ry) + z2 * Math.cos(ry);
  return [x3 + center[0], y3 + center[1], z3 + center[2]];
}

function generateDiamondPositions(count) {
  const pos = new Float32Array(count * 3);
  const segIds = new Int32Array(count);

  const crystalSpecs = [
    [0.0, -1.25, 0.0, 0.45, 2.2, 0.8, 0.0, 0.0, 0.0],
    [0.38, -1.25, 0.1, 0.36, 1.9, 0.7, 0.1, 0.2, -0.52],
    [0.78, -1.25, -0.1, 0.28, 1.5, 0.6, -0.1, 0.3, -0.85],
    [-0.48, -1.25, 0.2, 0.34, 1.6, 0.6, 0.2, -0.2, 0.48],
    [-0.72, -1.25, -0.2, 0.28, 1.4, 0.55, -0.2, -0.3, 0.72],
    [0.05, -1.25, 0.38, 0.32, 1.1, 0.5, 0.45, 0.1, -0.1],
    [-0.88, -1.25, 0.1, 0.24, 1.1, 0.45, 0.3, -0.4, 0.92],
  ];

  const diamondSegments = [];
  const triangles = [];

  crystalSpecs.forEach((spec) => {
    const [cx, cy, cz, r, hb, ht, rx, ry, rz] = spec;
    const center = [cx, cy, cz];
    const rot = [rx, ry, rz];
    const sides = 6;
    const baseV = [];
    const shV = [];
    for (let i = 0; i < sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const bx = Math.cos(angle) * r;
      const bz = Math.sin(angle) * r;
      baseV.push(transformPoint([bx, 0, bz], center, rot));
      shV.push(transformPoint([bx, hb, bz], center, rot));
    }
    const tipV = transformPoint([0, hb + ht, 0], center, rot);

    for (let i = 0; i < sides; i++) {
      const next = (i + 1) % sides;
      diamondSegments.push([baseV[i], baseV[next]]);
      diamondSegments.push([shV[i], shV[next]]);
      diamondSegments.push([baseV[i], shV[i]]);
      diamondSegments.push([shV[i], tipV]);
    }

    for (let i = 0; i < sides; i++) {
      const next = (i + 1) % sides;
      triangles.push([shV[i], shV[next], tipV]);
      triangles.push([baseV[i], shV[i], shV[next]]);
      triangles.push([baseV[i], shV[next], baseV[next]]);
    }
  });

  const edgeCount = Math.floor(count * 0.9);
  const fillCount = count - edgeCount;
  const lengths = diamondSegments.map((seg) => {
    const dx = seg[1][0] - seg[0][0];
    const dy = seg[1][1] - seg[0][1];
    const dz = seg[1][2] - seg[0][2];
    return Math.hypot(dx, dy, dz) || 0.003;
  });
  const totalLength = lengths.reduce((a, b) => a + b, 0);

  let currentPoint = 0;
  for (let s = 0; s < diamondSegments.length; s++) {
    const isLast = s === diamondSegments.length - 1;
    const ptsForSeg = isLast
      ? edgeCount - currentPoint
      : Math.max(1, Math.round((lengths[s] / totalLength) * edgeCount));
    const seg = diamondSegments[s];

    for (let j = 0; j < ptsForSeg; j++) {
      if (currentPoint >= edgeCount) break;
      const t = ptsForSeg > 1 ? j / (ptsForSeg - 1) : 0.5;

      pos[currentPoint * 3] =
        lerp(seg[0][0], seg[1][0], t) + (Math.random() - 0.5) * 0.002;
      pos[currentPoint * 3 + 1] =
        lerp(seg[0][1], seg[1][1], t) + (Math.random() - 0.5) * 0.002;
      pos[currentPoint * 3 + 2] =
        lerp(seg[0][2], seg[1][2], t) + (Math.random() - 0.5) * 0.002;
      segIds[currentPoint] = s;
      currentPoint++;
    }
  }

  let idx = edgeCount * 3;
  const fillSegId = diamondSegments.length;
  for (let i = 0; i < fillCount; i++) {
    const tri = triangles[i % triangles.length];
    let r1 = Math.random();
    let r2 = Math.random();
    if (r1 + r2 > 1) {
      r1 = 1 - r1;
      r2 = 1 - r2;
    }
    const r3 = 1 - r1 - r2;

    const pIdx = edgeCount + i;
    pos[idx] =
      r1 * tri[0][0] +
      r2 * tri[1][0] +
      r3 * tri[2][0] +
      (Math.random() - 0.5) * 0.004;
    pos[idx + 1] =
      r1 * tri[0][1] +
      r2 * tri[1][1] +
      r3 * tri[2][1] +
      (Math.random() - 0.5) * 0.004;
    pos[idx + 2] =
      r1 * tri[0][2] +
      r2 * tri[1][2] +
      r3 * tri[2][2] +
      (Math.random() - 0.5) * 0.004;
    segIds[pIdx] = fillSegId;
    idx += 3;
  }

  return { positions: pos, segIds };
}

// ==========================================
// 3. ESFERA
// ==========================================
function generateSpherePositions(count) {
  const pos = new Float32Array(count * 3);
  const radiusOuter = 2.3;
  const radiusInner = 1.95;
  const phi = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const isInner = i % 4 === 0;
    const r = isInner ? radiusInner : radiusOuter;
    const y = 1 - (i / (count - 1)) * 2;
    const radiusAtY = Math.sqrt(1 - y * y);
    const theta = phi * i;

    pos[i * 3] =
      Math.cos(theta) * radiusAtY * r + (Math.random() - 0.5) * 0.035;
    pos[i * 3 + 1] = y * r + (Math.random() - 0.5) * 0.035;
    pos[i * 3 + 2] =
      Math.sin(theta) * radiusAtY * r + (Math.random() - 0.5) * 0.035;
  }
  return pos;
}

// ==========================================
// 4. INFINITO (DESKTOP)
// ==========================================
function generateInfinityPositions(count) {
  const pos = new Float32Array(count * 3);
  const scale = 2.5;
  const ribbonWidth = 0.7;

  for (let i = 0; i < count; i++) {
    const t = Math.random() * Math.PI * 2;
    const factor = 2 / (3 - Math.cos(2 * t));
    const x = factor * Math.cos(t) * scale;
    const y = ((factor * Math.sin(2 * t)) / 2) * scale;

    const dt = 0.005;
    const factorNext = 2 / (3 - Math.cos(2 * (t + dt)));
    const xNext = factorNext * Math.cos(t + dt) * scale;
    const yNext = ((factorNext * Math.sin(2 * (t + dt))) / 2) * scale;

    const tx = xNext - x;
    const ty = yNext - y;
    const tLen = Math.hypot(tx, ty) || 1;
    const nx = -ty / tLen;
    const ny = tx / tLen;

    const offset = (Math.random() - 0.5) * ribbonWidth;
    pos[i * 3] = x + nx * offset + (Math.random() - 0.5) * 0.02;
    pos[i * 3 + 1] = y + ny * offset + (Math.random() - 0.5) * 0.02;
    pos[i * 3 + 2] = (Math.random() - 0.5) * 0.15;
  }
  return pos;
}

// ==========================================
// 4.1. INFINITO (MOBILE - Lógica da Carta)
// ==========================================
function generateInfinityPositionsMobile(count) {
  const pos = new Float32Array(count * 3);
  const segIds = new Int32Array(count);
  const scale = 2.2;
  const numSegments = 32;
  const infinitySegments = [];

  const pts = [];
  for (let i = 0; i <= numSegments; i++) {
    const t = (i / numSegments) * Math.PI * 2;
    const factor = 2 / (3 - Math.cos(2 * t));
    const x = factor * Math.cos(t) * scale;
    const y = ((factor * Math.sin(2 * t)) / 2) * scale;
    pts.push([x, y, 0]);
  }

  for (let i = 0; i < numSegments; i++) {
    infinitySegments.push([pts[i], pts[i + 1]]);
  }

  const edgeCount = Math.floor(count * 0.7);
  const fillCount = count - edgeCount;

  let currentPoint = 0;
  for (let s = 0; s < infinitySegments.length; s++) {
    const isLast = s === infinitySegments.length - 1;
    const ptsForSeg = isLast
      ? edgeCount - currentPoint
      : Math.max(1, Math.floor(edgeCount / infinitySegments.length));
    const seg = infinitySegments[s];

    for (let j = 0; j < ptsForSeg; j++) {
      if (currentPoint >= edgeCount) break;
      const t = j / Math.max(1, ptsForSeg - 1);

      pos[currentPoint * 3] =
        lerp(seg[0][0], seg[1][0], t) + (Math.random() - 0.5) * 0.005;
      pos[currentPoint * 3 + 1] =
        lerp(seg[0][1], seg[1][1], t) + (Math.random() - 0.5) * 0.005;
      pos[currentPoint * 3 + 2] =
        lerp(seg[0][2], seg[1][2], t) + (Math.random() - 0.5) * 0.005;
      segIds[currentPoint] = s;
      currentPoint++;
    }
  }

  const center1 = [1.1, 0, 0];
  const center2 = [-1.1, 0, 0];
  const triangles = [];
  for (let i = 0; i < numSegments; i += 2) {
    triangles.push([pts[i], pts[(i + 1) % numSegments], center1]);
    triangles.push([pts[i], pts[(i + 1) % numSegments], center2]);
  }

  let idx = edgeCount * 3;
  const fillSegId = infinitySegments.length;
  for (let i = 0; i < fillCount; i++) {
    const tri = triangles[i % triangles.length];
    let r1 = Math.random();
    let r2 = Math.random();
    if (r1 + r2 > 1) {
      r1 = 1 - r1;
      r2 = 1 - r2;
    }
    const r3 = 1 - r1 - r2;

    const pIdx = edgeCount + i;
    pos[idx] =
      r1 * tri[0][0] +
      r2 * tri[1][0] +
      r3 * tri[2][0] +
      (Math.random() - 0.5) * 0.01;
    pos[idx + 1] =
      r1 * tri[0][1] +
      r2 * tri[1][1] +
      r3 * tri[2][1] +
      (Math.random() - 0.5) * 0.01;
    pos[idx + 2] = (Math.random() - 0.5) * 0.04;
    segIds[pIdx] = fillSegId;
    idx += 3;
  }

  return { positions: pos, segIds };
}

function buildEdgesForInfinityMobile(
  pos,
  segIds,
  maxDistEdge = 0.28,
  maxDistFill = 0.22,
) {
  const indices = [];
  let fillSegId = 0;
  for (let i = 0; i < segIds.length; i++) {
    if (segIds[i] > fillSegId) fillSegId = segIds[i];
  }

  const searchRadius = Math.max(maxDistEdge, maxDistFill);
  forEachNearbyPair(pos, searchRadius, (i, j) => {
    const segI = segIds[i];
    const segJ = segIds[j];
    if (segI < fillSegId && segJ < fillSegId && segI !== segJ) return;

    const dx = pos[i * 3] - pos[j * 3];
    const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
    const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
    const dist = Math.hypot(dx, dy, dz);
    const limitDist =
      segI === fillSegId || segJ === fillSegId ? maxDistFill : maxDistEdge;

    if (dist < limitDist) indices.push(i, j);
  });

  return new Uint16Array(indices);
}

// ==========================================
// 5. CARTA / ENVELOPE
// ==========================================
function generateEnvelopePositions(count) {
  const pos = new Float32Array(count * 3);
  const segIds = new Int32Array(count);

  const topLeft = [-1.8, 1.1, 0.0];
  const topRight = [1.8, 1.1, 0.0];
  const bottomRight = [1.8, -1.1, 0.0];
  const bottomLeft = [-1.8, -1.1, 0.0];
  const center = [0.0, -0.2, 0.0];

  const envelopeSegments = [
    [topLeft, topRight],
    [topRight, bottomRight],
    [bottomRight, bottomLeft],
    [bottomLeft, topLeft],
    [topLeft, center],
    [topRight, center],
  ];

  const edgeCount = Math.floor(count * 0.6);
  const fillCount = count - edgeCount;

  let currentPoint = 0;
  for (let s = 0; s < envelopeSegments.length; s++) {
    const isLast = s === envelopeSegments.length - 1;
    const ptsForSeg = isLast
      ? edgeCount - currentPoint
      : Math.floor(edgeCount / envelopeSegments.length);
    const seg = envelopeSegments[s];

    for (let j = 0; j < ptsForSeg; j++) {
      if (currentPoint >= edgeCount) break;
      const t = j / Math.max(1, ptsForSeg - 1);

      pos[currentPoint * 3] =
        lerp(seg[0][0], seg[1][0], t) + (Math.random() - 0.5) * 0.01;
      pos[currentPoint * 3 + 1] =
        lerp(seg[0][1], seg[1][1], t) + (Math.random() - 0.5) * 0.01;
      pos[currentPoint * 3 + 2] =
        lerp(seg[0][2], seg[1][2], t) + (Math.random() - 0.5) * 0.01;
      segIds[currentPoint] = s;
      currentPoint++;
    }
  }

  const triangles = [
    [topLeft, topRight, center],
    [topLeft, bottomLeft, center],
    [topRight, bottomRight, center],
    [bottomLeft, bottomRight, center],
  ];

  let idx = edgeCount * 3;
  for (let i = 0; i < fillCount; i++) {
    const tri = triangles[i % triangles.length];
    let r1 = Math.random();
    let r2 = Math.random();
    if (r1 + r2 > 1) {
      r1 = 1 - r1;
      r2 = 1 - r2;
    }
    const r3 = 1 - r1 - r2;

    const pIdx = edgeCount + i;
    pos[idx] =
      r1 * tri[0][0] +
      r2 * tri[1][0] +
      r3 * tri[2][0] +
      (Math.random() - 0.5) * 0.015;
    pos[idx + 1] =
      r1 * tri[0][1] +
      r2 * tri[1][1] +
      r3 * tri[2][1] +
      (Math.random() - 0.5) * 0.015;
    pos[idx + 2] = (Math.random() - 0.5) * 0.05;
    segIds[pIdx] = 6;
    idx += 3;
  }
  return { positions: pos, segIds };
}

function buildEdgesForEnvelope(
  pos,
  segIds,
  maxDistEdge = 0.28,
  maxDistFill = 0.22,
) {
  const indices = [];
  const searchRadius = Math.max(maxDistEdge, maxDistFill);

  forEachNearbyPair(pos, searchRadius, (i, j) => {
    const segI = segIds[i];
    const segJ = segIds[j];
    if (segI < 6 && segJ < 6 && segI !== segJ) return;

    const dx = pos[i * 3] - pos[j * 3];
    const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
    const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
    const dist = Math.hypot(dx, dy, dz);
    const limitDist = segI === 6 || segJ === 6 ? maxDistFill : maxDistEdge;

    if (dist < limitDist) indices.push(i, j);
  });

  return new Uint16Array(indices);
}

function buildSpatialGrid(pos, cellSize) {
  const totalPoints = pos.length / 3;
  const grid = new Map();
  const keyOf = (cx, cy, cz) => `${cx}_${cy}_${cz}`;

  for (let i = 0; i < totalPoints; i++) {
    const cx = Math.floor(pos[i * 3] / cellSize);
    const cy = Math.floor(pos[i * 3 + 1] / cellSize);
    const cz = Math.floor(pos[i * 3 + 2] / cellSize);
    const key = keyOf(cx, cy, cz);
    let bucket = grid.get(key);
    if (!bucket) {
      bucket = [];
      grid.set(key, bucket);
    }
    bucket.push(i);
  }
  return { grid, keyOf };
}

function forEachNearbyPair(pos, maxDist, onPair) {
  const totalPoints = pos.length / 3;
  const cellSize = maxDist;
  const { grid, keyOf } = buildSpatialGrid(pos, cellSize);
  const maxDistSq = maxDist * maxDist;

  for (let i = 0; i < totalPoints; i++) {
    const cx = Math.floor(pos[i * 3] / cellSize);
    const cy = Math.floor(pos[i * 3 + 1] / cellSize);
    const cz = Math.floor(pos[i * 3 + 2] / cellSize);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const bucket = grid.get(keyOf(cx + dx, cy + dy, cz + dz));
          if (!bucket) continue;
          for (let bi = 0; bi < bucket.length; bi++) {
            const j = bucket[bi];
            if (j <= i) continue;
            const ddx = pos[i * 3] - pos[j * 3];
            const ddy = pos[i * 3 + 1] - pos[j * 3 + 1];
            const ddz = pos[i * 3 + 2] - pos[j * 3 + 2];
            const distSq = ddx * ddx + ddy * ddy + ddz * ddz;
            if (distSq < maxDistSq) onPair(i, j);
          }
        }
      }
    }
  }
}

function buildEdgesForDiamond(
  pos,
  segIds,
  maxDistEdge = 0.32,
  maxDistFill = 0.22,
) {
  const totalPoints = pos.length / 3;
  let fillSegId = 0;
  for (let i = 0; i < totalPoints; i++) {
    if (segIds[i] > fillSegId) fillSegId = segIds[i];
  }

  const indices = [];
  const searchRadius = Math.max(maxDistEdge, maxDistFill);

  forEachNearbyPair(pos, searchRadius, (i, j) => {
    const segI = segIds[i];
    const segJ = segIds[j];
    if (segI < fillSegId && segJ < fillSegId && segI !== segJ) return;

    const dx = pos[i * 3] - pos[j * 3];
    const dy = pos[i * 3 + 1] - pos[j * 3 + 1];
    const dz = pos[i * 3 + 2] - pos[j * 3 + 2];
    const dist = Math.hypot(dx, dy, dz);
    const limitDist =
      segI === fillSegId || segJ === fillSegId ? maxDistFill : maxDistEdge;

    if (dist < limitDist) indices.push(i, j);
  });

  return new Uint16Array(indices);
}

function buildEdgesForShape(pos, maxDist = 0.4) {
  const indices = [];
  forEachNearbyPair(pos, maxDist, (i, j) => {
    indices.push(i, j);
  });
  return new Uint16Array(indices);
}

// ==========================================
// EXPORTAÇÃO PRINCIPAL
// ==========================================
export function buildAllShapes(
  count = DESKTOP_POINTS_PER_SHAPE,
  isMobile = false,
) {
  if (isMobile) {
    const logoData = generateLogoPositionsMobile(count);
    const shape1 = logoData.positions;
    const edge1 = buildEdgesForLogoMobile(
      logoData.positions,
      logoData.segIds,
      0.32,
      0.22,
    );

    const diamondData = generateDiamondPositions(count);
    const shape2 = diamondData.positions;
    const edge2 = buildEdgesForDiamond(
      diamondData.positions,
      diamondData.segIds,
      0.32,
      0.22,
    );

    const shape3 = generateSpherePositions(count);
    const edge3 = buildEdgesForShape(shape3, 0.45);

    const infinityData = generateInfinityPositionsMobile(count);
    const shape4 = infinityData.positions;
    const edge4 = buildEdgesForInfinityMobile(
      infinityData.positions,
      infinityData.segIds,
      0.32,
      0.22,
    );

    const envelopeData = generateEnvelopePositions(count);
    const shape5 = envelopeData.positions;
    const edge5 = buildEdgesForEnvelope(
      envelopeData.positions,
      envelopeData.segIds,
      0.28,
      0.22,
    );

    return {
      shapes: [shape1, shape2, shape3, shape4, shape5],
      edges: [edge1, edge2, edge3, edge4, edge5],
      pointsPerShape: count,
    };
  } else {
    const shape1 = generateLogoPositions(count);
    const edge1 = buildEdgesForShape(shape1, 0.42);

    const diamondData = generateDiamondPositions(count);
    const shape2 = diamondData.positions;
    const edge2 = buildEdgesForDiamond(
      diamondData.positions,
      diamondData.segIds,
      0.32,
      0.22,
    );

    const shape3 = generateSpherePositions(count);
    const edge3 = buildEdgesForShape(shape3, 0.45);

    const shape4 = generateInfinityPositions(count);
    const edge4 = buildEdgesForShape(shape4, 0.35);

    const envelopeData = generateEnvelopePositions(count);
    const shape5 = envelopeData.positions;
    const edge5 = buildEdgesForEnvelope(
      envelopeData.positions,
      envelopeData.segIds,
      0.28,
      0.22,
    );

    return {
      shapes: [shape1, shape2, shape3, shape4, shape5],
      edges: [edge1, edge2, edge3, edge4, edge5],
      pointsPerShape: count,
    };
  }
}
