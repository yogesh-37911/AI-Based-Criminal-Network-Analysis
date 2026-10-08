"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { api } from "@/lib/api";

/* ─── Entity Type Metadata ────────────────────────────────────────────────── */
export const TYPE_META: Record<
  string,
  { hex: number; color: string; label: string; layer: number; tier: string }
> = {
  PERSON: {
    hex: 0x3fd0dc,
    color: "#3FD0DC",
    label: "Person",
    layer: 40,
    tier: "Identities",
  },
  ORGANIZATION: {
    hex: 0xf59e0b,
    color: "#F59E0B",
    label: "Organization",
    layer: 40,
    tier: "Identities",
  },
  PHONE_NUMBER: {
    hex: 0x4caf7d,
    color: "#4CAF7D",
    label: "Phone",
    layer: 0,
    tier: "Comms & Digital",
  },
  EMAIL: {
    hex: 0x4caf7d,
    color: "#4CAF7D",
    label: "Email",
    layer: 0,
    tier: "Comms & Digital",
  },
  IP_ADDRESS: {
    hex: 0xe1594f,
    color: "#E1594F",
    label: "IP Address",
    layer: 0,
    tier: "Comms & Digital",
  },
  DOMAIN: {
    hex: 0xe1594f,
    color: "#E1594F",
    label: "Domain",
    layer: 0,
    tier: "Comms & Digital",
  },
  URL: {
    hex: 0xe1594f,
    color: "#E1594F",
    label: "URL",
    layer: 0,
    tier: "Comms & Digital",
  },
  DEVICE: {
    hex: 0x8891a0,
    color: "#8891A0",
    label: "Device",
    layer: 0,
    tier: "Comms & Digital",
  },
  BANK_ACCOUNT: {
    hex: 0xf59e0b,
    color: "#F59E0B",
    label: "Bank Account",
    layer: -40,
    tier: "Financial & Assets",
  },
  TRANSACTION_ID: {
    hex: 0xf59e0b,
    color: "#F59E0B",
    label: "Transaction",
    layer: -40,
    tier: "Financial & Assets",
  },
  CRYPTO_WALLET: {
    hex: 0xf59e0b,
    color: "#F59E0B",
    label: "Crypto Wallet",
    layer: -40,
    tier: "Financial & Assets",
  },
  LOCATION: {
    hex: 0xa78bfa,
    color: "#A78BFA",
    label: "Location",
    layer: -40,
    tier: "Temporal & Geo",
  },
  DATE: {
    hex: 0x6b7280,
    color: "#6B7280",
    label: "Date",
    layer: -40,
    tier: "Temporal & Geo",
  },
  TIME: {
    hex: 0x6b7280,
    color: "#6B7280",
    label: "Time",
    layer: -40,
    tier: "Temporal & Geo",
  },
};

const FALLBACK_META = {
  hex: 0x8891a0,
  color: "#8891A0",
  label: "Other",
  layer: 0,
  tier: "General",
};

export const getMeta = (t: string) => TYPE_META[t] ?? FALLBACK_META;

/* ─── Color Helper ────────────────────────────────────────────────────────── */
function hexToRgba(hex: string, alpha: number): string {
  let c = hex.replace("#", "");
  if (c.length === 3) c = c.split("").map((x) => x + x).join("");
  const num = parseInt(c, 16);
  if (isNaN(num)) return `rgba(63, 208, 220, ${alpha})`;
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ─── 3D Holographic Anchor Stalk ─────────────────────────────────────────── */
function createNodeStalk(radius: number, height: number, colorHex: number) {
  const group = new THREE.Group();

  // 1. Emitter collar ring sitting on the top pole of the node sphere
  const ringGeo = new THREE.RingGeometry(0.3, 0.7, 24);
  const ringMat = new THREE.MeshBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.55,
    side: THREE.DoubleSide,
  });
  const ring = new THREE.Mesh(ringGeo, ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = radius + 0.05;
  group.add(ring);

  // 2. Vertical holographic laser filament
  const points = [
    new THREE.Vector3(0, radius + 0.1, 0),
    new THREE.Vector3(0, radius + height, 0),
  ];
  const lineGeo = new THREE.BufferGeometry().setFromPoints(points);
  const lineMat = new THREE.LineBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.5,
  });
  const line = new THREE.Line(lineGeo, lineMat);
  group.add(line);

  // 3. Anchor contact bead at bottom of floating plate
  const beadGeo = new THREE.SphereGeometry(0.24, 12, 12);
  const beadMat = new THREE.MeshBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.85,
  });
  const bead = new THREE.Mesh(beadGeo, beadMat);
  bead.position.y = radius + height;
  group.add(bead);

  return group;
}

/* ─── Type-specific forensic icon for each node label ────────────────────── */
function drawEntityTypeIcon(
  ctx: CanvasRenderingContext2D,
  type: string,
  centerX: number,
  centerY: number
) {
  ctx.save();
  ctx.translate(centerX, centerY);
  ctx.strokeStyle = "#F8FAFC";
  ctx.fillStyle = "#F8FAFC";
  ctx.lineWidth = 2.25;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";

  switch (type) {
    case "EMAIL":
      ctx.beginPath();
      ctx.roundRect(-12, -8, 24, 16, 3);
      ctx.moveTo(-11, -6);
      ctx.lineTo(0, 2);
      ctx.lineTo(11, -6);
      ctx.stroke();
      break;
    case "PHONE_NUMBER":
      ctx.beginPath();
      ctx.roundRect(-7.5, -13, 15, 26, 3);
      ctx.moveTo(-3, -8);
      ctx.lineTo(3, -8);
      ctx.moveTo(-2, 8.5);
      ctx.lineTo(2, 8.5);
      ctx.stroke();
      break;
    case "IP_ADDRESS":
    case "DOMAIN":
    case "URL":
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.moveTo(-11, 0);
      ctx.lineTo(11, 0);
      ctx.moveTo(0, -11);
      ctx.bezierCurveTo(-6, -6, -6, 6, 0, 11);
      ctx.bezierCurveTo(6, 6, 6, -6, 0, -11);
      ctx.moveTo(-8, -7);
      ctx.quadraticCurveTo(0, -3, 8, -7);
      ctx.moveTo(-8, 7);
      ctx.quadraticCurveTo(0, 3, 8, 7);
      ctx.stroke();
      break;
    case "PERSON":
    case "SOCIAL_MEDIA_ACCOUNT":
      ctx.beginPath();
      ctx.arc(0, -5, 5, 0, Math.PI * 2);
      ctx.moveTo(-10, 11);
      ctx.bezierCurveTo(-9, 3, 9, 3, 10, 11);
      ctx.stroke();
      break;
    case "ORGANIZATION":
      ctx.beginPath();
      ctx.moveTo(-11, 10);
      ctx.lineTo(11, 10);
      ctx.moveTo(-8, 7);
      ctx.lineTo(-8, -5);
      ctx.lineTo(8, -5);
      ctx.lineTo(8, 7);
      ctx.moveTo(-11, -5);
      ctx.lineTo(0, -12);
      ctx.lineTo(11, -5);
      ctx.moveTo(-3, -2);
      ctx.lineTo(-3, 7);
      ctx.moveTo(3, -2);
      ctx.lineTo(3, 7);
      ctx.stroke();
      break;
    case "DEVICE":
      ctx.beginPath();
      ctx.roundRect(-11, -9, 22, 16, 2);
      ctx.moveTo(-6, 11);
      ctx.lineTo(6, 11);
      ctx.moveTo(0, 7);
      ctx.lineTo(0, 11);
      ctx.stroke();
      break;
    case "BANK_ACCOUNT":
      ctx.beginPath();
      ctx.moveTo(-12, -5);
      ctx.lineTo(0, -12);
      ctx.lineTo(12, -5);
      ctx.moveTo(-10, -3);
      ctx.lineTo(10, -3);
      ctx.moveTo(-9, 9);
      ctx.lineTo(9, 9);
      ctx.moveTo(-12, 12);
      ctx.lineTo(12, 12);
      for (const x of [-7, 0, 7]) {
        ctx.moveTo(x, -2);
        ctx.lineTo(x, 8);
      }
      ctx.stroke();
      break;
    case "TRANSACTION_ID":
    case "FILE":
      ctx.beginPath();
      ctx.moveTo(-7, -12);
      ctx.lineTo(3, -12);
      ctx.lineTo(9, -6);
      ctx.lineTo(9, 12);
      ctx.lineTo(-9, 12);
      ctx.lineTo(-9, -10);
      ctx.closePath();
      ctx.moveTo(3, -11);
      ctx.lineTo(3, -5);
      ctx.lineTo(8, -5);
      ctx.moveTo(-5, 0);
      ctx.lineTo(5, 0);
      ctx.moveTo(-5, 5);
      ctx.lineTo(5, 5);
      ctx.stroke();
      break;
    case "CRYPTO_WALLET":
      ctx.beginPath();
      ctx.arc(-5, 0, 6, -Math.PI / 2, Math.PI / 2);
      ctx.arc(5, 0, 6, Math.PI / 2, -Math.PI / 2);
      ctx.moveTo(-2, -5);
      ctx.lineTo(2, -5);
      ctx.moveTo(-2, 5);
      ctx.lineTo(2, 5);
      ctx.stroke();
      break;
    case "LOCATION":
      ctx.beginPath();
      ctx.moveTo(0, 12);
      ctx.bezierCurveTo(-2, 8, -10, 1, -10, -4);
      ctx.arc(0, -4, 10, Math.PI, 0, true);
      ctx.bezierCurveTo(10, 1, 2, 8, 0, 12);
      ctx.moveTo(0, -8);
      ctx.arc(0, -4, 3.5, -Math.PI / 2, Math.PI * 1.5);
      ctx.stroke();
      break;
    case "DATE":
    case "TIME":
      ctx.beginPath();
      ctx.arc(0, 0, 11, 0, Math.PI * 2);
      ctx.moveTo(0, -6);
      ctx.lineTo(0, 0);
      ctx.lineTo(5, 3);
      ctx.stroke();
      break;
    default:
      ctx.beginPath();
      ctx.arc(-7, 0, 3, 0, Math.PI * 2);
      ctx.arc(7, -7, 3, 0, Math.PI * 2);
      ctx.arc(7, 7, 3, 0, Math.PI * 2);
      ctx.moveTo(-4, -1);
      ctx.lineTo(4, -6);
      ctx.moveTo(-4, 1);
      ctx.lineTo(4, 6);
      ctx.stroke();
      break;
  }
  ctx.restore();
}

function createNodeTypeIconSprite(type: string, color: string, size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.save();
  ctx.shadowColor = hexToRgba(color, 0.8);
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(64, 64, 48, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(5, 10, 18, 0.94)";
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 3;
  ctx.strokeStyle = color;
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.translate(64, 64);
  ctx.scale(2.15, 2.15);
  drawEntityTypeIcon(ctx, type, 0, 0);
  ctx.restore();

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false,
    depthWrite: false,
  }));
  sprite.scale.set(size, size, 1);
  return sprite;
}

/* ─── 3D Holographic Text Sprite Creator ─────────────────────────────────── */
function createTextSprite(text: string, color: string, typeName: string = "", entityType: string = "") {
  const canvas = document.createElement("canvas");
  canvas.width = 512;
  canvas.height = 140;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const x = 18, y = 14, w = 476, h = 100, r = 18;
  const centerX = x + w / 2;
  const bottomY = y + h;
  const nw = 16; // half notch width
  const nh = 12; // notch tip height

  // Function to draw HUD plate outline with bottom projection notch
  const drawPlate = () => {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, bottomY - r);
    ctx.arcTo(x + w, bottomY, x + w - r, bottomY, r);
    ctx.lineTo(centerX + nw, bottomY);
    ctx.lineTo(centerX, bottomY + nh);
    ctx.lineTo(centerX - nw, bottomY);
    ctx.lineTo(x + r, bottomY);
    ctx.arcTo(x, bottomY, x, bottomY - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  };

  // 1. Soft volumetric drop shadow
  ctx.save();
  ctx.shadowColor = "rgba(0, 0, 0, 0.75)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 8;
  drawPlate();
  ctx.fillStyle = "rgba(4, 7, 14, 0.95)";
  ctx.fill();
  ctx.restore();

  // 2. Multi-stop Frosted Glass Body
  drawPlate();
  const bg = ctx.createLinearGradient(0, y, 0, bottomY + nh);
  bg.addColorStop(0, "rgba(16, 26, 44, 0.88)");
  bg.addColorStop(0.35, "rgba(9, 15, 28, 0.82)");
  bg.addColorStop(0.85, "rgba(5, 8, 16, 0.94)");
  bg.addColorStop(1, hexToRgba(color, 0.35));
  ctx.fillStyle = bg;
  ctx.fill();

  // 3. Radial Ambient Bloom from Node Color
  ctx.save();
  drawPlate();
  ctx.clip();
  const bloom = ctx.createRadialGradient(x + 50, y + h / 2, 4, x + 50, y + h / 2, 160);
  bloom.addColorStop(0, hexToRgba(color, 0.28));
  bloom.addColorStop(0.6, hexToRgba(color, 0.06));
  bloom.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = bloom;
  ctx.fillRect(x, y, w, h + nh);
  ctx.restore();

  // 4. 3D Beveled Rim Stroke with Outer Glow
  ctx.save();
  drawPlate();
  ctx.shadowColor = hexToRgba(color, 0.65);
  ctx.shadowBlur = 10;
  const rim = ctx.createLinearGradient(0, y, 0, bottomY + nh);
  rim.addColorStop(0, "rgba(255, 255, 255, 0.85)"); // crisp top highlight glint
  rim.addColorStop(0.18, color);
  rim.addColorStop(0.82, hexToRgba(color, 0.4));
  rim.addColorStop(1, "#FFFFFF"); // bright anchor tip
  ctx.strokeStyle = rim;
  ctx.lineWidth = 2.0;
  ctx.stroke();
  ctx.restore();

  // 5. Specular Horizon Glaze (Simulating curved glass surface)
  ctx.save();
  ctx.beginPath();
  const glzH = h * 0.44;
  ctx.moveTo(x + r, y + 2);
  ctx.lineTo(x + w - r, y + 2);
  ctx.arcTo(x + w - 2, y + 2, x + w - 2, y + r, r - 2);
  ctx.lineTo(x + w - 2, y + glzH);
  ctx.quadraticCurveTo(centerX, y + glzH - 6, x + 2, y + glzH);
  ctx.lineTo(x + 2, y + r);
  ctx.arcTo(x + 2, y + 2, x + r, y + 2, r - 2);
  ctx.closePath();
  const glz = ctx.createLinearGradient(0, y, 0, y + glzH);
  glz.addColorStop(0, "rgba(255, 255, 255, 0.2)");
  glz.addColorStop(1, "rgba(255, 255, 255, 0.0)");
  ctx.fillStyle = glz;
  ctx.fill();
  ctx.restore();

  // 6. 3D Spherical Jewel / Status Pip
  const orbX = x + 44;
  const orbY = y + h / 2;

  // Outer radiant glow
  const halo = ctx.createRadialGradient(orbX, orbY, 2, orbX, orbY, 24);
  halo.addColorStop(0, hexToRgba(color, 0.9));
  halo.addColorStop(0.4, hexToRgba(color, 0.35));
  halo.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(orbX, orbY, 24, 0, Math.PI * 2);
  ctx.fill();

  // 3D Spherical gradient
  const sphereGrad = ctx.createRadialGradient(orbX - 3.5, orbY - 3.5, 1, orbX, orbY, 12);
  sphereGrad.addColorStop(0, "#FFFFFF");
  sphereGrad.addColorStop(0.25, color);
  sphereGrad.addColorStop(0.75, hexToRgba(color, 0.95));
  sphereGrad.addColorStop(1, "#020617");
  ctx.fillStyle = sphereGrad;
  ctx.beginPath();
  ctx.arc(orbX, orbY, 12, 0, Math.PI * 2);
  ctx.fill();

  // Replace the generic orb glint with a distinct, high-contrast entity icon.
  drawEntityTypeIcon(ctx, entityType, orbX, orbY);

  // 7. Micro Divider
  const divX = x + 72;
  const divGrad = ctx.createLinearGradient(0, y + 18, 0, y + h - 18);
  divGrad.addColorStop(0, "rgba(255, 255, 255, 0.0)");
  divGrad.addColorStop(0.5, hexToRgba(color, 0.45));
  divGrad.addColorStop(1, "rgba(255, 255, 255, 0.0)");
  ctx.strokeStyle = divGrad;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(divX, y + 20);
  ctx.lineTo(divX, y + h - 20);
  ctx.stroke();

  // 8. Typography
  ctx.textBaseline = "middle";
  const textX = divX + 16;
  const typeTag = (typeName || "ENTITY").replace(/_/g, " ").toUpperCase();
  ctx.font = "700 13px 'SF Mono', 'Roboto Mono', monospace";
  ctx.fillStyle = hexToRgba(color, 0.95);
  ctx.shadowColor = hexToRgba(color, 0.5);
  ctx.shadowBlur = 4;
  ctx.fillText(typeTag, textX, y + 36);
  ctx.shadowBlur = 0;

  const display = text.length > 22 ? text.slice(0, 20) + "…" : text;
  ctx.font = "600 23px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Inter', sans-serif";
  ctx.fillStyle = "#F8FAFC";
  ctx.shadowColor = "rgba(0, 0, 0, 0.85)";
  ctx.shadowBlur = 8;
  ctx.shadowOffsetY = 2;
  ctx.fillText(display, textX, y + 68);
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // 9. Three.js Texture & Sprite Material
  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;

  const mat = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: true,
    depthWrite: false,
  });
  const sprite = new THREE.Sprite(mat);
  sprite.scale.set(12.8, 3.5, 1);
  return sprite;
}

/* ─── Layer Plane Grid ────────────────────────────────────────────────────── */
function createLayerGrid(y: number, label: string, colorHex: number) {
  const group = new THREE.Group();
  group.position.y = y;

  // Concentric rings
  for (let r = 25; r <= 85; r += 30) {
    const ringGeo = new THREE.RingGeometry(r - 0.2, r + 0.2, 48);
    const ringMat = new THREE.MeshBasicMaterial({
      color: colorHex,
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeo, ringMat);
    ring.rotation.x = Math.PI / 2;
    group.add(ring);
  }

  // Cross axes
  const axisMat = new THREE.LineBasicMaterial({
    color: colorHex,
    transparent: true,
    opacity: 0.1,
  });
  const points1 = [new THREE.Vector3(-90, 0, 0), new THREE.Vector3(90, 0, 0)];
  const points2 = [new THREE.Vector3(0, 0, -90), new THREE.Vector3(0, 0, 90)];
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points1), axisMat));
  group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points2), axisMat));

  // Layer text label sprite
  const canvas = document.createElement("canvas");
  canvas.width = 380;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = "rgba(10, 15, 25, 0.7)";
    ctx.fillRect(0, 0, 380, 64);
    ctx.fillStyle = "#" + colorHex.toString(16).padStart(6, "0");
    ctx.font = "bold 20px monospace";
    ctx.textBaseline = "middle";
    ctx.fillText("▸ LAYER: " + label.toUpperCase(), 15, 32);
    const texture = new THREE.CanvasTexture(canvas);
    const mat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0.6,
      depthWrite: false,
    });
    const sprite = new THREE.Sprite(mat);
    sprite.position.set(-75, 2, -75);
    sprite.scale.set(22, 3.8, 1);
    group.add(sprite);
  }

  return group;
}

/* ─── Node & Edge Interfaces ──────────────────────────────────────────────── */
interface GraphNodeData {
  id: string;
  label: string;
  type: string;
  pagerank: number;
  degree: number;
  // 3D coordinates & velocities
  x: number;
  y: number;
  z: number;
  targetY?: number;
  vx: number;
  vy: number;
  vz: number;
  mesh: THREE.Mesh;
  halo: THREE.Mesh;
  sprite: THREE.Sprite | null;
  stalk?: THREE.Group | null;
  glowLight: THREE.PointLight | null;
}

interface GraphEdgeData {
  id: string;
  source: string;
  target: string;
  type: string;
  weight: number;
  line: THREE.Line;
}

/* ─── Main 3D Graph Scene Builder ─────────────────────────────────────────── */
function buildGraphScene(
  canvas: HTMLCanvasElement,
  container: HTMLDivElement,
  nodes: any[],
  edges: any[],
  prMap: Record<string, number>,
  degMap: Record<string, number>,
  layoutMode: "layered" | "cluster" | "sphere",
  onNodeSelect: (node: { id: string; label: string; type: string; pagerank: number; degree: number } | null) => void,
  onNodeHover: (node: { id: string; label: string; type: string } | null, screenPos?: { x: number; y: number }) => void
) {
  const width = Math.max(container.clientWidth || canvas.clientWidth || 800, 300);
  const height = Math.max(container.clientHeight || canvas.clientHeight || 540, 300);

  /* ── 1. Renderer ── */
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
  });
  // Dense glowing edges are expensive to rasterize at full retina resolution.
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(width, height, false);
  renderer.setClearColor(0x000000, 0);

  /* ── 2. Scene & Fog ── */
  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x06080e, 0.006);

  /* ── 3. Camera ── */
  const camera = new THREE.PerspectiveCamera(55, width / height, 0.5, 3000);
  camera.position.set(0, 50, 175);

  /* ── 4. Lights ── */
  scene.add(new THREE.AmbientLight(0x223046, 2.5));
  const dirLight1 = new THREE.DirectionalLight(0x3fd0dc, 0.8);
  dirLight1.position.set(120, 150, 120);
  scene.add(dirLight1);

  const dirLight2 = new THREE.DirectionalLight(0xf59e0b, 0.4);
  dirLight2.position.set(-120, -80, -100);
  scene.add(dirLight2);

  /* ── 5. Star / Cyber Particle Background ── */
  const starGeo = new THREE.BufferGeometry();
  const starPositions: number[] = [];
  const starColors: number[] = [];
  for (let i = 0; i < 900; i++) {
    starPositions.push(
      (Math.random() - 0.5) * 900,
      (Math.random() - 0.5) * 900,
      (Math.random() - 0.5) * 900
    );
    const isCyan = Math.random() > 0.4;
    starColors.push(isCyan ? 0.25 : 0.9, isCyan ? 0.82 : 0.62, isCyan ? 0.86 : 0.1);
  }
  starGeo.setAttribute("position", new THREE.Float32BufferAttribute(starPositions, 3));
  starGeo.setAttribute("color", new THREE.Float32BufferAttribute(starColors, 3));
  const starMat = new THREE.PointsMaterial({
    size: 0.8,
    vertexColors: true,
    transparent: true,
    opacity: 0.45,
  });
  scene.add(new THREE.Points(starGeo, starMat));

  /* ── 6. Layer Grids (if layered mode) ── */
  const layerGroup = new THREE.Group();
  layerGroup.add(createLayerGrid(40, "Identities & Targets", 0x3fd0dc));
  layerGroup.add(createLayerGrid(0, "Communications & Network", 0x4caf7d));
  layerGroup.add(createLayerGrid(-40, "Financial & Physical", 0xf59e0b));
  layerGroup.visible = layoutMode === "layered";
  scene.add(layerGroup);

  /* ── 7. Orbit Controls ── */
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.rotateSpeed = 0.6;
  controls.zoomSpeed = 1.1;
  controls.panSpeed = 0.6;
  controls.minDistance = 25;
  controls.maxDistance = 600;
  controls.target.set(0, 0, 0);

  /* ── 8. Build Nodes ── */
  const nodeMap = new Map<string, GraphNodeData>();
  const interactiveMeshes: THREE.Mesh[] = [];

  nodes.forEach((n, idx) => {
    const pr = prMap[n.id] ?? 0;
    const deg = degMap[n.id] ?? 0;
    const meta = getMeta(n.type);

    // Dynamic radius based on importance
    const radius = 2.8 + pr * 16 + deg * 4;

    // Node sphere
    const sphereGeo = new THREE.SphereGeometry(radius, 24, 24);
    const sphereMat = new THREE.MeshPhongMaterial({
      color: meta.hex,
      emissive: meta.hex,
      emissiveIntensity: 0.4,
      shininess: 90,
      transparent: true,
      opacity: 0.95,
    });
    const mesh = new THREE.Mesh(sphereGeo, sphereMat);
    mesh.userData = { id: n.id, label: n.label, type: n.type, pagerank: pr, degree: deg };

    // A camera-facing type badge makes entities distinguishable at a glance.
    const typeIcon = createNodeTypeIconSprite(n.type, meta.color, radius * 1.25);
    if (typeIcon) {
      typeIcon.position.set(0, 0, radius + 0.08);
      mesh.add(typeIcon);
    }

    // Outer pulsating halo ring
    const haloGeo = new THREE.TorusGeometry(radius * 1.5, 0.22, 8, 36);
    const haloMat = new THREE.MeshBasicMaterial({
      color: meta.hex,
      transparent: true,
      opacity: 0.35,
    });
    const halo = new THREE.Mesh(haloGeo, haloMat);
    halo.rotation.x = Math.PI / 2;
    mesh.add(halo);

    // 3D Laser Anchor Stalk
    const stalkHeight = 3.6;
    const stalk = createNodeStalk(radius, stalkHeight, meta.hex);
    mesh.add(stalk);

    // Text label sprite floating right above the stalk
    const sprite = createTextSprite(n.label, meta.color, meta.label, n.type);
    if (sprite) {
      // 1.45 offset places the downward notch directly touching the stalk tip
      sprite.position.set(0, radius + stalkHeight + 1.45, 0);
      mesh.add(sprite);
    }

    // High centrality hub light
    let ptLight: THREE.PointLight | null = null;
    if (pr > 0.03 || deg > 0.3) {
      ptLight = new THREE.PointLight(meta.hex, 1.2, radius * 12);
      mesh.add(ptLight);
    }

    // Initial position calculation based on layoutMode
    let initX = 0, initY = 0, initZ = 0;
    const angle = (idx / Math.max(nodes.length, 1)) * Math.PI * 2;
    const spread = 25 + Math.random() * 35;

    if (layoutMode === "layered") {
      initY = meta.layer + (Math.random() - 0.5) * 6;
      initX = Math.cos(angle) * spread;
      initZ = Math.sin(angle) * spread;
    } else if (layoutMode === "sphere") {
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 35 + (1 - pr) * 25;
      initX = r * Math.sin(phi) * Math.cos(angle);
      initY = r * Math.sin(phi) * Math.sin(angle);
      initZ = r * Math.cos(phi);
    } else {
      // 3D cluster
      initX = (Math.random() - 0.5) * 60;
      initY = (Math.random() - 0.5) * 60;
      initZ = (Math.random() - 0.5) * 60;
    }

    mesh.position.set(initX, initY, initZ);
    scene.add(mesh);
    interactiveMeshes.push(mesh);

    nodeMap.set(n.id, {
      id: n.id,
      label: n.label,
      type: n.type,
      pagerank: pr,
      degree: deg,
      x: initX,
      y: initY,
      z: initZ,
      targetY: layoutMode === "layered" ? meta.layer : undefined,
      vx: 0,
      vy: 0,
      vz: 0,
      mesh,
      halo,
      sprite,
      stalk,
      glowLight: ptLight,
    });
  });

  /* ── 9. Build Edges ── */
  const edgeData: GraphEdgeData[] = [];
  edges.forEach((e) => {
    const src = nodeMap.get(e.source);
    const tgt = nodeMap.get(e.target);
    if (!src || !tgt) return;

    const points = [src.mesh.position.clone(), tgt.mesh.position.clone()];
    const geo = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0x243e56,
      transparent: true,
      opacity: 0.55,
      linewidth: 1,
    });
    const line = new THREE.Line(geo, mat);
    scene.add(line);

    edgeData.push({
      id: e.id,
      source: e.source,
      target: e.target,
      type: e.type,
      weight: e.weight || 1,
      line,
    });
  });

  /* ── 10. Force Simulation Loop (3D physics) ── */
  let simTick = 0;
  const MAX_TICKS = 240;
  const REPEL = 450;
  const ATTRACT = 0.026;
  const DAMPING = 0.82;
  const TARGET_DIST = 26;

  function runPhysicsStep() {
    if (simTick >= MAX_TICKS) return;
    simTick++;
    const alpha = Math.max(1 - simTick / MAX_TICKS, 0.02);
    const list = Array.from(nodeMap.values());

    // Repulsion
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const a = list[i], b = list[j];
        const dx = a.x - b.x;
        const dy = layoutMode === "layered" ? (a.y - b.y) * 0.2 : a.y - b.y;
        const dz = a.z - b.z;
        const distSq = dx * dx + dy * dy + dz * dz || 0.05;
        const dist = Math.sqrt(distSq);
        const force = (REPEL / distSq) * alpha;

        const fx = (dx / dist) * force;
        const fy = (dy / dist) * force;
        const fz = (dz / dist) * force;

        a.vx += fx; a.vy += fy; a.vz += fz;
        b.vx -= fx; b.vy -= fy; b.vz -= fz;
      }
    }

    // Edge attraction
    edgeData.forEach(({ source, target }) => {
      const a = nodeMap.get(source);
      const b = nodeMap.get(target);
      if (!a || !b) return;

      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const dz = b.z - a.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1;
      const delta = (dist - TARGET_DIST) * ATTRACT * alpha;

      const fx = (dx / dist) * delta;
      const fy = (dy / dist) * delta;
      const fz = (dz / dist) * delta;

      a.vx += fx; a.vy += fy; a.vz += fz;
      b.vx -= fx; b.vy -= fy; b.vz -= fz;
    });

    // Layer gravity or center gravity
    list.forEach((n) => {
      if (layoutMode === "layered" && n.targetY != null) {
        n.vy += (n.targetY - n.y) * 0.12 * alpha;
      } else {
        // Soft pull to center
        n.vx -= n.x * 0.005 * alpha;
        n.vy -= n.y * 0.005 * alpha;
        n.vz -= n.z * 0.005 * alpha;
      }

      n.x += n.vx;
      n.y += n.vy;
      n.z += n.vz;

      n.vx *= DAMPING;
      n.vy *= DAMPING;
      n.vz *= DAMPING;

      n.mesh.position.set(n.x, n.y, n.z);
    });

    // Update edge lines
    edgeData.forEach(({ source, target, line }) => {
      const a = nodeMap.get(source);
      const b = nodeMap.get(target);
      if (!a || !b) return;

      const pos = line.geometry.attributes.position as THREE.BufferAttribute;
      pos.setXYZ(0, a.x, a.y, a.z);
      pos.setXYZ(1, b.x, b.y, b.z);
      pos.needsUpdate = true;
    });
  }

  /* ── 11. Raycasting & Interaction ── */
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();
  let selectedNodeId: string | null = null;
  let hoveredNodeId: string | null = null;

  function updateMouseCoord(e: MouseEvent) {
    const rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    return rect;
  }

  function onPointerMove(e: MouseEvent) {
    const rect = updateMouseCoord(e);
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(interactiveMeshes);

    if (hits.length > 0) {
      canvas.style.cursor = "pointer";
      const hitMesh = hits[0].object as THREE.Mesh;
      const data = hitMesh.userData;
      if (hoveredNodeId !== data.id) {
        if (hoveredNodeId) {
          const prev = nodeMap.get(hoveredNodeId);
          if (prev?.sprite) prev.sprite.scale.set(12.8, 3.5, 1);
        }
        hoveredNodeId = data.id;
        const curr = nodeMap.get(data.id);
        if (curr?.sprite) curr.sprite.scale.set(14.8, 4.05, 1);
        onNodeHover(
          { id: data.id, label: data.label, type: data.type },
          { x: e.clientX - rect.left, y: e.clientY - rect.top }
        );
      }
    } else {
      canvas.style.cursor = "default";
      if (hoveredNodeId !== null) {
        const prev = nodeMap.get(hoveredNodeId);
        if (prev?.sprite) prev.sprite.scale.set(12.8, 3.5, 1);
        hoveredNodeId = null;
        onNodeHover(null);
      }
    }
  }

  function onClick(e: MouseEvent) {
    updateMouseCoord(e);
    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(interactiveMeshes);

    // Reset visual highlights
    nodeMap.forEach((n) => {
      const meta = getMeta(n.type);
      (n.mesh.material as THREE.MeshPhongMaterial).emissive.setHex(meta.hex);
      (n.mesh.material as THREE.MeshPhongMaterial).emissiveIntensity = 0.4;
      n.halo.scale.setScalar(1);
    });

    if (hits.length > 0) {
      const hitMesh = hits[0].object as THREE.Mesh;
      const data = hitMesh.userData;
      selectedNodeId = data.id;

      // Highlight selected node
      (hitMesh.material as THREE.MeshPhongMaterial).emissiveIntensity = 1.0;
      onNodeSelect({
        id: data.id,
        label: data.label,
        type: data.type,
        pagerank: data.pagerank,
        degree: data.degree,
      });

      // Find neighbor node IDs
      const neighborIds = new Set<string>();
      neighborIds.add(data.id);

      edgeData.forEach(({ source, target, line }) => {
        const isConnected = source === data.id || target === data.id;
        const lineMat = line.material as THREE.LineBasicMaterial;
        if (isConnected) {
          lineMat.color.setHex(0x3fd0dc);
          lineMat.opacity = 1.0;
          neighborIds.add(source);
          neighborIds.add(target);
        } else {
          lineMat.color.setHex(0x132232);
          lineMat.opacity = 0.15;
        }
      });

      // Dim non-neighbors
      nodeMap.forEach((n) => {
        const isNeighbor = neighborIds.has(n.id);
        const mat = n.mesh.material as THREE.MeshPhongMaterial;
        mat.opacity = isNeighbor ? 1.0 : 0.25;
        if (n.sprite) n.sprite.visible = isNeighbor;
        if (n.stalk) n.stalk.visible = isNeighbor;
      });
    } else {
      selectedNodeId = null;
      onNodeSelect(null);

      // Restore all edges and nodes
      edgeData.forEach(({ line }) => {
        const lineMat = line.material as THREE.LineBasicMaterial;
        lineMat.color.setHex(0x243e56);
        lineMat.opacity = 0.55;
      });
      nodeMap.forEach((n) => {
        const mat = n.mesh.material as THREE.MeshPhongMaterial;
        mat.opacity = 0.95;
        if (n.sprite) n.sprite.visible = true;
        if (n.stalk) n.stalk.visible = true;
      });
    }
  }

  canvas.addEventListener("mousemove", onPointerMove);
  canvas.addEventListener("click", onClick);

  /* ── 12. Resize Observer Handler ── */
  function handleResize(newW: number, newH: number) {
    if (newW <= 0 || newH <= 0) return;
    camera.aspect = newW / newH;
    camera.updateProjectionMatrix();
    renderer.setSize(newW, newH, false);
  }

  /* ── 13. Animation Loop ── */
  let animId = 0;
  let time = 0;

  function animate() {
    animId = requestAnimationFrame(animate);
    time += 0.016;

    runPhysicsStep();
    controls.update();

    // Pulse halo rings & apply depth attenuation for natural 3D spatial presence
    const camPos = camera.position;
    nodeMap.forEach((n) => {
      const scale = 1 + 0.08 * Math.sin(time * 3 + n.x * 0.1);
      n.halo.scale.setScalar(scale);

      if (n.sprite && n.mesh.visible) {
        const dist = n.mesh.position.distanceTo(camPos);
        // Distant nodes gently fade into cosmic depth; foreground nodes stay vivid and crisp
        const depthAlpha = THREE.MathUtils.clamp(1.0 - (dist - 90) / 450, 0.35, 1.0);
        if (n.id === hoveredNodeId || n.id === selectedNodeId) {
          n.sprite.material.opacity = 1.0;
        } else {
          n.sprite.material.opacity = depthAlpha * (n.mesh.material as THREE.MeshPhongMaterial).opacity;
        }
      }
    });

    // Gentle auto-rotate when not dragging
    if (autoRotateActive) {
      scene.rotation.y += 0.0008;
    }

    renderer.render(scene, camera);
  }

  let autoRotateActive = true;
  animate();

  /* ── Public Controls ── */
  return {
    resize: handleResize,
    resetView: () => {
      camera.position.set(0, 50, 175);
      controls.target.set(0, 0, 0);
      controls.update();
      scene.rotation.y = 0;
    },
    toggleAutoRotate: (enable: boolean) => {
      autoRotateActive = enable;
    },
    focusNode: (nodeId: string) => {
      const target = nodeMap.get(nodeId);
      if (target) {
        controls.target.set(target.x, target.y, target.z);
        camera.position.set(target.x, target.y + 20, target.z + 60);
        controls.update();
      }
    },
    cleanup: () => {
      cancelAnimationFrame(animId);
      canvas.removeEventListener("mousemove", onPointerMove);
      canvas.removeEventListener("click", onClick);
      controls.dispose();
      renderer.dispose();
      scene.clear();
    },
  };
}

/* ─── Main Graph3D Component ──────────────────────────────────────────────── */
export default function Graph3D({ caseId }: { caseId: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneHandleRef = useRef<ReturnType<typeof buildGraphScene> | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [graphData, setGraphData] = useState<{ nodes: any[]; edges: any[]; metrics: any } | null>(null);
  const [layoutMode, setLayoutMode] = useState<"layered" | "cluster" | "sphere">("layered");
  const [autoRotate, setAutoRotate] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Selection & Hover state
  const [selectedNode, setSelectedNode] = useState<{
    id: string;
    label: string;
    type: string;
    pagerank: number;
    degree: number;
    connections: Array<{
      id: string;
      label: string;
      type: string;
      relationshipType: string;
      weight: number;
    }>;
  } | null>(null);
  const [hoveredNode, setHoveredNode] = useState<{
    id: string;
    label: string;
    type: string;
  } | null>(null);
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null);

  // Entity resolution
  const [resolving, setResolving] = useState(false);
  const [resolutionError, setResolutionError] = useState<string | null>(null);
  const [resolutionAttempted, setResolutionAttempted] = useState(false);
  const [candidates, setCandidates] = useState<any[]>([]);

  /* ── Load Graph Data ── */
  const loadGraph = useCallback(() => {
    setLoading(true);
    setError(null);

    api
      .get(`/graph/case/${caseId}?include_metrics=true`)
      .then((data: any) => {
        setGraphData({
          nodes: data.nodes || [],
          edges: data.edges || [],
          metrics: data.metrics || null,
        });
      })
      .catch((err: any) => {
        setError(err.message || "Failed to load graph data");
      })
      .finally(() => {
        setLoading(false);
      });

    // Also load pre-existing resolution candidates
    api
      .get(`/graph/case/${caseId}/resolution-candidates`)
      .then((data: any) => {
        if (Array.isArray(data)) setCandidates(data);
      })
      .catch(() => {});
  }, [caseId]);

  useEffect(() => {
    loadGraph();
  }, [loadGraph]);

  /* ── Initialize / Rebuild Three.js Scene ── */
  useEffect(() => {
    if (!canvasRef.current || !containerRef.current || !graphData) return;

    // Build Centrality & Degree Maps from metrics
    const prMap: Record<string, number> = {};
    const degMap: Record<string, number> = {};

    if (graphData.metrics) {
      (graphData.metrics.top_pagerank || []).forEach(([nodeId, score]: [string, number]) => {
        prMap[nodeId] = score;
      });
      (graphData.metrics.top_degree_centrality || []).forEach(([nodeId, score]: [string, number]) => {
        degMap[nodeId] = score;
      });
    }

    // Filter nodes by type if specified
    const filteredNodes =
      typeFilter === "ALL"
        ? graphData.nodes
        : graphData.nodes.filter((n) => n.type === typeFilter);

    const filteredNodeIds = new Set(filteredNodes.map((n) => n.id));
    const filteredEdges = graphData.edges.filter(
      (e) => filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)
    );

    if (sceneHandleRef.current) {
      sceneHandleRef.current.cleanup();
      sceneHandleRef.current = null;
    }

    if (filteredNodes.length > 0) {
      sceneHandleRef.current = buildGraphScene(
        canvasRef.current,
        containerRef.current,
        filteredNodes,
        filteredEdges,
        prMap,
        degMap,
        layoutMode,
        (sel) => setSelectedNode(
          sel ? { ...sel, connections: getConnectionsForNode(sel.id) } : null
        ),
        (hov, pos) => {
          setHoveredNode(hov);
          if (pos) setHoverPos(pos);
        }
      );
      sceneHandleRef.current.toggleAutoRotate(autoRotate);
    }

    // ResizeObserver on container
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (sceneHandleRef.current && width > 0 && height > 0) {
          sceneHandleRef.current.resize(width, height);
        }
      }
    });
    ro.observe(containerRef.current);

    return () => {
      ro.disconnect();
      if (sceneHandleRef.current) {
        sceneHandleRef.current.cleanup();
        sceneHandleRef.current = null;
      }
    };
  }, [graphData, layoutMode, typeFilter]);

  // Changing this control should not tear down and recreate the WebGL scene.
  useEffect(() => {
    sceneHandleRef.current?.toggleAutoRotate(autoRotate);
  }, [autoRotate]);

  /* ── Auto-rotate toggle ── */
  const handleToggleAutoRotate = () => {
    const next = !autoRotate;
    setAutoRotate(next);
    if (sceneHandleRef.current) {
      sceneHandleRef.current.toggleAutoRotate(next);
    }
  };

  /* ── Search Focus ── */
  const handleSearchSelect = (nodeId: string) => {
    if (sceneHandleRef.current) {
      sceneHandleRef.current.focusNode(nodeId);
    }
  };

  /* ── Run Entity Resolution ── */
  async function runResolution() {
    setResolving(true);
    setResolutionError(null);
    setResolutionAttempted(true);
    try {
      const result = await api.post(`/analysis/entities/${caseId}/resolve`);
      setCandidates(result.candidates || []);
    } catch (err) {
      setResolutionError(
        err instanceof Error ? err.message : "Could not analyze potential matches. Please try again."
      );
    } finally {
      setResolving(false);
    }
  }

  const nodes = graphData?.nodes || [];
  const metrics = graphData?.metrics;

  const getConnectionsForNode = (nodeId: string) => {
    if (!graphData) return [];
    return graphData.edges.flatMap((edge: any) => {
      const neighborId = edge.source === nodeId
        ? edge.target
        : edge.target === nodeId
          ? edge.source
          : null;
      if (!neighborId) return [];
      const neighbor = graphData.nodes.find((candidate: any) => candidate.id === neighborId);
      if (!neighbor) return [];
      return [{
        id: neighbor.id,
        label: neighbor.label || String(neighbor.id).slice(0, 12),
        type: neighbor.type || "OTHER",
        relationshipType: String(edge.type || "CONNECTED").replace(/_/g, " "),
        weight: Number(edge.weight || 1),
      }];
    });
  };

  const filteredSearchNodes = searchQuery
    ? nodes.filter((n) => n.label.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  return (
    <div className="grid lg:grid-cols-4 gap-4">
      {/* ── 3D Viewport Area ── */}
      <div className="lg:col-span-3 flex flex-col gap-3">
        {/* Top Control Bar */}
        <div className="flex items-center justify-between gap-3 flex-wrap bg-panel/80 backdrop-blur border hairline rounded-xl p-2.5">
          {/* Layout Mode Selector */}
          <div className="flex items-center gap-1">
            <span className="text-[10px] font-mono text-muted mr-1">3D VIEW:</span>
            {(
              [
                ["layered", "3D Strata (Layers)"],
                ["cluster", "3D Physics Cluster"],
                ["sphere", "Orbital Shell"],
              ] as const
            ).map(([mode, label]) => (
              <button
                key={mode}
                onClick={() => setLayoutMode(mode)}
                className={`text-[11px] font-mono px-2.5 py-1 rounded transition-all ${
                  layoutMode === mode
                    ? "bg-cyan/15 text-cyan border border-cyan/40 shadow-sm"
                    : "text-muted hover:text-text hover:bg-panel2 border border-transparent"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => sceneHandleRef.current?.resetView()}
              className="text-[11px] font-mono px-2.5 py-1 rounded border hairline text-muted hover:text-text hover:bg-panel2 transition-colors"
              title="Reset 3D camera to origin"
            >
              ⟲ Reset View
            </button>
            <button
              onClick={handleToggleAutoRotate}
              className={`text-[11px] font-mono px-2.5 py-1 rounded border transition-colors ${
                autoRotate
                  ? "border-cyan/40 bg-cyan/10 text-cyan"
                  : "hairline text-muted hover:text-text hover:bg-panel2"
              }`}
            >
              {autoRotate ? "▶ Auto-Rotate ON" : "⏸ Auto-Rotate OFF"}
            </button>
          </div>
        </div>

        {/* 3D Canvas Box */}
        <div
          ref={containerRef}
          className="relative rounded-2xl overflow-hidden border border-[#1A2235] shadow-2xl"
          style={{
            height: 580,
            background: "radial-gradient(ellipse at 50% 40%, #07101e 0%, #04060a 100%)",
          }}
        >
          {/* WebGL Canvas */}
          <canvas ref={canvasRef} className="w-full h-full block" />

          {/* Loading Overlay */}
          {loading && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 bg-black/60 backdrop-blur-sm">
              <div
                className="h-10 w-10 rounded-full border-2 animate-spin"
                style={{ borderColor: "#3FD0DC22", borderTopColor: "#3FD0DC" }}
              />
              <span className="text-xs font-mono text-cyan tracking-wider">
                SYNCHRONIZING 3D GRAPH ENGINE…
              </span>
            </div>
          )}

          {/* Error Overlay */}
          {error && !loading && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-3 p-6 text-center bg-black/80">
              <div className="text-danger text-sm font-mono">{error}</div>
              <button
                onClick={loadGraph}
                className="px-4 py-2 rounded text-xs font-mono bg-cyan/15 text-cyan border border-cyan/40 hover:bg-cyan/25"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty State Overlay */}
          {!loading && !error && nodes.length === 0 && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-8 text-center bg-black/40 backdrop-blur-[2px]">
              <div className="h-14 w-14 rounded-2xl bg-cyan/10 border border-cyan/30 flex items-center justify-center mb-4 shadow-lg shadow-cyan/10">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="28"
                  height="28"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#3FD0DC"
                  strokeWidth="1.75"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="6" cy="6" r="3" />
                  <circle cx="18" cy="18" r="3" />
                  <circle cx="18" cy="6" r="3" />
                  <line x1="8.59" y1="7.41" x2="15.42" y2="16.59" />
                  <line x1="8.59" y1="6" x2="15.41" y2="6" />
                </svg>
              </div>
              <h3 className="text-sm font-head text-text mb-1">
                No Graph Entities Extracted Yet
              </h3>
              <p className="text-xs text-muted max-w-sm mb-4 leading-relaxed">
                Upload files in the <strong>Evidence Vault</strong> tab and click{" "}
                <strong>Analyze Evidence</strong> to extract suspects, IPs, phones, and
                relationships into the 3D investigation universe.
              </p>
            </div>
          )}

          {/* Quick Hover Tooltip */}
          {hoveredNode && hoverPos && !selectedNode && (
            <div
              className="pointer-events-none absolute z-20 rounded-lg px-2.5 py-1.5 text-xs font-mono shadow-xl border backdrop-blur-md"
              style={{
                left: hoverPos.x + 16,
                top: hoverPos.y - 12,
                background: "rgba(6, 10, 18, 0.92)",
                borderColor: getMeta(hoveredNode.type).color + "66",
                color: "#E2E8F0",
              }}
            >
              <div className="flex items-center gap-1.5">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ background: getMeta(hoveredNode.type).color }}
                />
                <span style={{ color: getMeta(hoveredNode.type).color }}>
                  {getMeta(hoveredNode.type).label}:
                </span>
                <span className="font-bold">{hoveredNode.label}</span>
              </div>
            </div>
          )}

          {/* Controls Overlay Tips */}
          {!loading && nodes.length > 0 && (
            <div className="absolute bottom-3 left-3 z-10 flex items-center gap-2 text-[10px] font-mono text-muted bg-panel/70 backdrop-blur px-3 py-1.5 rounded-lg border hairline">
              <span>🖱 Left-drag rotate</span>
              <span>·</span>
              <span>Right-drag pan</span>
              <span>·</span>
              <span>Scroll zoom</span>
              <span>·</span>
              <span className="text-cyan font-bold">{nodes.length} nodes active</span>
            </div>
          )}

          {/* Selected Node Floating Card */}
          {selectedNode && (
            <div
              className="absolute top-3 right-3 z-20 w-72 rounded-xl p-4 shadow-2xl border backdrop-blur-xl animate-in fade-in slide-in-from-top-2"
              style={{
                background: "rgba(8, 12, 20, 0.94)",
                borderColor: getMeta(selectedNode.type).color + "77",
                boxShadow: `0 0 30px ${getMeta(selectedNode.type).color}22`,
              }}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{
                      background: getMeta(selectedNode.type).color,
                      boxShadow: `0 0 8px ${getMeta(selectedNode.type).color}`,
                    }}
                  />
                  <span
                    className="text-[11px] font-mono font-bold"
                    style={{ color: getMeta(selectedNode.type).color }}
                  >
                    {getMeta(selectedNode.type).label.toUpperCase()}
                  </span>
                </div>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="text-muted hover:text-text text-xs p-1"
                >
                  ✕
                </button>
              </div>

              <div className="text-sm font-mono text-text font-bold break-all mb-3">
                {selectedNode.label}
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] font-mono border-t pt-2 border-[#1E293B]">
                <div>
                  <div className="text-muted text-[10px]">PAGERANK</div>
                  <div className="text-cyan font-bold">
                    {(selectedNode.pagerank * 100).toFixed(2)}%
                  </div>
                </div>
                <div>
                  <div className="text-muted text-[10px]">CENTRALITY</div>
                  <div className="text-amber font-bold">
                    {(selectedNode.degree * 100).toFixed(1)}%
                  </div>
                </div>
              </div>

              <div className="mt-3 border-t border-[#1E293B] pt-2">
                <div className="mb-1.5 flex items-center justify-between text-[10px] font-mono text-muted">
                  <span>LINKED CONNECTIONS</span>
                  <span className="text-cyan">{selectedNode.connections.length}</span>
                </div>
                {selectedNode.connections.length > 0 ? (
                  <div className="max-h-32 space-y-1 overflow-y-auto pr-1">
                    {selectedNode.connections.map((connection) => (
                      <div
                        key={`${connection.id}-${connection.relationshipType}`}
                        className="flex items-start justify-between gap-2 rounded-md bg-white/[0.03] px-2 py-1.5"
                      >
                        <div className="min-w-0">
                          <div className="break-all text-[10px] font-mono text-text">
                            {connection.label}
                          </div>
                          <div className="mt-0.5 text-[9px] font-mono uppercase tracking-wide text-muted">
                            {getMeta(connection.type).label}
                          </div>
                        </div>
                        <span className="shrink-0 text-right text-[9px] font-mono text-cyan">
                          {connection.relationshipType}
                          {connection.weight > 1 ? ` · ×${connection.weight}` : ""}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-[10px] font-mono text-muted leading-relaxed">
                    No linked entities in this case graph.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Entity Type Filter Bar */}
        <div className="flex items-center gap-1.5 flex-wrap px-1">
          <span className="text-[10px] font-mono text-muted mr-1">FILTER:</span>
          <button
            onClick={() => setTypeFilter("ALL")}
            className={`text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
              typeFilter === "ALL"
                ? "bg-cyan/20 text-cyan border border-cyan/40"
                : "text-muted hover:text-text border border-transparent"
            }`}
          >
            ALL ({nodes.length})
          </button>
          {Object.entries(TYPE_META).map(([type, meta]) => {
            const count = nodes.filter((n) => n.type === type).length;
            if (count === 0) return null;
            return (
              <button
                key={type}
                onClick={() => setTypeFilter(type)}
                className={`flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded transition-colors ${
                  typeFilter === type
                    ? "border text-text"
                    : "text-muted hover:text-text border border-transparent"
                }`}
                style={{
                  borderColor: typeFilter === type ? meta.color : "transparent",
                  backgroundColor: typeFilter === type ? meta.color + "22" : "transparent",
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: meta.color }}
                />
                {meta.label} ({count})
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Side Intelligence Panel ── */}
      <div className="space-y-4">
        {/* Quick Entity Search & Fly-To */}
        <div className="panel rounded-xl p-4 space-y-3">
          <div className="text-[10px] font-mono text-cyan tracking-widest">
            NODE LOCATOR
          </div>
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search suspect, IP, phone…"
              className="w-full text-xs font-mono bg-panel2 border hairline rounded px-3 py-2 text-text placeholder:text-muted focus:border-cyan outline-none"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2 text-muted hover:text-text text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {searchQuery && (
            <div className="max-h-40 overflow-y-auto space-y-1 pr-1">
              {filteredSearchNodes.map((n) => {
                const meta = getMeta(n.type);
                return (
                  <button
                    key={n.id}
                    onClick={() => {
                      handleSearchSelect(n.id);
                      setSelectedNode({
                        id: n.id,
                        label: n.label,
                        type: n.type,
                        pagerank: 0,
                        degree: 0,
                        connections: getConnectionsForNode(n.id),
                      });
                    }}
                    className="w-full text-left p-2 rounded text-xs font-mono hover:bg-panel2 transition-colors flex items-center justify-between group"
                  >
                    <div className="truncate mr-2">
                      <span style={{ color: meta.color }}>● </span>
                      <span className="text-text group-hover:text-cyan">{n.label}</span>
                    </div>
                    <span className="text-[10px] text-muted">{meta.label}</span>
                  </button>
                );
              })}
              {filteredSearchNodes.length === 0 && (
                <div className="text-xs font-mono text-muted py-2 text-center">
                  No matching entities found.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Network Metrics Panel */}
        <div className="panel rounded-xl p-4 space-y-3">
          <div className="text-[10px] font-mono text-cyan tracking-widest">
            NETWORK METRICS (GRAPH THEORY)
          </div>
          {metrics ? (
            <div className="space-y-2">
              {(
                [
                  ["Total Nodes", metrics.node_count],
                  ["Total Edges", metrics.edge_count],
                  ["Graph Density", metrics.density != null ? (metrics.density * 100).toFixed(1) + "%" : "—"],
                  ["Community Clusters", metrics.community_count],
                ] as const
              ).map(([label, val]) => (
                <div key={label} className="flex justify-between items-center text-xs">
                  <span className="text-muted">{label}</span>
                  <span className="font-mono text-cyan bg-cyan/10 px-2 py-0.5 rounded border border-cyan/20">
                    {val ?? "—"}
                  </span>
                </div>
              ))}

              {metrics.disclaimer && (
                <div className="text-[10px] font-mono text-muted border-t hairline pt-2 mt-2 leading-relaxed">
                  {metrics.disclaimer}
                </div>
              )}
            </div>
          ) : (
            <div className="text-xs font-mono text-muted">
              No metrics available — analyze evidence documents to populate.
            </div>
          )}
        </div>

        {/* Entity Resolution Panel */}
        <div className="panel rounded-xl p-4 space-y-3">
          <div className="text-[10px] font-mono text-amber tracking-widest">
            ENTITY RESOLUTION (CROSS-ALIAS)
          </div>
          <button
            onClick={runResolution}
            disabled={resolving}
            className="w-full rounded px-3 py-2 text-xs font-mono transition-all disabled:opacity-40 bg-amber/10 border border-amber/30 text-amber hover:bg-amber/20"
          >
            {resolving ? "Analyzing Aliases…" : "Find Potential Matches"}
          </button>

          <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
            {resolutionError && (
              <div
                role="alert"
                className="rounded border border-danger/30 bg-danger/10 px-2.5 py-2 text-[10px] font-mono text-danger leading-relaxed"
              >
                Match analysis failed: {resolutionError}
              </div>
            )}
            {candidates.map((c) => (
              <div
                key={c.id}
                onClick={() => {
                  if (c.entity_a_id) handleSearchSelect(c.entity_a_id);
                }}
                className="rounded p-2.5 text-xs bg-amber/5 border border-amber/20 hover:border-amber/50 cursor-pointer transition-all font-mono space-y-1.5 group"
                title="Click to locate entity in 3D graph"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber/15 text-amber font-bold">
                    {(c.confidence_score * 100).toFixed(0)}% MATCH
                  </span>
                  <span className="text-[10px] text-muted group-hover:text-amber transition-colors">
                    Locate 3D ↗
                  </span>
                </div>

                <div className="text-[11px] font-bold space-y-0.5">
                  <div className="text-cyan truncate">● {c.entity_a_value || c.entity_a_id?.slice(0, 12)}</div>
                  <div className="text-amber truncate">⟷ {c.entity_b_value || c.entity_b_id?.slice(0, 12)}</div>
                </div>

                <div className="text-muted text-[10px] leading-relaxed border-t border-[#1F2937] pt-1">
                  {c.supporting_evidence?.[0] || "Shared infrastructure or behavioral correlation"}
                </div>
              </div>
            ))}
            {!resolving && candidates.length === 0 && (
              <div className="text-xs font-mono text-muted text-center py-3">
                {resolutionError
                  ? "Fix the issue above, then run the match analysis again."
                  : resolutionAttempted
                    ? "No likely matches found yet. Analyze more evidence or add more entities to this case."
                    : "No potential matches scored yet. Click above to analyze."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
