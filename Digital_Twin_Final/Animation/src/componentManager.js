/**
 * Bharti Research Station - Component Management System
 * Coordinates component registry, physical inspection expansion,
 * isolated 2D blueprint context theme, and streamlined 5-field ML Component Info HUD.
 * 
 * Color System (Current State Driven):
 * - Normal & Early Degrading -> GREEN
 * - Degradation -> YELLOW
 * - Critical & Failure -> RED (Red Gradient)
 * Rules: Colours ONLY monitored equipment components. NEVER colours the base room floor, walls, or skids.
 */

import * as THREE from 'three';
import { SensorManager } from './sensorData.js';
import { ConditionAnalyzer } from './conditionAnalyzer.js';
import { AnimationManager } from './animationManager.js';
import { AnimeAnimationManager } from './animeAnimations.js';
import { resolveComponentMetadata, COMPONENT_METADATA_REGISTRY, FACILITY_ROOMS } from './metadataManager.js';
import {
  applyCinematicMaterials,
  CINEMATIC_MATERIALS,
  SELECTION_MATERIAL,
  BLUEPRINT_MATERIAL,
  getSelectionMaterial,
  RED_ANOMALY_MATERIAL,
  YELLOW_STATUS_MATERIAL,
  GREEN_STATUS_MATERIAL,
  getStatusMaterialForState
} from './materials.js';
import { apiDataManager } from './services/apiDataManager.js';

export const MONITORED_ASSET_NAMES = new Set([
  'EngineCore', 'BearingSystem', 'LubricationSystem', 'CoolingSystem', 'GeneratorSystem', 'FuelSystem',
  'EngineCore1', 'BearingSystem1', 'LubricationSystem1', 'CoolingSystem1', 'GeneratorSystem1', 'FuelSystem1',
  'EngineCore2', 'BearingSystem2', 'LubricationSystem2', 'CoolingSystem2', 'GeneratorSystem2', 'FuelSystem2',
  'WaterPump', 'ElectricMotor', 'FlexibleCoupling', 'HighPressureFeedPump', 'ROMembraneBank', 'PreFilterBank', 'FeedSuctionPiping',
  'ProcessDischargeLoop', 'RejectConcentrateLoop', 'InstrumentationDrainNetwork',
  'AzimuthDrive', 'ElevationDrive', 'Gearbox', 'DriveMotor'
]);

export const COMPONENT_GROUPS = {
  generator1: [
    'Frame', 'EngineCore', 'BearingSystem', 'LubricationSystem', 'CoolingSystem',
    'GeneratorSystem', 'FuelSystem', 'IntakeSystem', 'ExhaustSystem', 'ControlSystem', 'ProtectiveFrame'
  ],
  generator2: [
    'Frame1', 'EngineCore1', 'BearingSystem1', 'LubricationSystem1', 'CoolingSystem1',
    'GeneratorSystem1', 'FuelSystem1', 'IntakeSystem1', 'ExhaustSystem1', 'ControlSystem1', 'ProtectiveFrame1'
  ],
  generator3: [
    'Frame2', 'EngineCore2', 'BearingSystem2', 'LubricationSystem2', 'CoolingSystem2',
    'GeneratorSystem2', 'FuelSystem2', 'IntakeSystem2', 'ExhaustSystem2', 'ControlSystem2', 'ProtectiveFrame2'
  ]
};

export class ComponentManager {
  constructor(scene) {
    this.scene = scene;

    this.componentRegistry = {
      generator1: new Map(),
      generator2: new Map(),
      generator3: new Map()
    };

    this.componentsData = new Map();
    this.allComponentMeshes = [];
    this.sceneMeshes = [];
    this.focusedComponentData = null;
    this.focusedMetadata = null;
    this.facilitySelectedRoot = null;
    this.facilitySelectionMotion = null;
    this.anomalyViewActive = false;

    this.animationManager = new AnimationManager();
    this.animeAnimationManager = new AnimeAnimationManager();
    this.sensorManager = new SensorManager();
    this.conditionAnalyzer = new ConditionAnalyzer(this.sensorManager);

    // Streamlined Component Info Panel Elements (5 Specific Fields Only)
    this.sensorPanel = document.getElementById('sensor-panel');
    this.sensorTitle = document.getElementById('sensor-title');
    this.sensorSubtitle = document.getElementById('sensor-subtitle');

    // 1. Component ID
    this.componentIdVal = document.getElementById('component-id-val');
    // 2. Current State
    this.conditionStateVal = document.getElementById('condition-state-val');
    this.stateBadgeDot = document.getElementById('state-badge-dot');
    // 3. RUL
    this.rulVal = document.getElementById('rul-val');
    // 4. Sensor Failure
    this.sensorFailureVal = document.getElementById('sensor-failure-val');
    this.sensorStatusDot = document.getElementById('sensor-status-dot');
    // 5. Current Sensor
    this.currentSensorVal = document.getElementById('current-sensor-val');

    // Station Health Badge
    this.systemHealthText = document.getElementById('system-health-text');
    this.systemHealthDot = document.getElementById('system-health-dot');

    window.triggerTestAnomaly = (target, level = 'WARNING') => {
      const rawName = (typeof target === 'string') ? target : (target?.userData?.rawName || target?.name || 'EngineCore');
      this.conditionAnalyzer.injectTestAnomaly(rawName, level);
      console.log(`[Bharti Test Anomaly] Injected '${level}' on component '${rawName}'`);
    };

    // Subscribe to live ML API prediction updates
    apiDataManager.subscribe(() => {
      this.updateSensorPanelUI();
      this.updateSystemHealthUI();
    });
  }

  static getCanonicalName(rawName) {
    if (!rawName) return 'Unknown Component';
    if (rawName.startsWith('EngineCore')) return 'Engine Core';
    if (rawName.startsWith('BearingSystem')) return 'Bearing System';
    if (rawName.startsWith('CoolingSystem')) return 'Cooling System';
    if (rawName.startsWith('LubricationSystem')) return 'Lubrication System';
    if (rawName.startsWith('GeneratorSystem')) return 'Generator System';
    if (rawName.startsWith('FuelSystem')) return 'Fuel System';
    if (rawName.startsWith('IntakeSystem')) return 'Intake System';
    if (rawName.startsWith('ExhaustSystem')) return 'Exhaust System';
    if (rawName.startsWith('ControlSystem')) return 'Control System';
    if (rawName.startsWith('ProtectiveFrame')) return 'Protective Frame';
    if (rawName.startsWith('Frame')) return 'Frame';
    return rawName;
  }

  initRegistry(model) {
    this.componentRegistry.generator1.clear();
    this.componentRegistry.generator2.clear();
    this.componentRegistry.generator3.clear();
    this.componentsData.clear();
    this.allComponentMeshes = [];
    this.sceneMeshes = [];
    this.focusedComponentData = null;
    this.focusedMetadata = null;

    // Apply restrained cinematic metallic materials
    applyCinematicMaterials(model);

    const objectMap = new Map();
    model.traverse((child) => {
      if (child.name) {
        objectMap.set(child.name, child);
      }
    });

    // 1. Setup Generator Mechanical Inspection Pivots
    const registerGen = (genKey, genNum, groupNames) => {
      groupNames.forEach((rawName) => {
        if (objectMap.has(rawName)) {
          const groupObj = objectMap.get(rawName);
          const canonicalName = ComponentManager.getCanonicalName(rawName);
          const metadata = resolveComponentMetadata(groupObj);

          this.componentRegistry[genKey].set(rawName, groupObj);

          groupObj.updateMatrixWorld(true);
          const box = new THREE.Box3().setFromObject(groupObj);
          const center = box.getCenter(new THREE.Vector3());

          const parent = groupObj.parent || model;
          const pivot = new THREE.Group();
          pivot.name = `${rawName}_pivot`;
          pivot.position.copy(parent.worldToLocal(center.clone()));
          parent.add(pivot);
          pivot.attach(groupObj);

          const origPos = pivot.position.clone();
          const openPos = origPos.clone().add(new THREE.Vector3(0, 0, 1.0));

          const compData = {
            group: groupObj,
            pivot,
            rawName,
            canonicalName,
            metadata,
            generatorNumber: genNum,
            generatorName: `Generator Unit ${genNum}`,
            originalPosition: origPos,
            openPosition: openPos,
            currentProgress: 0.0,
            targetProgress: 0.0
          };

          this.componentsData.set(rawName, compData);

          groupObj.traverse((child) => {
            if (child.isMesh) {
              child.userData.componentRoot = groupObj;
              child.userData.metadata = metadata;
              child.userData.rawName = rawName;
              this.allComponentMeshes.push(child);
            }
          });
        }
      });
    };

    registerGen('generator1', 1, COMPONENT_GROUPS.generator1);
    registerGen('generator2', 2, COMPONENT_GROUPS.generator2);
    registerGen('generator3', 3, COMPONENT_GROUPS.generator3);

    // 2. Attach Metadata and Telemetry to all other equipment
    const telemetryEntries = [];
    model.traverse((child) => {
      if (!child.isMesh) return;
      this.sceneMeshes.push(child);

      if (!child.userData.metadata) {
        const worldPos = child.getWorldPosition(new THREE.Vector3());
        const metadata = resolveComponentMetadata(child, worldPos);
        child.userData.metadata = metadata;
        child.userData.rawName = child.name;
        child.userData.componentRoot = child;

        if (metadata.telemetryEnabled) {
          telemetryEntries.push({
            rawName: child.name,
            canonicalName: metadata.telemetryType || 'Frame'
          });
        }
      }
    });

    this.sensorManager.registerNamedInstances(telemetryEntries);
  }

  isDescendantOf(child, root) {
    if (!child || !root) return false;
    if (child === root) return true;
    if (child.userData?.componentRoot === root) return true;
    let curr = child.parent;
    while (curr) {
      if (curr === root) return true;
      curr = curr.parent;
    }
    return false;
  }

  /**
   * Identifies strictly whether a mesh belongs to one of the 32 monitored components.
   * Explicitly excludes the base floor, walls, skids, and generic background architecture.
   */
  isMonitoredComponentMesh(mesh) {
    if (!mesh || !mesh.isMesh) return false;
    const name = mesh.name || '';

    // Never color the base floor, outer walls, structural skids, or unnamed background bodies
    if (name === 'CHP' || name === 'CHP (1)' || name === 'Body210' ||
        name.includes('Floor') || name.includes('Wall') || name.startsWith('Body') ||
        name.includes('Pipe') || name.includes('Skid')) {
      return false;
    }

    if (MONITORED_ASSET_NAMES.has(name)) return true;
    if (mesh.userData?.rawName && MONITORED_ASSET_NAMES.has(mesh.userData.rawName)) return true;
    if (mesh.userData?.monitoredName && MONITORED_ASSET_NAMES.has(mesh.userData.monitoredName)) return true;
    if (mesh.userData?.componentRoot?.name && MONITORED_ASSET_NAMES.has(mesh.userData.componentRoot.name)) return true;

    let curr = mesh.parent;
    while (curr && curr !== this.scene) {
      if (MONITORED_ASSET_NAMES.has(curr.name)) return true;
      curr = curr.parent;
    }
    return false;
  }

  setBlueprintContext(activeRoot) {
    if (!activeRoot) return;

    this.sceneMeshes.forEach((mesh) => {
      const isSelected = this.isDescendantOf(mesh, activeRoot);

      if (isSelected) {
        // Selected component retains its actual 3D metallic PBR model appearance
        mesh.material = mesh.userData.baseMaterial || CINEMATIC_MATERIALS.gunmetal;
        mesh.renderOrder = 10;
      } else {
        // All other background components become translucent 2D blueprint context
        mesh.material = BLUEPRINT_MATERIAL;
        mesh.renderOrder = 0;
      }
    });
  }

  restoreCinematicContext() {
    this.sceneMeshes.forEach((mesh) => {
      mesh.material = mesh.userData.baseMaterial || CINEMATIC_MATERIALS.gunmetal;
      mesh.renderOrder = 0;
    });
  }

  setInspectionLight(root, hexColor = 0x10b981) {
    if (this.inspectionLight) this.scene.remove(this.inspectionLight);
    const box = new THREE.Box3().setFromObject(root);
    const center = box.getCenter(new THREE.Vector3());
    const radius = Math.max(3.5, box.getSize(new THREE.Vector3()).length() * 1.4);

    this.inspectionLight = new THREE.PointLight(hexColor, 3.2, radius * 3.5, 2);
    this.inspectionLight.position.copy(center).add(new THREE.Vector3(radius * 0.45, radius * 0.7, radius * 0.55));
    this.scene.add(this.inspectionLight);
  }

  clearInspectionLight() {
    if (this.inspectionLight) {
      this.scene.remove(this.inspectionLight);
      this.inspectionLight = null;
    }
  }

  beginFacilitySelectionLift(root) {
    this.clearFacilitySelectionLift();
    if (!root) return;

    root.updateMatrixWorld(true);
    const bounds = new THREE.Box3().setFromObject(root);
    const size = bounds.getSize(new THREE.Vector3()).length();
    const liftAmount = THREE.MathUtils.clamp(size * 0.28, 2.0, 6.0);

    const basePosition = root.position.clone();
    const baseScale = root.scale.clone();

    const worldTarget = root.getWorldPosition(new THREE.Vector3()).add(new THREE.Vector3(0, liftAmount, 0));
    const targetPosition = root.parent ? root.parent.worldToLocal(worldTarget) : worldTarget;
    const targetScale = baseScale.clone().multiplyScalar(1.08);

    this.facilitySelectionMotion = {
      root,
      basePosition,
      targetPosition,
      baseScale,
      targetScale,
      progress: 0,
      direction: 1
    };
  }

  clearFacilitySelectionLift() {
    if (this.facilitySelectionMotion) {
      const m = this.facilitySelectionMotion;
      m.root.position.copy(m.basePosition);
      m.root.scale.copy(m.baseScale);
      this.facilitySelectionMotion = null;
    }
  }

  /**
   * Toggles the Component Status View when clicking "COMPONENT STATUS" on the top right.
   * Colours strictly monitored components according to current state:
   * - Early degrading and normal -> GREEN
   * - Degradation -> YELLOW
   * - Critical and failure -> RED (Red gradient)
   * The base room floor, walls, and non-components are NEVER coloured.
   * Otherwise returns all components to their normal metallic model ("as it is").
   */
  toggleAnomalyView() {
    this.anomalyViewActive = !this.anomalyViewActive;
    const btn = document.getElementById('component-status-btn');
    if (btn) btn.classList.toggle('active-anomaly', this.anomalyViewActive);

    if (this.anomalyViewActive) {
      this.applyAnomalyView();
    } else {
      this.clearAnomalyView();
    }
  }

  applyAnomalyView() {
    let firstRedRoot = null;
    let firstRedMeta = null;
    let firstYellowRoot = null;
    let firstYellowMeta = null;
    let firstCompRoot = null;
    let firstCompMeta = null;

    this.sceneMeshes.forEach((mesh) => {
      // Rule: Colour ONLY the components, not the whole base room floor!
      if (!this.isMonitoredComponentMesh(mesh)) {
        mesh.material = mesh.userData.baseMaterial || CINEMATIC_MATERIALS.gunmetal;
        mesh.renderOrder = 0;
        return;
      }

      // It IS a monitored component: resolve its current state from ML API
      const rawName = mesh.userData?.rawName || mesh.name;
      const metadata = mesh.userData?.metadata;
      const prediction = apiDataManager.getPredictionForComponent(rawName, metadata);
      const stateKey = prediction?.stateObj?.key || 'NORMAL';

      // Current State Colouring:
      // Early degrading and normal -> GREEN
      // Degradation -> YELLOW
      // Critical and failure -> RED
      const statusMat = getStatusMaterialForState(stateKey);
      mesh.material = statusMat;
      mesh.renderOrder = 5;

      const compRoot = mesh.userData?.componentRoot || mesh;
      if ((stateKey === 'CRITICAL' || stateKey === 'FAILURE') && !firstRedRoot) {
        firstRedRoot = compRoot;
        firstRedMeta = metadata;
      } else if (stateKey === 'DEGRADING' && !firstYellowRoot) {
        firstYellowRoot = compRoot;
        firstYellowMeta = metadata;
      } else if (!firstCompRoot) {
        firstCompRoot = compRoot;
        firstCompMeta = metadata;
      }
    });

    // If there is an alert component (Red or Yellow), focus camera and spotlight on it!
    const targetRoot = firstRedRoot || firstYellowRoot || firstCompRoot;
    const targetMeta = firstRedMeta || firstYellowMeta || firstCompMeta;
    if (targetRoot && targetMeta) {
      const lightColor = firstRedRoot ? 0xef4444 : (firstYellowRoot ? 0xfacc15 : 0x10b981);
      this.setInspectionLight(targetRoot, lightColor);
      this.focusedMetadata = targetMeta;
      this.showSensorPanel(targetMeta);

      window.dispatchEvent(new CustomEvent('digital-twin-selection', {
        detail: { component: targetRoot, metadata: targetMeta, locked: true }
      }));
    }
  }

  clearAnomalyView() {
    this.anomalyViewActive = false;
    const btn = document.getElementById('component-status-btn');
    if (btn) btn.classList.remove('active-anomaly');

    // Restore all components and scene meshes to their authentic metallic models ("as it is")
    this.restoreCinematicContext();
    this.clearInspectionLight();
    this.hideSensorPanel();

    window.dispatchEvent(new CustomEvent('digital-twin-selection', {
      detail: { component: null, metadata: null, locked: false }
    }));
  }

  setFocusedComponent(target) {
    if (this.anomalyViewActive) {
      this.anomalyViewActive = false;
      const btn = document.getElementById('component-status-btn');
      if (btn) btn.classList.remove('active-anomaly');
    }

    if (!target) {
      if (this.focusedComponentData) {
        const activeGenNum = this.focusedComponentData.generatorNumber || 1;
        const genKey = `generator${activeGenNum}`;
        const genGroupNames = COMPONENT_GROUPS[genKey] || [];
        const genCompMap = new Map();
        genGroupNames.forEach((rawName) => {
          if (this.componentsData.has(rawName)) {
            genCompMap.set(rawName, this.componentsData.get(rawName));
          }
        });
        this.animeAnimationManager.exitInspectionMode(genCompMap);
        this.focusedComponentData = null;
      }

      this.clearFacilitySelectionLift();
      this.facilitySelectedRoot = null;
      this.focusedMetadata = null;
      this.restoreCinematicContext();
      this.clearInspectionLight();
      this.hideSensorPanel();
      return;
    }

    let compRoot = target.userData?.componentRoot || target;
    const rawName = target.userData?.rawName || target.name;
    const isGenComp = this.componentsData.has(rawName);

    let targetCompData = isGenComp ? this.componentsData.get(rawName) : null;
    if (!targetCompData) {
      for (const comp of this.componentsData.values()) {
        if (comp.group === target || comp.pivot === target || this.isDescendantOf(target, comp.group)) {
          targetCompData = comp;
          compRoot = comp.group;
          break;
        }
      }
    }

    const metadata = target.userData?.metadata || resolveComponentMetadata(target);
    this.focusedMetadata = metadata;

    const analysis = this.conditionAnalyzer.analyzeComponent(rawName, metadata);
    const stateHex = analysis.stateObj?.emissive || 0x10b981;

    this.clearFacilitySelectionLift();

    if (targetCompData) {
      this.focusedComponentData = targetCompData;
      this.facilitySelectedRoot = targetCompData.group;

      const activeGenNum = targetCompData.generatorNumber;
      const genKey = `generator${activeGenNum}`;
      const genGroupNames = COMPONENT_GROUPS[genKey] || [];
      const genCompMap = new Map();
      genGroupNames.forEach((name) => {
        if (this.componentsData.has(name)) {
          genCompMap.set(name, this.componentsData.get(name));
        }
      });

      this.animeAnimationManager.enterInspectionMode(targetCompData.group, targetCompData, genCompMap);
      this.setBlueprintContext(targetCompData.group);
      this.setInspectionLight(targetCompData.group, stateHex);
    } else {
      if (this.focusedComponentData) {
        const activeGenNum = this.focusedComponentData.generatorNumber || 1;
        const genKey = `generator${activeGenNum}`;
        const genGroupNames = COMPONENT_GROUPS[genKey] || [];
        const genCompMap = new Map();
        genGroupNames.forEach((name) => {
          if (this.componentsData.has(name)) {
            genCompMap.set(name, this.componentsData.get(name));
          }
        });
        this.animeAnimationManager.exitInspectionMode(genCompMap);
        this.focusedComponentData = null;
      }

      this.facilitySelectedRoot = compRoot;
      this.beginFacilitySelectionLift(compRoot);
      this.setBlueprintContext(compRoot);
      this.setInspectionLight(compRoot, stateHex);
    }

    this.showSensorPanel(metadata);
  }

  showSensorPanel(metadata) {
    if (!metadata) return;

    if (this.sensorPanel) {
      if (this.sensorTitle) this.sensorTitle.textContent = metadata.displayName;
      if (this.sensorSubtitle) this.sensorSubtitle.textContent = `${metadata.room} · ${metadata.subsystem}`;
      this.updateSensorPanelUI();
      this.sensorPanel.classList.remove('hidden');
    }
  }

  hideSensorPanel() {
    if (this.sensorPanel) this.sensorPanel.classList.add('hidden');
  }

  /**
   * Updates Component Info Panel with strictly the 5 requested fields:
   * 1. Component ID
   * 2. Current state
   * 3. RUL
   * 4. Sensor failure
   * 5. Current sensor
   */
  updateSensorPanelUI() {
    if (!this.sensorPanel || this.sensorPanel.classList.contains('hidden') || !this.focusedMetadata) return;

    const rawName = this.focusedMetadata.objectName;
    const analysis = this.conditionAnalyzer.analyzeComponent(rawName, this.focusedMetadata);

    // 1. Component ID
    if (this.componentIdVal) {
      this.componentIdVal.textContent = analysis.componentId || 'C001';
    }

    // 2. Current State
    if (this.conditionStateVal) {
      this.conditionStateVal.textContent = analysis.currentState;
      this.conditionStateVal.style.color = analysis.stateColor;
    }
    if (this.stateBadgeDot) {
      this.stateBadgeDot.style.backgroundColor = analysis.stateColor;
      this.stateBadgeDot.style.boxShadow = `0 0 8px ${analysis.stateColor}`;
    }

    // 3. RUL
    if (this.rulVal) {
      if (analysis.rulDays !== null && !isNaN(analysis.rulDays)) {
        this.rulVal.textContent = `${analysis.rulDays} Days`;
      } else {
        this.rulVal.textContent = analysis.displayRul || 'Unavailable';
      }
    }

    // 4. Sensor Failure
    const isSensorFailed = (analysis.sensorStatus === 'SENSOR_FAILURE');
    if (this.sensorFailureVal) {
      this.sensorFailureVal.textContent = isSensorFailed ? 'YES (FAILED)' : 'NO';
      this.sensorFailureVal.style.color = isSensorFailed ? '#ef4444' : '#10b981';
    }
    if (this.sensorStatusDot) {
      const color = isSensorFailed ? '#ef4444' : '#10b981';
      this.sensorStatusDot.style.backgroundColor = color;
      this.sensorStatusDot.style.boxShadow = `0 0 8px ${color}`;
    }

    // 5. Current Sensor
    if (this.currentSensorVal) {
      const active = (analysis.activeSensor || 'PRIMARY').toUpperCase();
      this.currentSensorVal.textContent = active;
      this.currentSensorVal.style.color = (active === 'BACKUP') ? '#f59e0b' : '#38bdf8';
    }
  }

  updateSidebarAssetDots() {
    const sections = document.querySelectorAll('#asset-navigator details');
    let redCount = 0;
    let yellowCount = 0;

    sections.forEach((section) => {
      let sectionHasRed = false;
      let sectionHasYellow = false;
      const buttons = section.querySelectorAll('button[data-asset]');

      buttons.forEach((btn) => {
        const assetName = btn.dataset.asset;
        const prediction = apiDataManager.getPredictionForComponent(assetName);
        const stateKey = prediction?.stateObj?.key || 'NORMAL';

        let dotColor = '#10b981'; // Early degrading and normal -> Green
        if (stateKey === 'CRITICAL' || stateKey === 'FAILURE') {
          dotColor = '#ef4444'; // Red
          sectionHasRed = true;
          redCount++;
          btn.classList.add('is-failed-asset');
          btn.classList.remove('is-degrading-asset');
        } else if (stateKey === 'DEGRADING') {
          dotColor = '#facc15'; // Yellow
          sectionHasYellow = true;
          yellowCount++;
          btn.classList.add('is-degrading-asset');
          btn.classList.remove('is-failed-asset');
        } else {
          btn.classList.remove('is-failed-asset');
          btn.classList.remove('is-degrading-asset');
        }

        let dot = btn.querySelector('.asset-state-dot');
        if (!dot) {
          dot = document.createElement('span');
          dot.className = 'asset-state-dot';
          btn.prepend(dot);
        }

        dot.style.backgroundColor = dotColor;
        dot.style.boxShadow = `0 0 6px ${dotColor}`;
      });

      section.classList.toggle('has-anomaly', sectionHasRed);
      section.classList.toggle('has-degrading', !sectionHasRed && sectionHasYellow);
    });

    // Update Top Right Component Status Button
    const statusBtn = document.getElementById('component-status-btn');
    const statusText = document.getElementById('component-status-btn-text');
    if (statusBtn) {
      statusBtn.classList.toggle('has-fault', redCount > 0);
      statusBtn.classList.toggle('has-warning', redCount === 0 && yellowCount > 0);
      if (statusText) {
        if (redCount > 0) {
          statusText.textContent = `COMPONENT STATUS (${redCount} RED)`;
        } else if (yellowCount > 0) {
          statusText.textContent = `COMPONENT STATUS (${yellowCount} YELLOW)`;
        } else {
          statusText.textContent = 'COMPONENT STATUS: OK';
        }
      }
    }
  }

  updateSystemHealthUI() {
    if (!this.systemHealthText) return;

    const globalHealth = this.conditionAnalyzer.getGlobalSystemHealth();
    const statusText = globalHealth.systemStatus;
    const color = globalHealth.stateObj?.color || '#10b981';

    this.systemHealthText.innerHTML = `STATION STATUS &bull; ${statusText}`;
    this.systemHealthText.style.color = color;

    if (this.systemHealthDot) {
      this.systemHealthDot.style.backgroundColor = color;
      this.systemHealthDot.style.boxShadow = `0 0 8px ${color}`;
    }

    this.updateSidebarAssetDots();
  }

  update(delta) {
    if (this.facilitySelectionMotion) {
      const m = this.facilitySelectionMotion;
      m.progress = Math.min(1, m.progress + delta * 4.5);
      const eased = 1 - Math.pow(1 - m.progress, 3);
      m.root.position.lerpVectors(m.basePosition, m.targetPosition, eased);
      m.root.scale.lerpVectors(m.baseScale, m.targetScale, eased);
    }

    this.animationManager.update(delta);
    this.sensorManager.update(delta);
    this.updateSensorPanelUI();
    this.updateSystemHealthUI();
  }
}
