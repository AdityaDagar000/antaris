/**
 * Bharti Research Station - Two-Stage Component Picking & Interaction Engine
 * Interactivity and hover animations restricted STRICTLY to the 32 monitored engineering assets.
 */

import * as THREE from 'three';
import { ComponentManager, COMPONENT_GROUPS } from './componentManager.js';
import { setMeshHoverState, setMeshSelectionState, BLUEPRINT_MATERIAL } from './materials.js';
import { resolveComponentMetadata } from './metadataManager.js';

// The exact 32 monitored engineering components specified in facility requirements
export const MONITORED_ASSET_NAMES = new Set([
  // 1. CHP Room Units (18 assets)
  'EngineCore', 'BearingSystem', 'LubricationSystem', 'CoolingSystem', 'GeneratorSystem', 'FuelSystem',
  'EngineCore1', 'BearingSystem1', 'LubricationSystem1', 'CoolingSystem1', 'GeneratorSystem1', 'FuelSystem1',
  'EngineCore2', 'BearingSystem2', 'LubricationSystem2', 'CoolingSystem2', 'GeneratorSystem2', 'FuelSystem2',

  // 2. Water Management (7 assets)
  'WaterPump', 'ElectricMotor', 'FlexibleCoupling',
  'HighPressureFeedPump', 'ROMembraneBank', 'PreFilterBank', 'FeedSuctionPiping',

  // 3. Sewage Management (3 assets)
  'ProcessDischargeLoop', 'RejectConcentrateLoop', 'InstrumentationDrainNetwork',

  // 4. Data & Telecom / Logistics Drives (4 assets)
  'AzimuthDrive', 'ElevationDrive', 'Gearbox', 'DriveMotor'
]);

export class GeneratorInteractionManager {
  constructor(scene, camera, domElement) {
    this.scene = scene;
    this.camera = camera;
    this.domElement = domElement;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2(-999, -999);
    this.rawPointerX = 0;
    this.rawPointerY = 0;
    this.pointerActive = false;

    // Two-Stage Picking Data Structures (restricted to monitored components only)
    this.interactiveObjects = [];
    this.componentLookup = new Map(); // uuid -> metadata
    this.meshWorldSpheres = new Map(); // uuid -> THREE.Sphere

    this.generators = [];
    this.objectMap = new Map();

    // Interaction State
    this.hoveredMesh = null;
    this.hoveredMetadata = null;
    this.selectedRoot = null;
    this.selectedMesh = null;
    this.selectedMetadata = null;

    this.lastRaycastTime = 0;
    this.raycastThrottleMs = 20; // 50 Hz raycast sampling
    this.cachedIntersection = null;
    this.controllerActive = false;

    // Tooltip DOM Elements
    this.hoverTooltip = document.getElementById('hover-label');
    this.tooltipTitle = document.getElementById('hover-label-title');
    this.tooltipState = document.getElementById('hover-label-state');

    this.componentManager = new ComponentManager(scene);

    // Event Listeners
    this.onPointerMove = this.onPointerMove.bind(this);
    this.onPointerLeave = this.onPointerLeave.bind(this);
    this.onClick = this.onClick.bind(this);
    this.onKeyDown = this.onKeyDown.bind(this);

    this.domElement.addEventListener('pointermove', this.onPointerMove);
    this.domElement.addEventListener('pointerleave', this.onPointerLeave);
    this.domElement.addEventListener('click', this.onClick);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('digital-twin-select-name', (e) => this.selectByName(e.detail?.name));
  }

  onPointerMove(event) {
    const rect = this.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.rawPointerX = event.clientX;
    this.rawPointerY = event.clientY;
    this.pointerActive = true;

    if (this.hoverTooltip && !this.hoverTooltip.classList.contains('hidden')) {
      this.positionTooltip(event.clientX, event.clientY);
    }
  }

  positionTooltip(clientX, clientY) {
    if (!this.hoverTooltip) return;
    const paddingX = 18;
    const paddingY = 18;
    const winWidth = window.innerWidth;
    const winHeight = window.innerHeight;

    let posX = clientX + paddingX;
    let posY = clientY + paddingY;

    if (posX + 250 > winWidth) posX = clientX - 260;
    if (posY + 100 > winHeight) posY = clientY - 110;

    this.hoverTooltip.style.transform = `translate3d(${posX}px, ${posY}px, 0)`;
  }

  onPointerLeave() {
    this.pointerActive = false;
    this.pointer.set(-999, -999);
    this.clearHover();
  }

  getIntersection(force = false) {
    if (!this.pointerActive) return null;
    const now = performance.now();
    if (!force && now - this.lastRaycastTime < this.raycastThrottleMs) {
      return this.cachedIntersection;
    }

    this.lastRaycastTime = now;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    // Stage 1: Broad Phase Candidate Detection against monitored assets only
    const ray = this.raycaster.ray;
    const candidates = [];

    for (let i = 0; i < this.interactiveObjects.length; i++) {
      const mesh = this.interactiveObjects[i];
      if (!mesh.visible) continue;

      const sphere = this.meshWorldSpheres.get(mesh.uuid);
      if (sphere && ray.intersectsSphere(sphere)) {
        const distSq = ray.origin.distanceToSquared(sphere.center);
        candidates.push({ mesh, distSq });
      }
    }

    if (candidates.length === 0) {
      this.cachedIntersection = null;
      return null;
    }

    candidates.sort((a, b) => a.distSq - b.distSq);
    const candidateMeshes = candidates.map(c => c.mesh);

    // Stage 2: Narrow Phase Exact Triangle Raycast on candidate meshes
    const intersects = this.raycaster.intersectObjects(candidateMeshes, false);
    this.cachedIntersection = intersects.length > 0 ? intersects[0] : null;

    return this.cachedIntersection;
  }

  setPointerFromClient(clientX, clientY) {
    const rect = this.domElement.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    this.pointer.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.rawPointerX = clientX;
    this.rawPointerY = clientY;
    this.pointerActive = true;
    return true;
  }

  onClick(event) {
    this.setPointerFromClient(event.clientX, event.clientY);
    const intersection = this.getIntersection(true);

    if (!intersection) {
      if (!this.selectedRoot) {
        this.clearSelection();
      }
      return;
    }

    this.selectMesh(intersection.object);
  }

  selectMesh(mesh) {
    if (!mesh) return;

    let root = mesh.userData?.componentRoot || mesh;
    const metadata = this.componentLookup.get(mesh.uuid) || resolveComponentMetadata(root);

    // Check if clicked component is a generator cover
    const genWithCover = this.generators.find(g => g.cover === root || g.cover === mesh);
    if (genWithCover) {
      genWithCover.isManuallyOpened = !genWithCover.isManuallyOpened;
      return;
    }

    // Toggle selection if clicking already selected component
    if (this.selectedRoot === root || this.selectedMesh === mesh) {
      this.clearSelection();
      return;
    }

    // If selecting an internal component of a generator, open its cover automatically
    const parentGen = this.generators.find(g => g.components.includes(root));
    if (parentGen && parentGen.cover) {
      parentGen.targetProgress = 1.0;
    }

    this.selectedRoot = root;
    this.selectedMesh = mesh;
    this.selectedMetadata = metadata;

    // Focus component in ComponentManager (triggers physical expansion + 2D blueprint context)
    this.componentManager.setFocusedComponent(root);

    window.dispatchEvent(new CustomEvent('digital-twin-selection', {
      detail: { component: root, metadata, locked: true }
    }));
  }

  /**
   * Center reticle raycast for controller selection when no mouse pointer is moving
   */
  selectCenterTarget() {
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    const ray = this.raycaster.ray;
    const candidates = [];

    for (let i = 0; i < this.interactiveObjects.length; i++) {
      const mesh = this.interactiveObjects[i];
      if (!mesh.visible) continue;

      const sphere = this.meshWorldSpheres.get(mesh.uuid);
      if (sphere && ray.intersectsSphere(sphere)) {
        candidates.push({ mesh, distSq: ray.origin.distanceToSquared(sphere.center) });
      }
    }

    candidates.sort((a, b) => a.distSq - b.distSq);
    const candidateMeshes = candidates.map(c => c.mesh);
    const intersects = this.raycaster.intersectObjects(candidateMeshes, false);

    if (intersects.length > 0) {
      this.selectMesh(intersects[0].object);
    }
  }

  selectByName(name) {
    if (!name) return;
    const target = this.objectMap.get(name);
    if (target) {
      if (target.isMesh) {
        this.selectMesh(target);
      } else {
        let firstMesh = null;
        target.traverse(c => { if (c.isMesh && !firstMesh) firstMesh = c; });
        this.selectMesh(firstMesh || target);
      }
    }
  }

  clearHover() {
    if (this.hoveredMesh) {
      const isSelected = this.selectedRoot && (this.hoveredMesh === this.selectedMesh || this.componentManager.isDescendantOf(this.hoveredMesh, this.selectedRoot));
      if (!isSelected) {
        setMeshHoverState(this.hoveredMesh, false, Boolean(this.selectedRoot));
      }
      this.hoveredMesh = null;
      this.hoveredMetadata = null;
    }

    if (this.hoverTooltip) {
      this.hoverTooltip.classList.add('hidden');
    }

    this.domElement.style.cursor = 'default';
  }

  clearSelection() {
    this.selectedRoot = null;
    this.selectedMesh = null;
    this.selectedMetadata = null;

    // Restore covers
    this.generators.forEach(gen => {
      gen.isManuallyOpened = false;
      gen.targetProgress = 0.0;
    });

    this.componentManager.setFocusedComponent(null);

    window.dispatchEvent(new CustomEvent('digital-twin-selection', {
      detail: { component: null, metadata: null, locked: false }
    }));
  }

  onKeyDown(event) {
    if (event.key === 'Escape') {
      this.clearSelection();
    }
  }

  initGenerators(model) {
    this.generators = [];
    this.interactiveObjects = [];
    this.componentLookup.clear();
    this.meshWorldSpheres.clear();

    // 1. Initialize component manager & apply cinematic metallic PBR materials
    this.componentManager.initRegistry(model);

    // Map object nodes from model
    const objectMap = new Map();
    model.traverse((child) => {
      if (child.name) {
        objectMap.set(child.name, child);
      }
    });
    this.objectMap = objectMap;

    // 2. Register Generator Sets
    const generatorDefs = [
      {
        id: 'gen1',
        name: 'Generator Unit 1',
        genNum: 1,
        coverName: 'GeneratorBox2',
        componentNames: COMPONENT_GROUPS.generator1
      },
      {
        id: 'gen2',
        name: 'Generator Unit 2',
        genNum: 2,
        coverName: 'GeneratorBox3',
        componentNames: COMPONENT_GROUPS.generator2
      },
      {
        id: 'gen3',
        name: 'Generator Unit 3',
        genNum: 3,
        coverName: 'GeneratorBox1',
        componentNames: COMPONENT_GROUPS.generator3
      }
    ];

    generatorDefs.forEach((def) => {
      const genObj = {
        id: def.id,
        name: def.name,
        genNum: def.genNum,
        cover: null,
        components: [],
        originalPosition: null,
        openPosition: null,
        currentProgress: 0.0,
        targetProgress: 0.0,
        isManuallyOpened: false
      };

      if (def.coverName && objectMap.has(def.coverName)) {
        const coverObj = objectMap.get(def.coverName);
        genObj.cover = coverObj;
        genObj.originalPosition = coverObj.position.clone();
        genObj.openPosition = coverObj.position.clone().add(new THREE.Vector3(0, 0, 5.5));
      }

      def.componentNames.forEach((cName) => {
        if (objectMap.has(cName)) {
          genObj.components.push(objectMap.get(cName));
        }
      });

      this.generators.push(genObj);
    });

    // 3. Register ONLY the 32 Monitored Engineering Assets into interactiveObjects
    model.updateMatrixWorld(true);

    const isMonitored = (obj) => {
      if (!obj) return false;
      if (MONITORED_ASSET_NAMES.has(obj.name)) return true;
      let curr = obj.parent;
      while (curr && curr !== model) {
        if (MONITORED_ASSET_NAMES.has(curr.name)) return true;
        curr = curr.parent;
      }
      return false;
    };

    model.traverse((child) => {
      if (!child.isMesh) return;

      // STRICT FILTER: Only register meshes belonging to the 32 monitored assets
      if (!isMonitored(child)) return;

      if (!child.geometry.boundingSphere) child.geometry.computeBoundingSphere();

      const worldSphere = child.geometry.boundingSphere.clone();
      worldSphere.applyMatrix4(child.matrixWorld);

      // Find top monitored parent name
      let monitoredName = child.name;
      if (!MONITORED_ASSET_NAMES.has(monitoredName)) {
        let curr = child.parent;
        while (curr && curr !== model) {
          if (MONITORED_ASSET_NAMES.has(curr.name)) {
            monitoredName = curr.name;
            break;
          }
          curr = curr.parent;
        }
      }

      const metadata = resolveComponentMetadata({ name: monitoredName }, worldSphere.center);
      child.userData.metadata = metadata;
      child.userData.monitoredName = monitoredName;

      this.interactiveObjects.push(child);
      this.componentLookup.set(child.uuid, metadata);
      this.componentLookup.set(child.name, metadata);
      this.meshWorldSpheres.set(child.uuid, worldSphere);
    });

    console.log(`✓ Filtered Two-Stage Picking Initialized: ${this.interactiveObjects.length} meshes across 32 monitored assets.`);
  }

  browseByName(name) {
    const target = this.objectMap.get(name);
    if (!target) return;
    this.domElement.style.cursor = 'pointer';

    let mesh = target.isMesh ? target : null;
    if (!mesh) {
      target.traverse(c => { if (c.isMesh && !mesh) mesh = c; });
    }

    if (mesh) {
      if (this.hoveredMesh && this.hoveredMesh !== mesh) {
        setMeshHoverState(this.hoveredMesh, false, Boolean(this.selectedRoot));
      }
      this.hoveredMesh = mesh;
      this.hoveredMetadata = this.componentLookup.get(mesh.uuid) || mesh.userData?.metadata || resolveComponentMetadata(target);
      setMeshHoverState(mesh, true, Boolean(this.selectedRoot));

      if (this.hoverTooltip && this.hoveredMetadata) {
        if (this.tooltipTitle) this.tooltipTitle.textContent = this.hoveredMetadata.displayName;
        if (this.tooltipState) this.tooltipState.textContent = `${this.hoveredMetadata.room.toUpperCase()} · ${this.hoveredMetadata.subsystem.toUpperCase()}`;
        this.hoverTooltip.classList.remove('hidden');
        this.positionTooltip(window.innerWidth * 0.35, window.innerHeight * 0.45);
      }
    }
  }

  setControllerActive(active) {
    this.controllerActive = active;
  }

  update(delta) {
    // 1. Hover Evaluation (Only against monitored components)
    if (this.pointerActive) {
      const intersection = this.getIntersection();

      if (intersection && intersection.object) {
        const hitMesh = intersection.object;

        if (this.hoveredMesh !== hitMesh) {
          if (this.hoveredMesh) {
            const isSelected = this.selectedRoot && (this.hoveredMesh === this.selectedMesh || this.componentManager.isDescendantOf(this.hoveredMesh, this.selectedRoot));
            if (!isSelected) {
              setMeshHoverState(this.hoveredMesh, false, Boolean(this.selectedRoot));
            }
          }

          this.hoveredMesh = hitMesh;
          this.hoveredMetadata = this.componentLookup.get(hitMesh.uuid) || hitMesh.userData?.metadata;

          const isSelected = this.selectedRoot && (hitMesh === this.selectedMesh || this.componentManager.isDescendantOf(hitMesh, this.selectedRoot));
          if (!isSelected) {
            setMeshHoverState(hitMesh, true, Boolean(this.selectedRoot));
          }

          if (this.hoverTooltip && this.hoveredMetadata) {
            if (this.tooltipTitle) this.tooltipTitle.textContent = this.hoveredMetadata.displayName;
            if (this.tooltipState) this.tooltipState.textContent = `${this.hoveredMetadata.room.toUpperCase()} · ${this.hoveredMetadata.subsystem.toUpperCase()}`;
            this.hoverTooltip.classList.remove('hidden');
            this.positionTooltip(this.rawPointerX, this.rawPointerY);
          }

          this.domElement.style.cursor = 'pointer';
        }
      } else {
        if (this.hoveredMesh) {
          this.clearHover();
        }
      }
    } else if (this.controllerActive) {
      // Controller Center-Aim Raycast
      const now = performance.now();
      if (now - this.lastRaycastTime >= this.raycastThrottleMs) {
        this.lastRaycastTime = now;
        this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
        const ray = this.raycaster.ray;
        const candidates = [];

        for (let i = 0; i < this.interactiveObjects.length; i++) {
          const mesh = this.interactiveObjects[i];
          if (!mesh.visible) continue;

          const sphere = this.meshWorldSpheres.get(mesh.uuid);
          if (sphere && ray.intersectsSphere(sphere)) {
            candidates.push({ mesh, distSq: ray.origin.distanceToSquared(sphere.center) });
          }
        }

        if (candidates.length > 0) {
          candidates.sort((a, b) => a.distSq - b.distSq);
          const candidateMeshes = candidates.map(c => c.mesh);
          const intersects = this.raycaster.intersectObjects(candidateMeshes, false);
          if (intersects.length > 0) {
            const hitMesh = intersects[0].object;
            if (this.hoveredMesh !== hitMesh) {
              if (this.hoveredMesh) {
                const isSelected = this.selectedRoot && (this.hoveredMesh === this.selectedMesh || this.componentManager.isDescendantOf(this.hoveredMesh, this.selectedRoot));
                if (!isSelected) {
                  setMeshHoverState(this.hoveredMesh, false, Boolean(this.selectedRoot));
                }
              }

              this.hoveredMesh = hitMesh;
              this.hoveredMetadata = this.componentLookup.get(hitMesh.uuid) || hitMesh.userData?.metadata;

              const isSelected = this.selectedRoot && (hitMesh === this.selectedMesh || this.componentManager.isDescendantOf(hitMesh, this.selectedRoot));
              if (!isSelected) {
                setMeshHoverState(hitMesh, true, Boolean(this.selectedRoot));
              }

              if (this.hoverTooltip && this.hoveredMetadata) {
                if (this.tooltipTitle) this.tooltipTitle.textContent = this.hoveredMetadata.displayName;
                if (this.tooltipState) this.tooltipState.textContent = `${this.hoveredMetadata.room.toUpperCase()} · ${this.hoveredMetadata.subsystem.toUpperCase()}`;
                this.hoverTooltip.classList.remove('hidden');
                this.positionTooltip(window.innerWidth * 0.5, window.innerHeight * 0.5);
              }
            }
          } else {
            if (this.hoveredMesh) this.clearHover();
          }
        } else {
          if (this.hoveredMesh) this.clearHover();
        }
      }
    }

    // 2. Animate Generator Enclosures
    this.generators.forEach((gen) => {
      const isSelected = this.selectedRoot && gen.components.includes(this.selectedRoot);
      const shouldOpen = gen.isManuallyOpened || isSelected;
      gen.targetProgress = shouldOpen ? 1.0 : 0.0;

      if (Math.abs(gen.currentProgress - gen.targetProgress) > 0.0001) {
        gen.currentProgress += (gen.targetProgress - gen.currentProgress) * Math.min(1.0, delta * 6.0);

        if (gen.cover && gen.originalPosition && gen.openPosition) {
          gen.cover.position.lerpVectors(gen.originalPosition, gen.openPosition, gen.currentProgress);
        }
      }
    });

    // 3. Update Component Manager
    this.componentManager.update(delta);
  }

  dispose() {
    this.domElement.removeEventListener('pointermove', this.onPointerMove);
    this.domElement.removeEventListener('pointerleave', this.onPointerLeave);
    this.domElement.removeEventListener('click', this.onClick);
    window.removeEventListener('keydown', this.onKeyDown);
  }
}
