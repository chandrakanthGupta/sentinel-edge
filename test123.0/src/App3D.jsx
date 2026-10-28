import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, Line, ContactShadows, Environment } from '@react-three/drei';
import * as THREE from 'three';

const initialNodes = [
  { id: 'central', name: 'Central Block', type: 'building', group: 'Core Network', pos: [0, 0, 0], status: 'normal', ip: '10.0.10.0/24' },
  { id: 'blockA', name: 'A Block', type: 'building', group: 'Academic Building', pos: [-4.35, 0, 3.0], status: 'attack', ip: '10.0.12.0/24' },
  { id: 'blockB', name: 'B Block', type: 'building', group: 'Academic Building', pos: [4.35, 0, 3.0], status: 'normal', ip: '10.0.14.0/24' },
  { id: 'blockC', name: 'C Block', type: 'building', group: 'Academic Building', pos: [4.35, 0, -3.0], status: 'suspicious', ip: '10.0.16.0/24' },
  { id: 'blockD', name: 'D Block', type: 'building', group: 'Academic Building', pos: [-4.35, 0, -3.0], status: 'normal', ip: '10.0.20.0/24' },
  { id: 'siemens', name: 'Siemens Block', type: 'building', group: 'Specialized Labs', pos: [0, 0, 7.45], status: 'normal', ip: '10.0.30.0/24' },
  { id: 'viva', name: 'Viva School', type: 'building', group: 'Connected Campus Site', pos: [7.2, 0, -5.2], status: 'normal', ip: '10.0.32.0/24' },
  { id: 'edge1', name: 'Edge Node 01 · A / Siemens', type: 'edge', group: 'Distributed Monitoring', pos: [-5.65, 0, -0.55], status: 'normal', ip: '10.0.0.11' },
  { id: 'edge2', name: 'Edge Node 02 · B / D', type: 'edge', group: 'Distributed Monitoring', pos: [5.65, 0, -0.55], status: 'normal', ip: '10.0.0.12' },
  { id: 'edge3', name: 'Edge Node 03 · C / Central', type: 'edge', group: 'Distributed Monitoring', pos: [0, 0, 4.95], status: 'normal', ip: '10.0.0.13' },
  { id: 'gw', name: 'Campus Edge Router', type: 'gateway', group: 'Campus Perimeter', pos: [8.2, 0, 2.4], status: 'normal', ip: '10.0.0.1' },
  { id: 'internet', name: 'Internet Uplink', type: 'internet', group: 'External Network', pos: [0, 0, -7.35], status: 'normal', ip: 'WAN / TLS' },
];

const links = [
  ['blockA', 'edge1'], ['siemens', 'edge1'], ['viva', 'edge2'],
  ['blockB', 'edge2'], ['blockD', 'edge2'], ['blockC', 'edge3'],
  ['central', 'edge1'], ['central', 'edge2'], ['central', 'edge3'],
  ['edge1', 'gw'], ['edge2', 'gw'], ['edge3', 'gw'], ['gw', 'internet'],
  ['central', 'blockA'], ['central', 'blockB'], ['central', 'blockC'], ['central', 'blockD'],
  ['blockA', 'siemens'], ['central', 'siemens'], ['central', 'viva']
];

const statusColors = { normal: '#35e6a1', suspicious: '#ffb547', attack: '#ff4f67' };

export const BLOCK_DETAILS = {
  siemens: {
    id: 'siemens',
    name: 'Siemens Block',
    code: 'SIEMENS',
    subnet: '10.0.30.0/24',
    icon: '⚡',
    floors: [
      { floor: '4th Floor', branch: 'IT Branch', labs: 2, systems: 120, desc: 'IT Branch High-Density Software & Cloud Labs' },
      { floor: '3rd Floor', branch: 'CSE Branch', labs: 4, systems: 240, desc: 'CSE Advanced Coding, AI & Data Analytics Labs' },
      { floor: '2nd Floor', branch: 'ECE Branch', labs: 2, systems: 120, desc: 'ECE Embedded Systems, IoT & VLSI Digital Labs' }
    ],
    totalLabs: 8,
    systemsPerLab: 60,
    totalSystems: 480
  },
  blockA: {
    id: 'blockA',
    name: 'A Block',
    code: 'A-BLOCK',
    subnet: '10.0.12.0/24',
    icon: '🏢',
    floors: [
      { floor: '2nd Floor', branch: 'Academic Computing Branch', labs: 2, systems: 120, desc: 'Core Programming, Algorithms & Systems Labs' }
    ],
    totalLabs: 2,
    systemsPerLab: 60,
    totalSystems: 120
  },
  blockB: {
    id: 'blockB',
    name: 'B Block',
    code: 'B-BLOCK',
    subnet: '10.0.14.0/24',
    icon: '🏢',
    floors: [
      { floor: '2nd Floor', branch: 'Electronics & Hardware Systems', labs: 2, systems: 120, desc: 'Hardware Engineering & Microprocessor Simulation Labs' }
    ],
    totalLabs: 2,
    systemsPerLab: 60,
    totalSystems: 120
  },
  blockC: {
    id: 'blockC',
    name: 'C Block',
    code: 'C-BLOCK',
    subnet: '10.0.16.0/24',
    icon: '🏢',
    floors: [
      { floor: '2nd Floor', branch: 'Cyber Security & Network Systems', labs: 2, systems: 120, desc: 'Network Security, Cryptography & Systems Labs' }
    ],
    totalLabs: 2,
    systemsPerLab: 60,
    totalSystems: 120
  },
  blockD: {
    id: 'blockD',
    name: 'D Block',
    code: 'D-BLOCK',
    subnet: '10.0.20.0/24',
    icon: '📐',
    floors: [
      { floor: '2nd Floor', branch: 'CAD Simulation Lab', labs: 1, systems: 60, desc: 'Computer Aided Design (CAD) Modeling Workstations' },
      { floor: '3rd Floor', branch: 'CAM Manufacturing Lab', labs: 1, systems: 60, desc: 'Computer Aided Manufacturing (CAM) CNC Simulation Lab' }
    ],
    totalLabs: 2,
    systemsPerLab: 60,
    totalSystems: 120
  },
  central: {
    id: 'central',
    name: 'Central Block',
    code: 'CENTRAL',
    subnet: '10.0.10.0/24',
    icon: '🏛️',
    floors: [
      { floor: 'Ground Floor', branch: 'Central Edge Router Core & SPAN Tap', labs: 1, systems: 60, desc: 'Main SPAN Tap Gateway & Edge Server Room' },
      { floor: '1st Floor', branch: 'Administrative & Faculty Lab', labs: 1, systems: 60, desc: 'Campus Central Systems Operations Lab' }
    ],
    totalLabs: 2,
    systemsPerLab: 60,
    totalSystems: 120
  },
  viva: {
    id: 'viva',
    name: 'Viva School',
    code: 'VIVA',
    subnet: '10.0.32.0/24',
    icon: '🏫',
    floors: [
      { floor: '1st Floor', branch: 'Foundational Computing Lab', labs: 1, systems: 60, desc: 'Preparatory Institutional Computing Lab' }
    ],
    totalLabs: 1,
    systemsPerLab: 60,
    totalSystems: 60
  }
};

// --- TEXTURE CACHES & GENERATORS ---

const terracottaTextureCache = new Map();
function getTerracottaSandstoneTexture() {
  if (terracottaTextureCache.has('terracotta')) return terracottaTextureCache.get('terracotta');
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#a84c35';
  ctx.fillRect(0, 0, 512, 512);

  const rowH = 22;
  let seed = 819;
  const rand = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };

  for (let y = 0; y < 512; y += rowH) {
    ctx.fillStyle = '#5d2417';
    ctx.fillRect(0, y, 512, 2.2);

    const offset = (Math.floor(y / rowH) % 2) * 36;
    for (let x = -72 + offset; x < 580; x += 72) {
      ctx.fillStyle = '#5d2417';
      ctx.fillRect(x, y, 2.2, rowH);

      const r = 158 + Math.floor(rand() * 30);
      const g = 70 + Math.floor(rand() * 20);
      const b = 50 + Math.floor(rand() * 16);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x + 2.2, y + 2.2, 67.6, rowH - 2.8);
    }
  }

  for (let i = 0; i < 3000; i++) {
    const a = 0.025 + rand() * 0.07;
    ctx.fillStyle = rand() > 0.5 ? `rgba(245,220,195,${a})` : `rgba(60,20,10,${a})`;
    ctx.fillRect(rand() * 512, rand() * 512, 1 + rand() * 2, 1 + rand() * 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  terracottaTextureCache.set('terracotta', texture);
  return texture;
}

const flagTextureCache = new Map();
function getIndianFlagTexture() {
  if (flagTextureCache.has('flag')) return flagTextureCache.get('flag');
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 170;
  const ctx = canvas.getContext('2d');

  // Saffron
  ctx.fillStyle = '#ff9933';
  ctx.fillRect(0, 0, 256, 56.6);

  // White
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 56.6, 256, 56.6);

  // Green
  ctx.fillStyle = '#138808';
  ctx.fillRect(0, 113.3, 256, 56.7);

  // Ashoka Chakra
  const cx = 128, cy = 85, radius = 22;
  ctx.strokeStyle = '#000080';
  ctx.lineWidth = 2.2;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.fillStyle = '#000080';
  ctx.beginPath();
  ctx.arc(cx, cy, 3.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 1.2;
  for (let i = 0; i < 24; i++) {
    const angle = (i * Math.PI) / 12;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(angle) * radius, cy + Math.sin(angle) * radius);
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  flagTextureCache.set('flag', texture);
  return texture;
}

const siemensSignCache = new Map();
function getSiemensSignTexture() {
  if (siemensSignCache.has('siemens')) return siemensSignCache.get('siemens');
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = '#00646e';
  ctx.fillRect(0, 0, 256, 64);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 34px Inter, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SIEMENS', 128, 33);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  siemensSignCache.set('siemens', texture);
  return texture;
}

function makeSurfaceTexture(base, variance = 12, seed = 1) {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  const image = ctx.createImageData(canvas.width, canvas.height);
  let state = seed >>> 0;
  const random = () => { state = (state * 1664525 + 1013904223) >>> 0; return state / 4294967296; };
  for (let i = 0; i < image.data.length; i += 4) {
    const n = (random() - 0.5) * variance * 2;
    image.data[i] = Math.max(0, Math.min(255, base[0] + n));
    image.data[i + 1] = Math.max(0, Math.min(255, base[1] + n));
    image.data[i + 2] = Math.max(0, Math.min(255, base[2] + n));
    image.data[i + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
  for (let i = 0; i < 1500; i++) {
    const alpha = 0.025 + random() * 0.07;
    ctx.fillStyle = `rgba(${random() > 0.5 ? 255 : 0},${random() > 0.5 ? 255 : 0},${random() > 0.5 ? 255 : 0},${alpha})`;
    const size = 0.4 + random() * 1.4;
    ctx.fillRect(random() * 256, random() * 256, size, size);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

// --- ARCHITECTURAL BUILDING MODELS ---

// 1. SIEMENS BLOCK (Photo 1 & Photo 5)
function SiemensBlockModel({ selected }) {
  const terracotta = useMemo(() => getTerracottaSandstoneTexture(), []);
  const flagTex = useMemo(() => getIndianFlagTexture(), []);
  const signTex = useMemo(() => getSiemensSignTexture(), []);
  const width = 3.4;
  const height = 2.16;
  const depth = 2.1;

  return (
    <group>
      {/* Main Red Terracotta Sandstone Body */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial map={terracotta || undefined} color="#ffffff" roughness={0.9} />
      </mesh>

      {/* Parapet with ventilation slots along the top edge (Photo 5) */}
      <mesh position={[0, height + 0.06, 0]} castShadow>
        <boxGeometry args={[width + 0.08, 0.12, depth + 0.08]} />
        <meshStandardMaterial color="#9d432f" roughness={0.92} />
      </mesh>
      {Array.from({ length: 6 }, (_, i) => (
        <mesh key={`slot-${i}`} position={[-1.2 + i * 0.48, height + 0.06, depth / 2 + 0.045]}>
          <boxGeometry args={[0.22, 0.045, 0.02]} />
          <meshBasicMaterial color="#1a0a06" />
        </mesh>
      ))}

      {/* Front Windows with Vertical Terracotta Fins & AC units */}
      {Array.from({ length: 4 }, (_, floor) => {
        const y = 0.35 + floor * 0.48;
        return (
          <group key={`siemens-fl-${floor}`}>
            {Array.from({ length: 7 }, (_, col) => {
              const x = -1.35 + col * 0.45;
              // Skip center columns where portal sits
              if (floor < 3 && Math.abs(x) < 0.65) return null;
              return (
                <group key={`win-${floor}-${col}`} position={[x, y, depth / 2 + 0.015]}>
                  {/* Window glass with reveal */}
                  <mesh>
                    <boxGeometry args={[0.26, 0.28, 0.02]} />
                    <meshStandardMaterial color="#1f4459" metalness={0.4} roughness={0.2} />
                  </mesh>
                  {/* Vertical terracotta fin */}
                  <mesh position={[0.15, 0, 0.02]}>
                    <boxGeometry args={[0.04, 0.38, 0.05]} />
                    <meshStandardMaterial color="#a0442e" roughness={0.9} />
                  </mesh>
                  {/* White AC Outdoor Compressor Unit (Photo 5) */}
                  <mesh position={[0, -0.18, 0.035]} castShadow>
                    <boxGeometry args={[0.085, 0.055, 0.045]} />
                    <meshStandardMaterial color="#e5e5e3" roughness={0.65} />
                  </mesh>
                </group>
              );
            })}
          </group>
        );
      })}

      {/* CENTERPIECE 3-STORY WHITE PORTAL (Photo 5) */}
      <group position={[0, 0, depth / 2 + 0.14]}>
        {/* Main White Frame Structure */}
        <mesh position={[0, 1.05, 0]} castShadow receiveShadow>
          <boxGeometry args={[1.36, 1.95, 0.28]} />
          <meshStandardMaterial color="#f4f1e9" roughness={0.7} />
        </mesh>

        {/* Ground Floor High Breezeway Cutout */}
        <mesh position={[0, 0.34, 0]}>
          <boxGeometry args={[0.96, 0.65, 0.32]} />
          <meshBasicMaterial color="#0c1722" />
        </mesh>

        {/* Siemens Signboard inside breezeway */}
        <mesh position={[0, 0.58, 0.12]}>
          <boxGeometry args={[0.62, 0.13, 0.02]} />
          <meshBasicMaterial map={signTex || undefined} />
        </mesh>

        {/* 2nd & 3rd Floor Reflective 3-Bay Blue Glass Curtain Wall (Photo 5) */}
        <mesh position={[0, 1.34, 0.1]}>
          <boxGeometry args={[1.08, 0.78, 0.04]} />
          <meshStandardMaterial color="#1a4d76" metalness={0.88} roughness={0.12} envMapIntensity={1.5} />
        </mesh>
        {/* White Vertical Dividing Mullions */}
        {[-0.18, 0.18].map((xm, i) => (
          <mesh key={i} position={[xm, 1.34, 0.125]}>
            <boxGeometry args={[0.035, 0.8, 0.02]} />
            <meshStandardMaterial color="#f4f1e9" roughness={0.6} />
          </mesh>
        ))}

        {/* Front Entrance Steps */}
        {Array.from({ length: 4 }, (_, i) => (
          <mesh key={`st-${i}`} position={[0, 0.02 + i * 0.03, 0.22 + (3 - i) * 0.12]} receiveShadow>
            <boxGeometry args={[1.45, 0.035, 0.14]} />
            <meshStandardMaterial color="#cfccc4" roughness={0.85} />
          </mesh>
        ))}
      </group>

      {/* LEFT WING WITH INDIAN NATIONAL FLAG MURAL (Tiranga) (Photo 1) */}
      <group position={[-width / 2 - 0.22, 0, 0.15]}>
        {/* White Corner Tower */}
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.78, height, 1.25]} />
          <meshStandardMaterial color="#f4f0e6" roughness={0.72} />
        </mesh>

        {/* Indian Flag Mural painted on side wall */}
        <mesh position={[-0.395, 0.88, 0]} rotation={[0, -Math.PI / 2, 0]}>
          <planeGeometry args={[0.72, 0.48]} />
          <meshBasicMaterial map={flagTex || undefined} />
        </mesh>

        {/* White Pergola Rafters across roof terrace (Photo 1) */}
        {Array.from({ length: 5 }, (_, i) => (
          <mesh key={`perg-${i}`} position={[-0.25 + i * 0.13, height + 0.14, 0]}>
            <boxGeometry args={[0.035, 0.05, 1.15]} />
            <meshStandardMaterial color="#ffffff" roughness={0.6} />
          </mesh>
        ))}
      </group>

      {/* Rooftop Solar Panels on Siemens Block */}
      <RooftopSolarArray x={0.5} z={-0.12} width={2.0} depth={1.4} rows={2} cols={5} y={height + 0.07} />

      {/* Parked vehicles in front of Siemens Block (Photo 5: Blue SUV & White Van) */}
      <MiniVehicle position={[-1.25, 0.09, depth / 2 + 1.2]} color="#1b4d8a" isSuv />
      <MiniVehicle position={[1.4, 0.1, depth / 2 + 1.2]} color="#ebebe8" isVan />
    </group>
  );
}

// 2. CENTRAL BLOCK (Photo 3)
function CentralBlockModel({ selected }) {
  const terracotta = useMemo(() => getTerracottaSandstoneTexture(), []);
  const width = 3.3;
  const height = 2.18;
  const depth = 2.2;

  return (
    <group>
      {/* Central Terracotta Sandstone Core */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.45, height, depth]} />
        <meshStandardMaterial map={terracotta || undefined} color="#ffffff" roughness={0.9} />
      </mesh>

      {/* Left Stepped Blue Glass Curtain Wall Wing (Photo 3) */}
      <group position={[-1.15, 0, 0]}>
        {/* Terracotta Base */}
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.95, 0.84, depth * 0.92]} />
          <meshStandardMaterial map={terracotta || undefined} color="#ffffff" roughness={0.9} />
        </mesh>
        {/* Stepped Blue Reflective Glass Wall */}
        <mesh position={[0, 1.35, 0.04]} castShadow>
          <boxGeometry args={[0.92, 1.02, depth * 0.85]} />
          <meshStandardMaterial color="#194c79" metalness={0.9} roughness={0.12} envMapIntensity={1.5} />
        </mesh>
      </group>

      {/* Right Stepped Blue Glass Curtain Wall Wing (Photo 3) */}
      <group position={[1.15, 0, 0]}>
        {/* Terracotta Base */}
        <mesh position={[0, 0.42, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.95, 0.84, depth * 0.92]} />
          <meshStandardMaterial map={terracotta || undefined} color="#ffffff" roughness={0.9} />
        </mesh>
        {/* Stepped Blue Reflective Glass Wall */}
        <mesh position={[0, 1.35, 0.04]} castShadow>
          <boxGeometry args={[0.92, 1.02, depth * 0.85]} />
          <meshStandardMaterial color="#194c79" metalness={0.9} roughness={0.12} envMapIntensity={1.5} />
        </mesh>
      </group>

      {/* GRAND STEPPED WHITE CENTRAL PORTAL TOWER (Photo 3) */}
      <group position={[0, 0, depth / 2 + 0.08]}>
        {/* Outer White Portal Frame */}
        <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
          <boxGeometry args={[0.92, height, 0.24]} />
          <meshStandardMaterial color="#f4f1e8" roughness={0.65} />
        </mesh>

        {/* Top-Tier Open Frame Cutout (see-through to sky) */}
        <mesh position={[0, height - 0.35, 0]}>
          <boxGeometry args={[0.62, 0.42, 0.3]} />
          <meshBasicMaterial color="#9eae9d" />
        </mesh>

        {/* Mid-Tier Balcony Window with Pillars */}
        <mesh position={[0, 1.15, 0.08]}>
          <boxGeometry args={[0.62, 0.45, 0.06]} />
          <meshStandardMaterial color="#18364b" metalness={0.6} roughness={0.25} />
        </mesh>
        {[-0.14, 0.14].map((xp, i) => (
          <mesh key={i} position={[xp, 1.15, 0.12]}>
            <boxGeometry args={[0.04, 0.46, 0.03]} />
            <meshStandardMaterial color="#f4f1e8" />
          </mesh>
        ))}

        {/* Ground Floor Entrance Portico */}
        <mesh position={[0, 0.34, 0.06]}>
          <boxGeometry args={[0.68, 0.58, 0.18]} />
          <meshBasicMaterial color="#0c1620" />
        </mesh>
      </group>

      {/* Flanking White Balcony Wings (Background corridor wings in Photo 3) */}
      {[-1, 1].map((side, i) => (
        <group key={`balc-${i}`} position={[side * (width / 2 + 0.38), 0, -depth * 0.1]}>
          {Array.from({ length: 4 }, (_, f) => (
            <mesh key={`fl-${f}`} position={[0, 0.28 + f * 0.48, 0]} castShadow>
              <boxGeometry args={[0.68, 0.06, depth * 0.75]} />
              <meshStandardMaterial color="#f2ede4" roughness={0.7} />
            </mesh>
          ))}
          {/* Vertical pillars */}
          <mesh position={[0, height / 2, depth * 0.35]} castShadow>
            <boxGeometry args={[0.06, height, 0.06]} />
            <meshStandardMaterial color="#f2ede4" />
          </mesh>
        </group>
      ))}

      {/* Central Concrete Walkway leading to portal */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.008, depth / 2 + 1.2]} receiveShadow>
        <planeGeometry args={[1.2, 2.3]} />
        <meshStandardMaterial color="#c6c2b8" roughness={0.92} />
      </mesh>

      {/* Flagpole on front lawn (Photo 3) */}
      <group position={[1.4, 0, depth / 2 + 1.1]}>
        <mesh position={[0, 0.65, 0]} castShadow>
          <cylinderGeometry args={[0.012, 0.016, 1.3, 8]} />
          <meshStandardMaterial color="#d8d8d8" metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh position={[0.11, 1.18, 0]}>
          <boxGeometry args={[0.2, 0.12, 0.006]} />
          <meshStandardMaterial color="#1a4575" />
        </mesh>
      </group>

      {/* Rooftop Solar Panels on Stepped Wings and Central Core */}
      <RooftopSolarArray x={-1.15} z={0.04} width={0.82} depth={1.35} rows={2} cols={2} y={1.88} />
      <RooftopSolarArray x={1.15} z={0.04} width={0.82} depth={1.35} rows={2} cols={2} y={1.88} />
      <RooftopSolarArray x={0} z={-0.35} width={1.25} depth={1.05} rows={2} cols={3} y={height + 0.06} />
    </group>
  );
}

// 3. ACADEMIC BLOCK (Blocks A, B, C, D - Photo 2 & Photo 4)
function AcademicBlockModel({ node, selected }) {
  const terracotta = useMemo(() => getTerracottaSandstoneTexture(), []);
  const width = 2.7;
  const height = 2.16;
  const depth = 1.95;

  return (
    <group>
      {/* 4-Story Red Terracotta Sandstone Body */}
      <mesh position={[0, height / 2, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial map={terracotta || undefined} color="#ffffff" roughness={0.9} />
      </mesh>

      {/* Vertical Column Fins & AC Units on Outer Facades (Photo 2) */}
      {Array.from({ length: 4 }, (_, floor) => {
        const y = 0.35 + floor * 0.48;
        return (
          <group key={`acad-fl-${floor}`}>
            {Array.from({ length: 5 }, (_, col) => {
              const x = -0.9 + col * 0.45;
              return (
                <group key={`awin-${floor}-${col}`} position={[x, y, depth / 2 + 0.015]}>
                  {/* Window reveal */}
                  <mesh>
                    <boxGeometry args={[0.28, 0.28, 0.02]} />
                    <meshStandardMaterial color="#214256" metalness={0.35} roughness={0.25} />
                  </mesh>
                  {/* Deep vertical terracotta column fin (Photo 2) */}
                  <mesh position={[0.17, 0, 0.035]}>
                    <boxGeometry args={[0.045, 0.44, 0.07]} />
                    <meshStandardMaterial color="#9c422c" roughness={0.92} />
                  </mesh>
                  {/* AC Outdoor Unit */}
                  <mesh position={[0, -0.19, 0.035]} castShadow>
                    <boxGeometry args={[0.08, 0.05, 0.04]} />
                    <meshStandardMaterial color="#e5e2db" roughness={0.7} />
                  </mesh>
                </group>
              );
            })}
          </group>
        );
      })}

      {/* 2-Story Open Corner Balcony / Loggia Cutout (Photo 2 corner) */}
      <mesh position={[-width / 2 + 0.28, 0.85, depth / 2 - 0.28]}>
        <boxGeometry args={[0.55, 0.95, 0.55]} />
        <meshBasicMaterial color="#1a0b07" />
      </mesh>

      {/* Inner Facade: Multi-tier White Verandahs & External Zigzag Staircase (Photo 4) */}
      <group position={[0, 0, -depth / 2 - 0.1]}>
        {Array.from({ length: 4 }, (_, f) => (
          <mesh key={`ver-${f}`} position={[0, 0.3 + f * 0.48, 0]} castShadow>
            <boxGeometry args={[width * 0.9, 0.06, 0.22]} />
            <meshStandardMaterial color="#f4f1e8" roughness={0.7} />
          </mesh>
        ))}
        {/* External White Zigzag Staircase (Photo 4) */}
        <mesh position={[0.65, 0.95, 0.08]} rotation={[0, 0, 0.42]} castShadow>
          <boxGeometry args={[0.18, 1.65, 0.16]} />
          <meshStandardMaterial color="#f4f1e8" roughness={0.7} />
        </mesh>
      </group>

      {/* Roof Parapet with square openings (Photo 4) */}
      <mesh position={[0, height + 0.07, 0]} castShadow>
        <boxGeometry args={[width + 0.06, 0.12, depth + 0.06]} />
        <meshStandardMaterial color="#f4f1e8" roughness={0.8} />
      </mesh>
      {Array.from({ length: 4 }, (_, i) => (
        <mesh key={`sq-${i}`} position={[-0.75 + i * 0.5, height + 0.07, depth / 2 + 0.035]}>
          <boxGeometry args={[0.18, 0.07, 0.02]} />
          <meshBasicMaterial color="#120603" />
        </mesh>
      ))}

      {/* Rooftop Solar Panels Array */}
      <RooftopSolarArray width={2.3} depth={1.45} rows={2} cols={5} y={height + 0.07} />
    </group>
  );
}

// Rooftop Photovoltaic Solar Panels Array
function RooftopSolarArray({
  width = 2.2,
  depth = 1.4,
  rows = 2,
  cols = 5,
  tilt = 0.25,
  x = 0,
  y = 2.24,
  z = 0
}) {
  const panelW = (width - 0.2) / cols;
  const panelD = Math.min(0.48, (depth - 0.25) / rows);

  return (
    <group position={[x, y, z]}>
      {Array.from({ length: rows }, (_, r) => {
        const pz = -depth / 2 + 0.28 + r * ((depth - 0.56) / Math.max(1, rows - 1));
        return (
          <group key={`solar-row-${r}`}>
            {/* Front & Rear Mounting Rails */}
            <mesh position={[0, 0.03, pz - panelD * 0.28]} castShadow>
              <boxGeometry args={[width * 0.94, 0.022, 0.02]} />
              <meshStandardMaterial color="#8e97a0" metalness={0.8} roughness={0.3} />
            </mesh>
            <mesh position={[0, 0.07, pz + panelD * 0.28]} castShadow>
              <boxGeometry args={[width * 0.94, 0.022, 0.02]} />
              <meshStandardMaterial color="#8e97a0" metalness={0.8} roughness={0.3} />
            </mesh>

            {/* Support Stanchions / Legs */}
            {[-width * 0.38, 0, width * 0.38].map((lx, li) => (
              <React.Fragment key={`leg-${li}`}>
                <mesh position={[lx, 0.02, pz - panelD * 0.28]}>
                  <cylinderGeometry args={[0.012, 0.012, 0.04, 6]} />
                  <meshStandardMaterial color="#7a838c" metalness={0.7} />
                </mesh>
                <mesh position={[lx, 0.04, pz + panelD * 0.28]}>
                  <cylinderGeometry args={[0.012, 0.012, 0.08, 6]} />
                  <meshStandardMaterial color="#7a838c" metalness={0.7} />
                </mesh>
              </React.Fragment>
            ))}

            {/* Individual Solar PV Panels */}
            {Array.from({ length: cols }, (_, c) => {
              const px = -width / 2 + 0.15 + c * ((width - 0.3) / Math.max(1, cols - 1));
              return (
                <group key={`panel-${r}-${c}`} position={[px, 0.06, pz]} rotation={[-tilt, 0, 0]}>
                  {/* Aluminum Panel Frame */}
                  <mesh castShadow>
                    <boxGeometry args={[panelW * 0.92, 0.016, panelD * 0.88]} />
                    <meshStandardMaterial color="#d8dde3" metalness={0.85} roughness={0.25} />
                  </mesh>

                  {/* High-Efficiency Dark Blue Monocrystalline Photovoltaic Silicon Cell */}
                  <mesh position={[0, 0.009, 0]}>
                    <boxGeometry args={[panelW * 0.86, 0.005, panelD * 0.82]} />
                    <meshStandardMaterial
                      color="#0c233c"
                      emissive="#081b2e"
                      emissiveIntensity={0.16}
                      metalness={0.92}
                      roughness={0.12}
                      envMapIntensity={1.5}
                    />
                  </mesh>

                  {/* Silver Contact Busbars / Grid Lines */}
                  {[-panelW * 0.22, 0, panelW * 0.22].map((bx, bi) => (
                    <mesh key={`bus-${bi}`} position={[bx, 0.013, 0]}>
                      <boxGeometry args={[0.006, 0.003, panelD * 0.8]} />
                      <meshBasicMaterial color="#89b2d8" />
                    </mesh>
                  ))}
                  <mesh position={[0, 0.013, 0]}>
                    <boxGeometry args={[panelW * 0.84, 0.003, 0.006]} />
                    <meshBasicMaterial color="#739bbd" />
                  </mesh>
                </group>
              );
            })}
          </group>
        );
      })}

      {/* Rooftop Solar Inverter Box */}
      <group position={[width * 0.42, 0.08, -depth * 0.36]}>
        <mesh castShadow>
          <boxGeometry args={[0.18, 0.16, 0.12]} />
          <meshStandardMaterial color="#d4dadf" metalness={0.5} roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.02, 0.062]}>
          <boxGeometry args={[0.08, 0.04, 0.006]} />
          <meshBasicMaterial color="#1a2d3d" />
        </mesh>
      </group>
    </group>
  );
}

// Open Air Amphitheater / Stepped Seating (Photo 4)
function Amphitheater({ position }) {
  const steps = 6;
  return (
    <group position={position}>
      {/* Side white wing walls */}
      <mesh position={[-0.88, 0.28, 0]} rotation={[0, 0, 0.38]}>
        <boxGeometry args={[0.08, 0.65, 1.2]} />
        <meshStandardMaterial color="#f2ede4" roughness={0.8} />
      </mesh>
      <mesh position={[0.88, 0.28, 0]} rotation={[0, 0, -0.38]}>
        <boxGeometry args={[0.08, 0.65, 1.2]} />
        <meshStandardMaterial color="#f2ede4" roughness={0.8} />
      </mesh>
      {/* Stepped seating with alternating green and red stripes (Photo 4) */}
      {Array.from({ length: steps }, (_, i) => (
        <mesh key={`step-${i}`} position={[0, 0.05 + i * 0.07, (steps - i) * 0.16 - 0.5]} receiveShadow>
          <boxGeometry args={[1.65 - i * 0.08, 0.07, 0.18]} />
          <meshStandardMaterial color={i % 2 === 0 ? '#8e2b20' : '#276c38'} roughness={0.9} />
        </mesh>
      ))}
    </group>
  );
}

// Mini vehicle for campus realism
function MiniVehicle({ position, color = '#1a4e8c', isSuv = false, isVan = false }) {
  return (
    <group position={position}>
      <mesh position={[0, 0.07, 0]} castShadow>
        <boxGeometry args={[0.34, 0.11, 0.65]} />
        <meshStandardMaterial color={color} metalness={0.4} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.16, isSuv ? -0.04 : 0]} castShadow>
        <boxGeometry args={[0.3, 0.09, isSuv ? 0.38 : 0.5]} />
        <meshStandardMaterial color={isVan ? '#e8e8e5' : '#253545'} metalness={0.5} roughness={0.2} />
      </mesh>
      {/* Wheels */}
      {[-0.17, 0.17].map((xw, ix) =>
        [-0.18, 0.18].map((zw, iz) => (
          <mesh key={`${ix}-${iz}`} position={[xw, 0.035, zw]} rotation={[0, 0, Math.PI / 2]}>
            <cylinderGeometry args={[0.045, 0.045, 0.035, 8]} />
            <meshStandardMaterial color="#1a1a1a" roughness={0.9} />
          </mesh>
        ))
      )}
    </group>
  );
}

// REAL PALM TREE (Present in all photos)
function PalmTree({ position, scale = 1 }) {
  const frondCount = 9;
  return (
    <group position={position} scale={scale}>
      {/* Slender curved trunk */}
      <mesh position={[0, 0.72, 0]} rotation={[0.03, 0.06, -0.03]} castShadow>
        <cylinderGeometry args={[0.042, 0.078, 1.45, 7]} />
        <meshStandardMaterial color="#6a5440" roughness={0.95} />
      </mesh>
      {/* Crown base */}
      <group position={[0.04, 1.44, -0.04]}>
        <mesh position={[0, 0.02, 0]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="#2d5e2d" roughness={0.8} />
        </mesh>
        {Array.from({ length: frondCount }, (_, i) => {
          const angle = (i * Math.PI * 2) / frondCount;
          return (
            <group key={i} rotation={[0.42 + (i % 2) * 0.14, angle, 0]}>
              <mesh position={[0, 0.22, 0.35]} rotation={[0.55, 0, 0]} castShadow>
                <boxGeometry args={[0.09, 0.015, 0.72]} />
                <meshStandardMaterial color={i % 2 === 0 ? '#2d7a36' : '#3b8e45'} roughness={0.75} />
              </mesh>
            </group>
          );
        })}
      </group>
    </group>
  );
}

function Tree({ position, scale = 1, tint = '#3e7950' }) {
  const lightTint = tint === '#3e7950' ? '#4e8756' : tint === '#477e50' ? '#5b8c58' : '#3d7547';
  return (
    <group position={position} scale={scale}>
      <mesh position={[0, 0.34, 0]} castShadow>
        <cylinderGeometry args={[0.055, 0.095, 0.68, 9]} />
        <meshStandardMaterial color="#65503b" roughness={1} />
      </mesh>
      <mesh position={[0, 0.79, 0]} castShadow>
        <sphereGeometry args={[0.34, 12, 10]} />
        <meshStandardMaterial color={tint} roughness={0.94} />
      </mesh>
      <mesh position={[0.19, 0.88, 0.03]} castShadow>
        <sphereGeometry args={[0.245, 10, 9]} />
        <meshStandardMaterial color={lightTint} roughness={0.96} />
      </mesh>
      <mesh position={[-0.18, 0.88, -0.035]} castShadow>
        <sphereGeometry args={[0.24, 10, 9]} />
        <meshStandardMaterial color="#376f48" roughness={0.96} />
      </mesh>
    </group>
  );
}

function Building({ node, selected, onSelect, attackMode, embedded = false }) {
  const ref = useRef();
  const color = statusColors[node.status] || statusColors.normal;
  const isEdge = node.type === 'edge';
  const isGateway = node.type === 'gateway';
  const isInternet = node.type === 'internet';
  const isCampusBuilding = node.type === 'building';
  const height = node.id === 'siemens' ? 2.16 : node.id === 'central' ? 2.18 : 2.16;
  const blockData = BLOCK_DETAILS[node.id];

  useFrame(({ clock }) => {
    if (!ref.current) return;
    const pulse = node.status === 'attack' ? 1 + Math.sin(clock.elapsedTime * 5) * 0.035 :
      node.status === 'suspicious' ? 1 + Math.sin(clock.elapsedTime * 2.7) * 0.018 : 1;
    ref.current.scale.setScalar(pulse);
  });

  return (
    <group position={node.pos} onClick={(e) => { e.stopPropagation(); onSelect(node.id); }} ref={ref}>
      {/* Plinth */}
      {isCampusBuilding && (
        <mesh position={[0, -0.055, 0]} receiveShadow>
          <boxGeometry args={[3.8, 0.11, 2.7]} />
          <meshStandardMaterial color={selected ? '#a6b7b5' : '#b6b2a8'} roughness={0.95} />
        </mesh>
      )}

      {/* Building Specific Architectural Rendering */}
      {isInternet ? (
        <group>
          <mesh position={[0, 0.25, 0]}>
            <icosahedronGeometry args={[0.42, 1]} />
            <meshStandardMaterial color="#173b61" emissive="#1763b2" emissiveIntensity={0.8} metalness={0.7} roughness={0.25} />
          </mesh>
          {[0.57, 0.72, 0.87].map((r, i) => (
            <mesh key={i} rotation={[Math.PI / 2, 0, i * 0.5]} position={[0, 0.25, 0]}>
              <torusGeometry args={[r, 0.012, 6, 48]} />
              <meshBasicMaterial color="#3c9bff" transparent opacity={0.45 - i * 0.1} />
            </mesh>
          ))}
        </group>
      ) : isEdge || isGateway ? (
        <group>
          <mesh position={[0, 0.35, 0]} castShadow>
            <boxGeometry args={[0.72, 0.7, 0.72]} />
            <meshStandardMaterial color={isGateway ? '#d7e0e3' : '#9eabb1'} metalness={0.28} roughness={0.58} />
          </mesh>
          <mesh position={[0, 0.2, 0.37]}>
            <boxGeometry args={[0.5, 0.035, 0.02]} />
            <meshBasicMaterial color={color} />
          </mesh>
        </group>
      ) : node.id === 'siemens' ? (
        <SiemensBlockModel selected={selected} />
      ) : node.id === 'central' ? (
        <CentralBlockModel selected={selected} />
      ) : (
        <AcademicBlockModel node={node} selected={selected} />
      )}

      {/* Cyber overlay indicator dot */}
      <mesh position={[0, height + 0.42, 0]}>
        <sphereGeometry args={[node.status === 'attack' ? 0.12 : 0.075, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={node.status === 'attack' ? 2.2 : 1.1} />
      </mesh>
      <pointLight position={[0, height + 0.45, 0]} color={color} intensity={node.status === 'attack' ? 1.0 : 0.28} distance={2.0} />

      {/* Selection Ring */}
      {selected && (
        <mesh position={[0, 0.015, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[1.8, 1.95, 48]} />
          <meshBasicMaterial color="#72d8ff" transparent opacity={0.85} side={THREE.DoubleSide} />
        </mesh>
      )}

      {/* Floating 3D World Tag & In-Scene Interactive Details Popup */}
      {isCampusBuilding && (
        <Html position={[0, height + 0.72, 0]} center distanceFactor={14} style={{ pointerEvents: 'auto', zIndex: selected ? 100 : 10 }}>
          <div className="world-tag-container" onClick={(e) => e.stopPropagation()}>
            <div
              className={`world-label ${selected ? 'selected' : ''} ${node.status}`}
              onClick={(e) => {
                e.stopPropagation();
                onSelect(node.id);
              }}
              title={`Click to view ${node.name} lab origins & assigned systems`}
            >
              <span className="world-label-dot" style={{ background: color, boxShadow: `0 0 8px ${color}` }} />
              <span style={{ fontWeight: 700 }}>{node.name}</span>
              {blockData && (
                <span className="world-label-badge">
                  {blockData.totalLabs} Labs • {blockData.totalSystems} PCs
                </span>
              )}
            </div>

            {/* In-scene 3D Details Popup when Block is Selected */}
            {selected && blockData && (
              <div className="in-scene-popup" onClick={(e) => e.stopPropagation()}>
                <div className="in-scene-popup-header">
                  <span className="in-scene-popup-title">{blockData.icon} {blockData.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
                    <span className="in-scene-popup-badge">{blockData.totalLabs} Labs · {blockData.totalSystems} PCs</span>
                    <button
                      className="in-scene-close-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelect(null);
                      }}
                      title="Close block details"
                    >
                      ✕
                    </button>
                  </div>
                </div>
                <div className="in-scene-popup-body">
                  {blockData.floors.map((fl, idx) => (
                    <div key={idx} className="in-scene-floor-row">
                      <span className="in-scene-floor-name">{fl.floor}:</span>
                      <span className="in-scene-branch-name" title={fl.branch}>{fl.branch}</span>
                      <span className="in-scene-count-tag">{fl.labs} {fl.labs === 1 ? 'lab' : 'labs'} ({fl.systems} PCs)</span>
                    </div>
                  ))}
                </div>
                <div className="in-scene-popup-footer">
                  <span>⚡ 60 Systems / Lab Standard Allocation</span>
                </div>
              </div>
            )}
          </div>
        </Html>
      )}
    </group>
  );
}

function Packet({ start, end, color, speed = 0.28, offset = 0, size = 0.055 }) {
  const core = useRef();
  const glow = useRef();
  const tailA = useRef();
  const tailB = useRef();
  const a = useMemo(() => new THREE.Vector3(...start).add(new THREE.Vector3(0, 0.24, 0)), [start]);
  const b = useMemo(() => new THREE.Vector3(...end).add(new THREE.Vector3(0, 0.24, 0)), [end]);

  useFrame(({ clock }) => {
    const t = (clock.elapsedTime * speed + offset) % 1;
    if (core.current) core.current.position.lerpVectors(a, b, t);
    if (glow.current) glow.current.position.lerpVectors(a, b, t);
    if (tailA.current) tailA.current.position.lerpVectors(a, b, (t - 0.025 + 1) % 1);
    if (tailB.current) tailB.current.position.lerpVectors(a, b, (t - 0.052 + 1) % 1);
  });

  return (
    <group>
      <mesh ref={glow} position={a}>
        <sphereGeometry args={[size * 3.2, 12, 12]} />
        <meshBasicMaterial color={color} transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={tailB} position={a}>
        <sphereGeometry args={[size * 0.65, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={tailA} position={a}>
        <sphereGeometry args={[size * 0.82, 8, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.62} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
      <mesh ref={core} position={a}>
        <sphereGeometry args={[size, 12, 12]} />
        <meshBasicMaterial color={color} toneMapped={false} />
      </mesh>
    </group>
  );
}

function NetworkScene({ nodes, selectedId, onSelect, attackMode, packetsOn, cameraProgressRef }) {
  const byId = useMemo(() => Object.fromEntries(nodes.map((n) => [n.id, n])), [nodes]);
  const controlsRef = useRef();
  const elapsedRef = useRef(0);
  const manualUntilRef = useRef(0);
  const { camera } = useThree();
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const groundTexture = useMemo(() => makeSurfaceTexture([77, 111, 65], 18, 11), []);
  const soilTexture = useMemo(() => makeSurfaceTexture([151, 83, 52], 22, 29), []);
  const fieldTexture = useMemo(() => makeSurfaceTexture([43, 101, 48], 17, 47), []);
  const roadTexture = useMemo(() => makeSurfaceTexture([57, 63, 64], 13, 73), []);

  useEffect(() => {
    const handleCameraProgress = (event) => {
      if (event.origin !== window.location.origin || event.source !== window.parent ||
          event.data?.type !== 'SENTINEL_CAMERA_PROGRESS' ||
          !Number.isFinite(event.data.progress)) return;

      cameraProgressRef.current = THREE.MathUtils.clamp(event.data.progress, 0, 1);
      manualUntilRef.current = 0;
    };

    window.addEventListener('message', handleCameraProgress);
    if (window.parent !== window) {
      window.parent.postMessage({ type: 'SENTINEL_CAMERA_READY' }, window.location.origin);
    }

    return () => window.removeEventListener('message', handleCameraProgress);
  }, [cameraProgressRef]);

  useFrame(({ clock }) => {
    const t = clock.elapsedTime;
    elapsedRef.current = t;
    if (t < manualUntilRef.current) return;
    const angle = Math.sin(t * 0.12) * 0.105;
    const dolly = Math.sin(t * 0.16) * 0.42;
    const progress = cameraProgressRef.current;
    const easedProgress = progress === null ? 0 : progress * progress * (3 - 2 * progress);
    const target = new THREE.Vector3(
      THREE.MathUtils.lerp(0.08 * Math.sin(t * 0.11), 0, easedProgress),
      THREE.MathUtils.lerp(0.60 + Math.sin(t * 0.15) * 0.04, 0.55, easedProgress),
      0
    );
    const desired = new THREE.Vector3(
      THREE.MathUtils.lerp(Math.sin(angle) * 1.2, 0, easedProgress),
      THREE.MathUtils.lerp(10.0 + dolly * 0.22, 40.5, easedProgress),
      THREE.MathUtils.lerp(12.9 + dolly, 0.12, easedProgress)
    );
    camera.position.lerp(desired, prefersReducedMotion ? 1 : progress === null ? 0.018 : 0.075);
    camera.lookAt(target);
    if (controlsRef.current) {
      controlsRef.current.target.copy(target);
      controlsRef.current.update();
    }
  });

  const campusTrees = useMemo(() => [
    [-10, -7, 0.9], [-9, -5, 0.75], [-10, -2, 0.85], [-9, 1, 0.8], [-10, 4, 0.9], [-8.8, 6, 0.72],
    [9, -7, 0.82], [10, -4, 0.9], [9.4, -1, 0.72], [10, 2, 0.88], [9.5, 5, 0.82],
    [-7, -8, 0.7], [-5.8, -8.4, 0.75], [-3.8, -8.5, 0.8], [-1.8, -8.7, 0.7], [2, -8.5, 0.8], [4.3, -8.3, 0.75], [6.5, -8, 0.85],
    [-7.4, 7.5, 0.7], [-5.5, 8.3, 0.8], [-3.5, 8.4, 0.68], [3.4, 8.3, 0.78], [5.6, 8.1, 0.7], [7.5, 7.2, 0.85]
  ], []);

  // Palm trees in marked area removed
  const palmTrees = useMemo(() => [], []);

  const pathFor = (a, b) => {
    const n1 = byId[a], n2 = byId[b];
    if (!n1 || !n2) return null;
    const dx = n2.pos[0] - n1.pos[0], dz = n2.pos[2] - n1.pos[2];
    const len = Math.max(0.001, Math.hypot(dx, dz));
    const radiusFor = (n) => n.type === 'building' ? (n.id === 'central' ? 1.12 : n.id === 'siemens' ? 1.28 : n.id === 'viva' ? 1.12 : 0.98) : n.type === 'gateway' ? 0.62 : n.type === 'internet' ? 0.48 : 0.38;
    const r1 = radiusFor(n1), r2 = radiusFor(n2);
    const start = [n1.pos[0] + dx / len * r1, 0.18, n1.pos[2] + dz / len * r1];
    const end = [n2.pos[0] - dx / len * r2, 0.18, n2.pos[2] - dz / len * r2];
    return [start, end];
  };

  return (
    <>
      <color attach="background" args={['#9eae9d']} />
      <fog attach="fog" args={['#9eae9d', 31, 58]} />
      <ambientLight intensity={0.58} />
      <directionalLight position={[-8, 18, 7]} intensity={2.35} castShadow shadow-mapSize-width={2048} shadow-mapSize-height={2048} shadow-camera-left={-18} shadow-camera-right={18} shadow-camera-top={18} shadow-camera-bottom={-18} shadow-bias={-0.00015} />
      <hemisphereLight args={['#e5f1ff', '#324a2d', 0.85]} />
      <pointLight position={[-7, 5, -5]} color="#4a9ecb" intensity={0.42} distance={16} />
      <pointLight position={[5, 3, 6]} color="#53c9ae" intensity={0.24} distance={12} />

      {/* Main Ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.16, 0]} receiveShadow onClick={() => onSelect(null)}>
        <planeGeometry args={[30, 26]} />
        <meshStandardMaterial map={groundTexture || undefined} color="#ffffff" roughness={1} />
      </mesh>

      {/* Red Soil (West Boundary) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[-9.1, -0.145, -0.15]}>
        <planeGeometry args={[5.2, 14.2]} />
        <meshStandardMaterial map={soilTexture || undefined} color="#ffffff" roughness={1} />
      </mesh>

      {/* Green Farmland (East Boundary) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[11.3, -0.142, -0.1]}>
        <planeGeometry args={[4.5, 15.2]} />
        <meshStandardMaterial map={fieldTexture || undefined} color="#ffffff" roughness={1} />
      </mesh>

      {/* Roadways & Walkways */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.13, -5.45]}>
        <planeGeometry args={[1.05, 5.0]} />
        <meshStandardMaterial map={roadTexture || undefined} color="#ffffff" roughness={0.92} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.13, 5.55]}>
        <planeGeometry args={[1.05, 5.3]} />
        <meshStandardMaterial map={roadTexture || undefined} color="#ffffff" roughness={0.92} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[-5.25, -0.128, 0]}>
        <planeGeometry args={[1.05, 5.1]} />
        <meshStandardMaterial map={roadTexture || undefined} color="#ffffff" roughness={0.92} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, Math.PI / 2]} position={[5.25, -0.128, 0]}>
        <planeGeometry args={[1.05, 5.1]} />
        <meshStandardMaterial map={roadTexture || undefined} color="#ffffff" roughness={0.92} />
      </mesh>

      {/* Concrete paths */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.125, 4.95]}>
        <planeGeometry args={[16.5, 0.62]} /><meshStandardMaterial color="#bdb9ae" roughness={0.98} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.125, -4.95]}>
        <planeGeometry args={[16.5, 0.58]} /><meshStandardMaterial color="#bdb9ae" roughness={0.98} />
      </mesh>

      {/* Paved Forecourt around Central Block */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.119, 0]}>
        <planeGeometry args={[5.8, 4.3]} /><meshStandardMaterial color="#a9aaa3" roughness={0.96} />
      </mesh>

      {/* Parking bays in front of Siemens */}
      {Array.from({ length: 7 }, (_, i) => (
        <group key={`parking-${i}`} position={[-5.3 + i * 0.48, -0.105, 6.05]}>
          <mesh rotation={[-Math.PI / 2, 0, 0]}><planeGeometry args={[0.025, 0.9]} /><meshBasicMaterial color="#e4dfd0" /></mesh>
        </group>
      ))}

      {/* Front campus highway road */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.103, 8.95]}>
        <planeGeometry args={[30, 1.45]} /><meshStandardMaterial map={roadTexture || undefined} color="#ffffff" roughness={0.95} />
      </mesh>

      {/* Courtyard Amphitheater near Block A (Photo 4) */}
      <Amphitheater position={[-2.4, -0.1, 1.6]} />

      {/* Real Tropical Palm Trees (Photos 2, 3, 5) */}
      {palmTrees.map(([x, z, scale], i) => (
        <PalmTree key={`palm-${i}`} position={[x, -0.13, z]} scale={scale} />
      ))}

      {/* Campus boundary shade trees */}
      {campusTrees.map(([x, z, scale], i) => (
        <Tree key={`tree-${i}`} position={[x, -0.13, z]} scale={scale} tint={i % 3 === 0 ? '#477e50' : i % 3 === 1 ? '#376c43' : '#56875a'} />
      ))}

      {/* Network Links */}
      {links.map(([a, b], i) => {
        const n1 = byId[a], n2 = byId[b];
        if (!n1 || !n2) return null;
        const alertLink = attackMode && ((a === 'blockC' && b === 'edge3') || (a === 'edge3' && b === 'gw') || (a === 'gw' && b === 'internet')) ||
          (n1.status === 'attack' || n2.status === 'attack');
        const suspicious = !alertLink && (n1.status === 'suspicious' || n2.status === 'suspicious');
        const c = alertLink ? '#ff4f67' : suspicious ? '#ffb547' : '#2878a8';
        const points = pathFor(a, b);
        return (
          <React.Fragment key={i}>
            <Line points={points} color={c} lineWidth={alertLink ? 2.4 : 1.15} transparent opacity={alertLink ? 0.95 : 0.62} />
            <Line points={points} color={c} lineWidth={0.55} transparent opacity={0.28} />
          </React.Fragment>
        );
      })}

      {/* Animated Packets */}
      {packetsOn && links.map(([a, b], i) => {
        const n1 = byId[a], n2 = byId[b];
        if (!n1 || !n2) return null;
        const points = pathFor(a, b);
        if (!points) return null;
        const red = (attackMode && ((a === 'blockC' && b === 'edge3') || (a === 'edge3' && b === 'gw') || (a === 'gw' && b === 'internet'))) || n1.status === 'attack' || n2.status === 'attack';
        const orange = !red && (n1.status === 'suspicious' || n2.status === 'suspicious');
        return (
          <React.Fragment key={i}>
            {[0, 1, 2, 3, 4].map((j) => (
              <Packet key={j} start={points[0]} end={points[1]} color={red ? '#ff5269' : orange ? '#ffc15c' : '#7bdcff'} speed={0.34 + j * 0.055} offset={(i * 0.13 + j * 0.19) % 1} size={red ? 0.072 : 0.058} />
            ))}
          </React.Fragment>
        );
      })}

      {/* Campus Buildings */}
      {nodes.map((node) => (
        <Building key={node.id} node={node} selected={selectedId === node.id} onSelect={onSelect} attackMode={attackMode} embedded />
      ))}

      <ContactShadows position={[0, -0.145, 0]} opacity={0.24} scale={25} blur={3.2} far={5} />

      <OrbitControls
        ref={controlsRef}
        makeDefault
        target={[0, 0.65, 0]}
        minDistance={6}
        maxDistance={28}
        maxPolarAngle={Math.PI * 0.49}
        minPolarAngle={0.12}
        enableDamping
        dampingFactor={0.06}
        onStart={() => { manualUntilRef.current = elapsedRef.current + 20; }}
        onEnd={() => { manualUntilRef.current = elapsedRef.current + 12; }}
      />
    </>
  );
}

export function CampusSceneEmbed({ attackMode = false, packetsOn = true, onSelectBuilding = () => {} }) {
  const [nodes, setNodes] = useState(initialNodes);
  const [selectedId, setSelectedId] = useState(null);
  const cameraProgressRef = useRef(null);

  useEffect(() => {
    setNodes((prev) => prev.map((n) => {
      if (n.id === 'blockA') return { ...n, status: attackMode ? 'normal' : 'attack' };
      if (n.id === 'blockC') return { ...n, status: attackMode ? 'attack' : 'suspicious' };
      if (n.id === 'edge3' || n.id === 'gw') return { ...n, status: attackMode ? 'suspicious' : 'normal' };
      return { ...n, status: 'normal' };
    }));
  }, [attackMode]);

  useEffect(() => {
    const handleParentMsg = (event) => {
      if (event.data?.type === 'SENTINEL_SELECT_BLOCK' && event.data.blockId) {
        setSelectedId(event.data.blockId);
      }
    };
    window.addEventListener('message', handleParentMsg);
    return () => window.removeEventListener('message', handleParentMsg);
  }, []);

  const selectNode = (id) => {
    setSelectedId((prev) => (prev === id ? null : id));
    if (id && ['central', 'blockA', 'blockB', 'blockC', 'blockD', 'siemens', 'viva'].includes(id)) {
      onSelectBuilding(id);
      try {
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({ type: 'SENTINEL_BLOCK_SELECTED', blockId: id }, '*');
        }
      } catch (err) {}
    }
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%', overflow: 'hidden' }}>
      {/* Top Quick Navigation Tabs */}
      <div className="block-nav-bar" role="navigation" aria-label="Campus Block Details">
        <span style={{ fontSize: '11px', fontWeight: 800, color: '#39ff88', marginRight: '3px', display: 'flex', alignItems: 'center', gap: '3px', letterSpacing: '0.4px' }}>
          <span>🏢</span> BLOCK DETAILS:
        </span>
        {Object.values(BLOCK_DETAILS).map((block) => (
          <button
            key={block.id}
            className={`block-nav-tab ${selectedId === block.id ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
              selectNode(block.id);
            }}
            title={`View ${block.name} (${block.totalLabs} Labs, ${block.totalSystems} Systems)`}
          >
            <span>{block.name}</span>
            <span className="tab-pill">{block.totalLabs}L · {block.totalSystems}PCs</span>
          </button>
        ))}
        {selectedId && (
          <button
            className="block-nav-tab"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedId(null);
            }}
            title="Deselect block"
            style={{ padding: '4px 8px', color: '#ff7676' }}
          >
            ✕ Close
          </button>
        )}
      </div>

      <Canvas
        shadows
        camera={{ position: [0, 10.0, 12.9], fov: 39 }}
        dpr={[1, 1.8]}
        gl={{ antialias: true, alpha: false, powerPreference: 'high-performance' }}
      >
        <Suspense fallback={null}>
          <NetworkScene
            nodes={nodes}
            selectedId={selectedId}
            onSelect={selectNode}
            attackMode={attackMode}
            packetsOn={packetsOn}
            cameraProgressRef={cameraProgressRef}
          />
          <Environment preset="city" />
        </Suspense>
      </Canvas>
    </div>
  );
}

export default CampusSceneEmbed;
