/**
 * Bharti Research Station - Cinematic Industrial Engineering Material System
 * Restrained metallic PBR palette, isolated hover highlights, and preserved 3D metallic models on selection.
 */

import * as THREE from 'three';

// 1. Shared High-Performance Industrial PBR Materials Library
export const CINEMATIC_MATERIALS = {
  // Heavy structural frames, generator blocks, main engine castings
  gunmetal: new THREE.MeshStandardMaterial({
    name: 'Cinematic_Gunmetal',
    color: new THREE.Color(0x28323c),
    metalness: 0.92,
    roughness: 0.30,
    envMapIntensity: 1.5,
    side: THREE.DoubleSide
  }),

  // Precision mechanical components, shafts, rotating couplings, pump impellers
  brushedSteel: new THREE.MeshStandardMaterial({
    name: 'Cinematic_BrushedSteel',
    color: new THREE.Color(0x6a7784),
    metalness: 0.95,
    roughness: 0.32,
    envMapIntensity: 1.65,
    side: THREE.DoubleSide
  }),

  // Antenna elevation/azimuth mechanisms, harmonic drives, high-spec fittings
  darkTitanium: new THREE.MeshStandardMaterial({
    name: 'Cinematic_DarkTitanium',
    color: new THREE.Color(0x38414b),
    metalness: 0.94,
    roughness: 0.25,
    envMapIntensity: 1.7,
    side: THREE.DoubleSide
  }),

  // Electrical enclosures, heat sink fins, conduit brackets, structural supports
  aluminum: new THREE.MeshStandardMaterial({
    name: 'Cinematic_Aluminum',
    color: new THREE.Color(0x7c8c9b),
    metalness: 0.88,
    roughness: 0.35,
    envMapIntensity: 1.4,
    side: THREE.DoubleSide
  }),

  // Structural skid bases, isolation beds, foundation mounts
  graphite: new THREE.MeshStandardMaterial({
    name: 'Cinematic_Graphite',
    color: new THREE.Color(0x181e25),
    metalness: 0.68,
    roughness: 0.48,
    envMapIntensity: 1.15,
    side: THREE.DoubleSide
  }),

  // Junction boxes, terminal seals, cable runs, instrumentation caps
  darkPlastic: new THREE.MeshStandardMaterial({
    name: 'Cinematic_DarkIndustrialPlastic',
    color: new THREE.Color(0x11161c),
    metalness: 0.12,
    roughness: 0.62,
    envMapIntensity: 0.9,
    side: THREE.DoubleSide
  }),

  // Parabolic dish reflector (high-spec carbon composite with RF reflective coat)
  dishReflector: new THREE.MeshStandardMaterial({
    name: 'Cinematic_DishReflector',
    color: new THREE.Color(0x404b56),
    metalness: 0.96,
    roughness: 0.22,
    envMapIntensity: 1.75,
    side: THREE.DoubleSide
  }),

  // Process & Cooling Pipes (Restrained Deep Slate Blue)
  pipesCoolingBlue: new THREE.MeshStandardMaterial({
    name: 'Cinematic_PipeCoolingBlue',
    color: new THREE.Color(0x1c3552),
    emissive: new THREE.Color(0x0a192a),
    emissiveIntensity: 0.22,
    metalness: 0.84,
    roughness: 0.28,
    envMapIntensity: 1.35,
    side: THREE.DoubleSide
  }),

  // Thermal Energy & High-Temp Exhaust (Restrained Oxide / Cadmium Red)
  pipesThermalRed: new THREE.MeshStandardMaterial({
    name: 'Cinematic_PipeThermalRed',
    color: new THREE.Color(0x522020),
    emissive: new THREE.Color(0x260c0c),
    emissiveIntensity: 0.18,
    metalness: 0.80,
    roughness: 0.30,
    envMapIntensity: 1.25,
    side: THREE.DoubleSide
  }),

  // Fuel, Lubricant, & Hydraulic Lines (Restrained Industrial Bronze / Amber)
  pipesFuelAmber: new THREE.MeshStandardMaterial({
    name: 'Cinematic_PipeFuelAmber',
    color: new THREE.Color(0x4d3919),
    emissive: new THREE.Color(0x221706),
    emissiveIntensity: 0.18,
    metalness: 0.85,
    roughness: 0.27,
    envMapIntensity: 1.35,
    side: THREE.DoubleSide
  }),

  // Facility Modular Floor Panels
  facilityFloor: new THREE.MeshStandardMaterial({
    name: 'Cinematic_FacilityFloor',
    color: new THREE.Color(0x131922),
    metalness: 0.50,
    roughness: 0.40,
    envMapIntensity: 1.1,
    side: THREE.DoubleSide
  }),

  // Architectural Enclosure Outer Walls
  enclosureWalls: new THREE.MeshStandardMaterial({
    name: 'Cinematic_EnclosureWalls',
    color: new THREE.Color(0x1b232e),
    metalness: 0.58,
    roughness: 0.44,
    envMapIntensity: 1.15,
    side: THREE.DoubleSide
  })
};

// 2. Subtle Isolated Hover Material (subtle metallic sheen, not loud or blue)
export const HOVER_MATERIAL = new THREE.MeshStandardMaterial({
  name: 'Cinematic_Isolated_Hover',
  color: new THREE.Color(0x355b7d),
  emissive: new THREE.Color(0x0ea5e9),
  emissiveIntensity: 0.38,
  metalness: 0.94,
  roughness: 0.22,
  envMapIntensity: 1.9,
  side: THREE.DoubleSide
});

// 3. 2D Blueprint Theme for Unselected Background Equipment
export const BLUEPRINT_MATERIAL = new THREE.MeshStandardMaterial({
  name: 'Cinematic_2D_Blueprint_Theme',
  color: new THREE.Color(0x08263f),
  emissive: new THREE.Color(0x04192b),
  emissiveIntensity: 0.35,
  metalness: 0.15,
  roughness: 0.75,
  transparent: true,
  opacity: 0.20,
  depthWrite: false, // Prevents z-fighting across translucent meshes
  side: THREE.DoubleSide
});

/**
 * Assigns shared metallic PBR materials systematically across the loaded model.
 */
export function applyCinematicMaterials(model) {
  model.traverse((child) => {
    if (!child.isMesh || child.userData.isPickProxy) return;

    const name = child.name || '';

    // Room Enclosure Shells
    if (name === 'CHP' || name === 'CHP (1)' || name === 'Body210') {
      child.material = CINEMATIC_MATERIALS.facilityFloor;
      child.userData.baseMaterial = CINEMATIC_MATERIALS.facilityFloor;
      return;
    }

    // Piping Networks
    if (/BluePipe/i.test(name)) {
      child.material = CINEMATIC_MATERIALS.pipesCoolingBlue;
      child.userData.baseMaterial = CINEMATIC_MATERIALS.pipesCoolingBlue;
      return;
    }
    if (/RedPipe/i.test(name)) {
      child.material = CINEMATIC_MATERIALS.pipesThermalRed;
      child.userData.baseMaterial = CINEMATIC_MATERIALS.pipesThermalRed;
      return;
    }
    if (/BronzePipe/i.test(name)) {
      child.material = CINEMATIC_MATERIALS.pipesFuelAmber;
      child.userData.baseMaterial = CINEMATIC_MATERIALS.pipesFuelAmber;
      return;
    }

    // Antenna & Drives
    if (name === 'GeoSphere02') {
      child.material = CINEMATIC_MATERIALS.dishReflector;
      child.userData.baseMaterial = CINEMATIC_MATERIALS.dishReflector;
      return;
    }
    if (/Drive|Motor|Gearbox|LNB|Azimuth|Elevation/i.test(name)) {
      child.material = CINEMATIC_MATERIALS.darkTitanium;
      child.userData.baseMaterial = CINEMATIC_MATERIALS.darkTitanium;
      return;
    }

    // Machinery & Generators
    if (/EngineCore|Alternator|GeneratorSystem/i.test(name)) {
      child.material = CINEMATIC_MATERIALS.gunmetal;
      child.userData.baseMaterial = CINEMATIC_MATERIALS.gunmetal;
      return;
    }
    if (/Bearing|Coupling|Shaft|Pump/i.test(name)) {
      child.material = CINEMATIC_MATERIALS.brushedSteel;
      child.userData.baseMaterial = CINEMATIC_MATERIALS.brushedSteel;
      return;
    }
    if (/Frame|Skid|Support/i.test(name)) {
      child.material = CINEMATIC_MATERIALS.graphite;
      child.userData.baseMaterial = CINEMATIC_MATERIALS.graphite;
      return;
    }
    if (/Cabinet|Box|Control|EBox/i.test(name)) {
      child.material = CINEMATIC_MATERIALS.aluminum;
      child.userData.baseMaterial = CINEMATIC_MATERIALS.aluminum;
      return;
    }

    // Unnamed CAD Bodies
    if (/^Body\d+/i.test(name)) {
      const id = parseInt(name.replace(/\D/g, '') || '0', 10);
      const palette = [
        CINEMATIC_MATERIALS.gunmetal,
        CINEMATIC_MATERIALS.darkTitanium,
        CINEMATIC_MATERIALS.aluminum,
        CINEMATIC_MATERIALS.brushedSteel
      ];
      const selectedMat = palette[id % palette.length];
      child.material = selectedMat;
      child.userData.baseMaterial = selectedMat;
      return;
    }

    child.material = CINEMATIC_MATERIALS.gunmetal;
    child.userData.baseMaterial = CINEMATIC_MATERIALS.gunmetal;
  });
}

/**
 * Applies subtle hover highlight to a mesh without mutating shared materials.
 */
export function setMeshHoverState(mesh, isHovered, isBlueprintActive = false) {
  if (!mesh) return;

  if (isHovered) {
    mesh.material = HOVER_MATERIAL;
    mesh.renderOrder = 5;
  } else {
    mesh.material = isBlueprintActive ? BLUEPRINT_MATERIAL : (mesh.userData.baseMaterial || CINEMATIC_MATERIALS.gunmetal);
    mesh.renderOrder = 0;
  }
}

export const SELECTION_MATERIAL = new THREE.MeshStandardMaterial({
  name: 'Cinematic_Selection_Highlight',
  color: new THREE.Color(0x38bdf8),
  emissive: new THREE.Color(0x0284c7),
  emissiveIntensity: 0.5,
  metalness: 0.9,
  roughness: 0.25,
  side: THREE.DoubleSide
});

function createRedGradientTexture() {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');

  // Vertical linear gradient from glowing bright crimson to deep dark maroon
  const gradient = ctx.createLinearGradient(0, 0, 0, 256);
  gradient.addColorStop(0, '#ff4d4d'); // Bright warning red/coral at top
  gradient.addColorStop(0.35, '#ef4444'); // Vivid crimson
  gradient.addColorStop(0.7, '#b91c1c'); // Deep red
  gradient.addColorStop(1, '#450a0a'); // Dark industrial maroon at base

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 256, 256);

  // High-tech horizontal raster scanlines
  ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
  for (let y = 0; y < 256; y += 4) {
    ctx.fillRect(0, y, 256, 1);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  return texture;
}

export const RED_ANOMALY_MATERIAL = new THREE.MeshStandardMaterial({
  name: 'Cinematic_Red_Gradient_Anomaly',
  map: createRedGradientTexture(),
  color: new THREE.Color(0xffffff),
  emissive: new THREE.Color(0xdc2626),
  emissiveIntensity: 0.85,
  metalness: 0.82,
  roughness: 0.28,
  envMapIntensity: 1.8,
  side: THREE.DoubleSide
});

export const YELLOW_STATUS_MATERIAL = new THREE.MeshStandardMaterial({
  name: 'Cinematic_Yellow_Degrading',
  color: new THREE.Color(0xfacc15),
  emissive: new THREE.Color(0xca8a04),
  emissiveIntensity: 0.65,
  metalness: 0.82,
  roughness: 0.28,
  envMapIntensity: 1.8,
  side: THREE.DoubleSide
});

export const GREEN_STATUS_MATERIAL = new THREE.MeshStandardMaterial({
  name: 'Cinematic_Green_Normal',
  color: new THREE.Color(0x10b981),
  emissive: new THREE.Color(0x059669),
  emissiveIntensity: 0.55,
  metalness: 0.82,
  roughness: 0.28,
  envMapIntensity: 1.8,
  side: THREE.DoubleSide
});

/**
 * Resolves status material strictly according to state:
 * - Early degrading and normal -> GREEN
 * - Degradation -> YELLOW
 * - Critical and failure -> RED (Red gradient)
 */
export function getStatusMaterialForState(stateKey) {
  if (!stateKey) return GREEN_STATUS_MATERIAL;
  const s = String(stateKey).toUpperCase().replace(/[-\s]/g, '_');
  if (s.includes('FAIL') || s.includes('CRITICAL')) {
    return RED_ANOMALY_MATERIAL;
  }
  if (s.includes('EARLY')) {
    return GREEN_STATUS_MATERIAL;
  }
  if (s.includes('DEGRAD')) {
    return YELLOW_STATUS_MATERIAL;
  }
  return GREEN_STATUS_MATERIAL;
}

export function getSelectionMaterial(stateKey = 'NORMAL', baseMaterial = null) {
  // Respect user request: keep actual 3D metallic PBR model appearance!
  return baseMaterial || CINEMATIC_MATERIALS.gunmetal;
}

/**
 * Applies selection state: keeps selected component in its ACTUAL 3D METALLIC MODEL
 * and sets unselected equipment to 2D blueprint context.
 */
export function setMeshSelectionState(mesh, isSelected, isBlueprintActive = false) {
  if (!mesh) return;

  if (isSelected) {
    // Retain actual 3D metallic PBR model appearance (expanded, NOT blue!)
    mesh.material = mesh.userData.baseMaterial || CINEMATIC_MATERIALS.gunmetal;
    mesh.renderOrder = 10;
  } else {
    mesh.material = isBlueprintActive ? BLUEPRINT_MATERIAL : (mesh.userData.baseMaterial || CINEMATIC_MATERIALS.gunmetal);
    mesh.renderOrder = 0;
  }
}
