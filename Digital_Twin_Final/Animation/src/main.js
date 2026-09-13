/**
 * Bharti Research Station - Cinematic Interactive Digital Twin
 * Main Three.js Entry Point with Studio PBR, Two-Stage Picking,
 * Isolated Blueprint Context, and Complete High-Performance Gamepad Controller Engine.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/examples/jsm/loaders/DRACOLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GeneratorInteractionManager } from './generatorInteraction.js';
import { RED_ANOMALY_MATERIAL } from './materials.js';
import 'animejs/adapters/three';
import { engine } from 'animejs';

// Configure Anime.js engine loop to synchronize with Three.js requestAnimationFrame loop
try {
  engine.useDefaultMainLoop = false;
} catch (e) {}

const ASSET_BASE = import.meta.env.BASE_URL || '/';

// DOM Elements
const container = document.getElementById('app');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingStatus = document.getElementById('loading-status');
const progressBar = document.getElementById('progress-bar');
const errorOverlay = document.getElementById('error-overlay');
const errorMessage = document.getElementById('error-message');
const controllerHint = document.getElementById('controller-hint');

// Sidebar Asset Navigator Buttons
const assetButtons = [...document.querySelectorAll('[data-asset]')];
let assetCursor = -1;

assetButtons.forEach((button, index) => {
  button.addEventListener('click', () => {
    assetCursor = index;
    assetButtons.forEach((b, i) => b.classList.toggle('is-controller-active', i === assetCursor));
    window.dispatchEvent(new CustomEvent('digital-twin-select-name', {
      detail: { name: button.dataset.asset }
    }));
  });
});

function setAssetCursor(index) {
  if (!assetButtons.length) return;
  assetCursor = (index + assetButtons.length) % assetButtons.length;
  assetButtons.forEach((button, i) => button.classList.toggle('is-controller-active', i === assetCursor));
  const activeBtn = assetButtons[assetCursor];
  const group = activeBtn.closest('details');
  if (group) group.open = true;
  activeBtn.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  generatorInteractionManager?.browseByName(activeBtn.dataset.asset);
}

// 1. Scene Setup - Cinematic Dark Antarctic Atmosphere (#070b14)
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x070b14);
scene.fog = new THREE.FogExp2(0x070b14, 0.0006);

// 2. Camera Setup
const camera = new THREE.PerspectiveCamera(
  45,
  window.innerWidth / window.innerHeight,
  0.1,
  10000
);
camera.position.set(50, 50, 50);

// 3. Renderer Setup - Industrial High Performance
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);

// Responsive Quality Presets
const QUALITY_LEVELS = ['HIGH', 'MED', 'LOW'];
let currentQuality = 'HIGH';

function applyQualitySettings(quality) {
  currentQuality = quality;
  if (quality === 'HIGH') {
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  } else if (quality === 'MED') {
    renderer.setPixelRatio(1.0);
  } else {
    renderer.setPixelRatio(0.85);
  }
  document.querySelectorAll('.quality-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.quality === quality);
  });
}
applyQualitySettings('HIGH');

renderer.shadowMap.enabled = false;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.32;
renderer.outputColorSpace = THREE.SRGBColorSpace;
container.appendChild(renderer.domElement);

document.querySelectorAll('.quality-btn').forEach((btn) => {
  btn.addEventListener('click', () => applyQualitySettings(btn.dataset.quality));
});

// 4. Studio Metallic Reflections Environment
const pmremGenerator = new THREE.PMREMGenerator(renderer);
const studioEnvironment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
scene.environment = studioEnvironment;
pmremGenerator.dispose();

// 5. Orbit Controls
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.maxPolarAngle = Math.PI / 2 - 0.02; // Prevent going below floor plane
controls.minDistance = 1.5;
controls.maxDistance = 5000;

renderer.domElement.tabIndex = 0;
renderer.domElement.style.touchAction = 'none';
const blockDblClickZoom = (event) => {
  event.preventDefault();
  event.stopImmediatePropagation();
};
renderer.domElement.addEventListener('dblclick', blockDblClickZoom, true);
renderer.domElement.addEventListener('pointerdown', () => {
  renderer.domElement.focus({ preventScroll: true });
});

// 6. Cinematic Industrial Engineering Lighting Setup
const ambientLight = new THREE.AmbientLight(0x203248, 0.85);
scene.add(ambientLight);

const hemiLight = new THREE.HemisphereLight(0x38bdf8, 0x070b14, 0.65);
hemiLight.position.set(0, 500, 0);
scene.add(hemiLight);

// Key Directional Light (Crisp specular highlights on metallic equipment)
const mainLight = new THREE.DirectionalLight(0xf8fafc, 1.45);
mainLight.position.set(300, 500, 400);
scene.add(mainLight);

// Inspection Studio Fill Light
const inspectionFill = new THREE.DirectionalLight(0xffd6b0, 0.45);
inspectionFill.position.set(-180, 220, 120);
scene.add(inspectionFill);

// Dual Cyan & Azure Rim Lights (Silhouette definition on machine structures)
const rimLight1 = new THREE.DirectionalLight(0x38bdf8, 1.35);
rimLight1.position.set(-300, 320, -300);
scene.add(rimLight1);

const rimLight2 = new THREE.DirectionalLight(0x0284c7, 1.0);
rimLight2.position.set(-200, -80, 300);
scene.add(rimLight2);

// Warm Industrial Practical Light Fixtures for facility ambiance
const warmLight1 = new THREE.PointLight(0xfde047, 0.75, 450);
warmLight1.position.set(150, 100, -150);
scene.add(warmLight1);

const warmLight2 = new THREE.PointLight(0xf59e0b, 0.65, 450);
warmLight2.position.set(-150, 120, 150);
scene.add(warmLight2);

// Wall-mounted fixture geometry group
const wallLightGroup = new THREE.Group();
wallLightGroup.name = 'IndustrialWallLights';
const casingGeo = new THREE.BoxGeometry(0.90, 0.45, 0.20);
const casingMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, metalness: 0.85, roughness: 0.25 });
const lensGeo = new THREE.BoxGeometry(0.78, 0.32, 0.10);
const lensMat = new THREE.MeshStandardMaterial({
  color: 0xffb703,
  emissive: new THREE.Color(0xff9e00),
  emissiveIntensity: 4.2,
  metalness: 0.10,
  roughness: 0.15
});

const createWallFixture = (x, y, z, rotY) => {
  const fixture = new THREE.Group();
  fixture.position.set(x, y, z);
  fixture.rotation.y = rotY;
  const casing = new THREE.Mesh(casingGeo, casingMat);
  const lens = new THREE.Mesh(lensGeo, lensMat);
  lens.position.z = 0.08;
  fixture.add(casing);
  fixture.add(lens);
  return fixture;
};

const fixturePositions = [
  { x: -24.2, y: 4.2, z: -9.0, rotY: Math.PI / 2 },
  { x: -24.2, y: 4.2, z: 0.0, rotY: Math.PI / 2 },
  { x: -24.2, y: 4.2, z: 9.0, rotY: Math.PI / 2 },
  { x: -18.0, y: 4.2, z: -14.2, rotY: 0 },
  { x: -10.0, y: 4.2, z: -14.2, rotY: 0 },
  { x: -2.0, y: 4.2, z: -14.2, rotY: 0 },
  { x: -18.0, y: 4.2, z: 14.2, rotY: Math.PI },
  { x: -10.0, y: 4.2, z: 14.2, rotY: Math.PI },
  { x: -2.0, y: 4.2, z: 14.2, rotY: Math.PI },
  { x: 4.2, y: 4.2, z: 0.0, rotY: -Math.PI / 2 }
];

fixturePositions.forEach(pos => {
  wallLightGroup.add(createWallFixture(pos.x, pos.y, pos.z, pos.rotY));
});
scene.add(wallLightGroup);

// Clock & State Variables
const clock = new THREE.Clock();
let generatorInteractionManager = null;
let cameraFocus = null;
let homeCameraState = null;

// Pre-allocated vectors for render loop to guarantee ZERO garbage collection allocations
const _tempVecA = new THREE.Vector3();
const _tempVecB = new THREE.Vector3();
const _tempBox = new THREE.Box3();

// Developer Diagnostics & Debug HUD
const debugHud = document.getElementById('debug-hud');
const debugBtn = document.getElementById('debug-toggle-btn');
let debugModeActive = false;
let frameCount = 0;
let lastFpsUpdateTime = performance.now();
let currentFps = 60;

function toggleDebugMode() {
  debugModeActive = !debugModeActive;
  if (debugHud) debugHud.classList.toggle('hidden', !debugModeActive);
  if (debugBtn) debugBtn.classList.toggle('active', debugModeActive);
}

if (debugBtn) {
  debugBtn.addEventListener('click', toggleDebugMode);
}

// Component Status Button (Top-Right Anomaly Isolation Toggle)
const componentStatusBtn = document.getElementById('component-status-btn');
if (componentStatusBtn) {
  componentStatusBtn.addEventListener('click', () => {
    generatorInteractionManager?.componentManager?.toggleAnomalyView();
  });
}

window.addEventListener('keydown', (e) => {
  if (e.key === '~' || e.key === '`') toggleDebugMode();
  if (e.key === '!' || e.key === '1') generatorInteractionManager?.componentManager?.toggleAnomalyView();
  if (e.key === 'ArrowDown') setAssetCursor(assetCursor + 1);
  if (e.key === 'ArrowUp') setAssetCursor(assetCursor - 1);
  if (e.key === 'Enter' && assetCursor >= 0) assetButtons[assetCursor]?.click();
});

function updateDiagnosticsHUD() {
  if (!debugModeActive || !debugHud) return;

  const fpsElem = document.getElementById('dbg-fps');
  const callsElem = document.getElementById('dbg-draw-calls');
  const trisElem = document.getElementById('dbg-triangles');
  const objsElem = document.getElementById('dbg-interactive-objs');
  const selElem = document.getElementById('dbg-selected');
  const subElem = document.getElementById('dbg-subsystem');

  if (fpsElem) fpsElem.textContent = currentFps;
  if (callsElem) callsElem.textContent = renderer.info.render.calls;
  if (trisElem) trisElem.textContent = renderer.info.render.triangles.toLocaleString();
  if (objsElem && generatorInteractionManager) {
    objsElem.textContent = generatorInteractionManager.interactiveObjects.length;
  }
  if (selElem) {
    selElem.textContent = generatorInteractionManager?.selectedMetadata?.displayName || 'None';
  }
  if (subElem) {
    subElem.textContent = generatorInteractionManager?.selectedMetadata?.subsystem || 'All Systems';
  }
}

// Selection & Camera Focus Handler
window.addEventListener('digital-twin-selection', (event) => {
  const chip = document.getElementById('selection-chip');
  const chipText = document.getElementById('selection-text');
  const { component, metadata, locked } = event.detail;

  if (!component || !locked) {
    if (chip) chip.classList.remove('is-locked');
    if (chipText) chipText.textContent = 'BHARTI RESEARCH STATION · DIGITAL TWIN READY';
    assetButtons.forEach(b => b.classList.remove('is-controller-active'));
    assetCursor = -1;

    // Smoothly restore home camera position
    if (homeCameraState) {
      cameraFocus = {
        startPosition: camera.position.clone(),
        startTarget: controls.target.clone(),
        targetPosition: homeCameraState.position.clone(),
        target: homeCameraState.target.clone(),
        progress: 0
      };
    } else {
      cameraFocus = null;
    }
    return;
  }

  const title = metadata?.displayName || component.name;
  if (chip) chip.classList.add('is-locked');
  if (chipText) chipText.textContent = `${title.toUpperCase()} / INSPECTION LOCKED`;

  // Sync sidebar active button
  const targetAssetName = metadata?.monitoredName || metadata?.name || component.name;
  if (targetAssetName) {
    const matchedIdx = assetButtons.findIndex(b => b.dataset.asset === targetAssetName);
    if (matchedIdx >= 0) {
      assetCursor = matchedIdx;
      assetButtons.forEach((b, i) => b.classList.toggle('is-controller-active', i === assetCursor));
      const group = assetButtons[matchedIdx].closest('details');
      if (group) group.open = true;
      assetButtons[matchedIdx].scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }

  _tempBox.setFromObject(component);
  const target = _tempBox.getCenter(_tempVecA).clone();
  const size = _tempBox.getSize(_tempVecB).length() || 6;
  const direction = camera.position.clone().sub(controls.target).normalize();

  cameraFocus = {
    startPosition: camera.position.clone(),
    startTarget: controls.target.clone(),
    target: target.clone(),
    targetPosition: target.clone().add(direction.multiplyScalar(Math.max(size * 2.2, 11))),
    progress: 0
  };
});

// Helper for loading progress
function updateProgress(percent, text) {
  if (progressBar) progressBar.style.width = `${percent}%`;
  if (loadingStatus) loadingStatus.textContent = text;
}

function showError(msg, details) {
  console.error('[Bharti Digital Twin Error]', msg, details || '');
  if (loadingOverlay) loadingOverlay.classList.add('hidden');
  if (errorOverlay) {
    errorOverlay.classList.remove('hidden');
    if (errorMessage) errorMessage.textContent = msg;
  }
}

// 7. Complete Gamepad / Controller Engine
let controllerConnected = false;
let controllerNavLatch = false;
let controllerActionLatch = false;
let controllerQualityLatch = false;
let controllerDebugLatch = false;
let controllerRoomLatch = false;

function deadzone(val, threshold = 0.16) {
  if (Math.abs(val) < threshold) return 0;
  return Math.sign(val) * ((Math.abs(val) - threshold) / (1 - threshold));
}

function updateGamepad(delta) {
  const gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gamepad = [...gamepads].find(Boolean);

  if (!gamepad) {
    if (controllerConnected) {
      controllerConnected = false;
      generatorInteractionManager?.setControllerActive(false);
      if (controllerHint) {
        controllerHint.textContent = 'CONTROLLER: connect to begin';
        controllerHint.classList.remove('is-active');
      }
    }
    return;
  }

  if (!controllerConnected) {
    controllerConnected = true;
    generatorInteractionManager?.setControllerActive(true);
    if (controllerHint) {
      const padId = gamepad.id || 'GAMEPAD';
      const cleanName = padId.includes('Xbox') ? 'XBOX' : (padId.includes('PlayStation') || padId.includes('Dual') ? 'PS' : 'CONTROLLER');
      controllerHint.textContent = `${cleanName} ACTIVE · L-STICK: PAN · R-STICK: ORBIT · D-PAD: BROWSE · A: INSPECT · B: RESET`;
      controllerHint.classList.add('is-active');
    }
  }

  // 1. Left Stick: Ground-plane Pan aligned with view direction
  const leftX = deadzone(gamepad.axes[0] || 0);
  const leftY = deadzone(gamepad.axes[1] || 0);
  if (leftX || leftY) {
    const forward = new THREE.Vector3().subVectors(controls.target, camera.position).setY(0).normalize();
    const right = new THREE.Vector3().crossVectors(forward, camera.up).normalize();
    const targetDist = controls.target.distanceTo(camera.position);
    const speed = Math.max(16, targetDist * 0.48) * delta;

    controls.target.addScaledVector(right, leftX * speed).addScaledVector(forward, -leftY * speed);
    camera.position.addScaledVector(right, leftX * speed).addScaledVector(forward, -leftY * speed);
  }

  // 2. Right Stick: Camera Orbit (Yaw & Pitch)
  const rightX = deadzone(gamepad.axes[2] || 0);
  const rightY = deadzone(gamepad.axes[3] || 0);

  // Triggers: Zoom (LT zooms out, RT zooms in)
  const triggerLeft = gamepad.buttons[6]?.value || 0;
  const triggerRight = gamepad.buttons[7]?.value || 0;
  const zoomInput = (triggerLeft - triggerRight);

  if (rightX || rightY || zoomInput) {
    const offset = camera.position.clone().sub(controls.target);
    const spherical = new THREE.Spherical().setFromVector3(offset);

    spherical.theta -= rightX * delta * 2.2;
    spherical.phi = THREE.MathUtils.clamp(spherical.phi - rightY * delta * 1.6, 0.08, Math.PI / 2 - 0.02);

    if (Math.abs(zoomInput) > 0.05) {
      spherical.radius = THREE.MathUtils.clamp(
        spherical.radius * (1 + zoomInput * delta * 2.5),
        controls.minDistance,
        controls.maxDistance
      );
    }

    camera.position.copy(controls.target).add(new THREE.Vector3().setFromSpherical(spherical));
  }

  // 3. D-Pad Navigation: Asset Selection
  const dPadUp = gamepad.buttons[12]?.pressed;
  const dPadDown = gamepad.buttons[13]?.pressed;
  if ((dPadUp || dPadDown) && !controllerNavLatch) {
    setAssetCursor(assetCursor + (dPadDown ? 1 : -1));
  }
  controllerNavLatch = Boolean(dPadUp || dPadDown);

  // 4. Bumpers: Jump between the 4 facility rooms
  const lb = gamepad.buttons[4]?.pressed;
  const rb = gamepad.buttons[5]?.pressed;
  if ((lb || rb) && !controllerRoomLatch) {
    const roomDetails = [...document.querySelectorAll('#asset-navigator details')];
    if (roomDetails.length > 0) {
      const openIdx = roomDetails.findIndex(d => d.open);
      const nextIdx = (openIdx + (rb ? 1 : -1) + roomDetails.length) % roomDetails.length;
      roomDetails.forEach((d, i) => { d.open = (i === nextIdx); });
      const firstBtn = roomDetails[nextIdx]?.querySelector('button[data-asset]');
      if (firstBtn) {
        const btnIdx = assetButtons.indexOf(firstBtn);
        if (btnIdx >= 0) setAssetCursor(btnIdx);
      }
    }
  }
  controllerRoomLatch = Boolean(lb || rb);

  // 5. Face Buttons
  // Button A (0): Inspect & Lock
  const btnA = gamepad.buttons[0]?.pressed;
  // Button B (1): Clear selection / Home
  const btnB = gamepad.buttons[1]?.pressed || gamepad.buttons[9]?.pressed; // Start / Menu also resets
  if ((btnA || btnB) && !controllerActionLatch) {
    if (btnA) {
      if (generatorInteractionManager?.hoveredMesh) {
        generatorInteractionManager.selectMesh(generatorInteractionManager.hoveredMesh);
      } else if (assetCursor >= 0 && assetButtons[assetCursor]) {
        assetButtons[assetCursor].click();
      } else if (generatorInteractionManager) {
        generatorInteractionManager.selectCenterTarget();
      }
    } else {
      generatorInteractionManager?.clearSelection();
    }
  }
  controllerActionLatch = Boolean(btnA || btnB);

  // Button X (2): Cycle Quality (HIGH -> MED -> LOW)
  const btnX = gamepad.buttons[2]?.pressed;
  if (btnX && !controllerQualityLatch) {
    const currentIdx = QUALITY_LEVELS.indexOf(currentQuality);
    const nextIdx = (currentIdx + 1) % QUALITY_LEVELS.length;
    applyQualitySettings(QUALITY_LEVELS[nextIdx]);
  }
  controllerQualityLatch = Boolean(btnX);

  // Button Y (3): Toggle Diagnostics Debug HUD
  const btnY = gamepad.buttons[3]?.pressed;
  if (btnY && !controllerDebugLatch) {
    toggleDebugMode();
  }
  controllerDebugLatch = Boolean(btnY);
}

window.addEventListener('gamepadconnected', () => updateGamepad(0));
window.addEventListener('gamepaddisconnected', () => updateGamepad(0));

// 8. Model Loading Pipeline (glTF + Draco decompression)
const dracoLoader = new DRACOLoader();
dracoLoader.setDecoderPath(`${ASSET_BASE}assets/draco/`);

const gltfLoader = new GLTFLoader();
gltfLoader.setDRACOLoader(dracoLoader);
gltfLoader.setPath(`${ASSET_BASE}assets/models/`);

updateProgress(15, 'Loading compressed facility geometry...');

gltfLoader.load(
  'DIGITAL_TWIN.glb',
  (gltf) => {
    console.log('✓ DIGITAL_TWIN.glb loaded successfully.');
    updateProgress(85, 'Initializing PBR materials & two-stage picking index...');

    const object = gltf.scene;

    // Orient model container so CAD Z-up matches Three.js Y-up
    object.rotation.x = -Math.PI / 2;

    // Recompute vertex normals once at load time for smooth metallic reflections
    object.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = false;
        child.receiveShadow = false;
        child.frustumCulled = true;

        if (child.geometry?.attributes?.position) {
          child.geometry.computeVertexNormals();
        }
      }
    });

    scene.add(object);
    object.updateMatrixWorld(true);

    // Initialize Interaction Manager (applies PBR materials, metadata, and two-stage picking)
    generatorInteractionManager = new GeneratorInteractionManager(scene, camera, renderer.domElement);
    generatorInteractionManager.initGenerators(object);

    // Elevated top-down isometric engineering perspective
    const boundingBox = new THREE.Box3().setFromObject(object);
    const center = boundingBox.getCenter(new THREE.Vector3());
    const size = boundingBox.getSize(new THREE.Vector3());

    const maxDim = Math.max(size.x, size.y, size.z);
    const fov = camera.fov * (Math.PI / 180);
    const cameraDistance = Math.abs(maxDim / (2 * Math.tan(fov / 2))) * 1.08;

    camera.position.set(
      center.x + cameraDistance * 0.58,
      center.y + cameraDistance * 0.72,
      center.z + cameraDistance * 0.58
    );
    camera.near = maxDim / 1000;
    camera.far = maxDim * 100;
    camera.updateProjectionMatrix();

    controls.target.copy(center);
    controls.update();
    homeCameraState = { position: camera.position.clone(), target: controls.target.clone() };

    updateProgress(100, 'Digital Twin Initialized');

    setTimeout(() => {
      if (loadingOverlay) loadingOverlay.classList.add('hidden');
    }, 450);
  },
  (xhr) => {
    if (xhr.lengthComputable && xhr.total > 0) {
      const percent = Math.min(85, Math.round(15 + (xhr.loaded / xhr.total) * 70));
      const loadedMB = (xhr.loaded / (1024 * 1024)).toFixed(1);
      const totalMB = (xhr.total / (1024 * 1024)).toFixed(1);
      updateProgress(percent, `Loading facility model (${loadedMB} MB / ${totalMB} MB)...`);
    } else {
      updateProgress(50, 'Loading compressed facility geometry...');
    }
  },
  (error) => {
    showError('Failed to load the Bharti Research Station DIGITAL_TWIN.glb file.', error);
  }
);

// Window Resize Handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  applyQualitySettings(currentQuality);
});

// 9. Main Render Loop
function animate() {
  requestAnimationFrame(animate);
  const delta = clock.getDelta();

  // FPS Calculation
  frameCount++;
  const now = performance.now();
  if (now - lastFpsUpdateTime >= 500) {
    currentFps = Math.round((frameCount * 1000) / (now - lastFpsUpdateTime));
    frameCount = 0;
    lastFpsUpdateTime = now;
    updateDiagnosticsHUD();
  }

  // Update Gamepad Controller Engine
  updateGamepad(delta);

  // Update Two-Stage Interaction Engine
  if (generatorInteractionManager) {
    try {
      generatorInteractionManager.update(delta);
    } catch (err) {
      console.warn('Interaction update error:', err);
    }
  }

  // Animate Red Gradient Anomaly Pulse
  if (RED_ANOMALY_MATERIAL) {
    RED_ANOMALY_MATERIAL.emissiveIntensity = 0.75 + Math.sin(clock.getElapsedTime() * 3.5) * 0.35;
  }

  controls.update();

  // Smooth Camera Gliding
  if (cameraFocus) {
    cameraFocus.progress = Math.min(1, cameraFocus.progress + delta * 1.8);
    const eased = 1 - Math.pow(1 - cameraFocus.progress, 3);
    camera.position.lerpVectors(cameraFocus.startPosition, cameraFocus.targetPosition, eased);
    controls.target.lerpVectors(cameraFocus.startTarget, cameraFocus.target, eased);
    if (cameraFocus.progress >= 1) cameraFocus = null;
  }

  // Synchronize Anime.js
  try {
    engine.update();
  } catch (e) {}

  renderer.render(scene, camera);
}

animate();
