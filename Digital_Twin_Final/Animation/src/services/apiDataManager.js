/**
 * Bharti Research Station - Live ML/RUL API Service Layer
 * Fetches, normalizes, and maintains live prediction telemetry from:
 * https://digital-twin-rul-api-dm9i.onrender.com/predictions
 */

export const API_ENDPOINT = 'https://digital-twin-rul-api-dm9i.onrender.com/predictions';

/**
 * Semantic Color System & State Taxonomy
 * Supported states: NORMAL (Green), EARLY_DEGRADING (Amber), DEGRADING (Orange), CRITICAL (Red), FAILURE (Dark Red)
 */
export const STATE_SYSTEM = {
  NORMAL: {
    key: 'NORMAL',
    label: 'NORMAL',
    color: '#10b981',
    emissive: 0x10b981,
    severity: 0
  },
  EARLY_DEGRADING: {
    key: 'EARLY_DEGRADING',
    label: 'EARLY DEGRADING',
    color: '#10b981',
    emissive: 0x10b981,
    severity: 0
  },
  DEGRADING: {
    key: 'DEGRADING',
    label: 'DEGRADING',
    color: '#facc15',
    emissive: 0xeab308,
    severity: 1
  },
  CRITICAL: {
    key: 'CRITICAL',
    label: 'CRITICAL',
    color: '#ef4444',
    emissive: 0xef4444,
    severity: 2
  },
  FAILURE: {
    key: 'FAILURE',
    label: 'FAILURE',
    color: '#ef4444',
    emissive: 0xdc2626,
    severity: 3
  }
};

export function normalizeState(rawState) {
  if (!rawState) return STATE_SYSTEM.NORMAL;
  const s = String(rawState).toUpperCase().replace(/[-\s]/g, '_');
  
  if (s.includes('FAIL')) return STATE_SYSTEM.FAILURE;
  if (s.includes('CRITICAL')) return STATE_SYSTEM.CRITICAL;
  if (s.includes('EARLY')) return STATE_SYSTEM.EARLY_DEGRADING;
  if (s.includes('DEGRAD')) return STATE_SYSTEM.DEGRADING;
  return STATE_SYSTEM.NORMAL;
}

/**
 * Deterministic mapping table linking API machine_id + component_type / component_id / asset_id
 * to CAD object names present in the Three.js 3D model.
 */
export const API_CAD_MAPPING = {
  // --- CHP Unit 1 (CHP01) ---
  'CHP01_Engine': 'EngineCore',
  'CHP01_Bearing': 'BearingSystem',
  'CHP01_Lubrication': 'LubricationSystem',
  'CHP01_Cooling': 'CoolingSystem',
  'CHP01_Generator': 'GeneratorSystem',
  'CHP01_Fuel': 'FuelSystem',

  // --- CHP Unit 2 (CHP02) ---
  'CHP02_Engine': 'EngineCore1',
  'CHP02_Bearing': 'BearingSystem1',
  'CHP02_Lubrication': 'LubricationSystem1',
  'CHP02_Cooling': 'CoolingSystem1',
  'CHP02_Generator': 'GeneratorSystem1',
  'CHP02_Fuel': 'FuelSystem1',

  // --- CHP Unit 3 (CHP03) ---
  'CHP03_Engine': 'EngineCore2',
  'CHP03_Bearing': 'BearingSystem2',
  'CHP03_Lubrication': 'LubricationSystem2',
  'CHP03_Cooling': 'CoolingSystem2',
  'CHP03_Generator': 'GeneratorSystem2',
  'CHP03_Fuel': 'FuelSystem2',

  // --- Utility Pump Station 1 (PUMP01) ---
  'PUMP01_Pump': 'WaterPump',
  'PUMP01_Motor': 'ElectricMotor',
  'PUMP01_Bearing': 'FlexibleCoupling',

  // --- Reverse Osmosis Plant (RO01) ---
  'RO01_Pump': 'HighPressureFeedPump',
  'RO01_Membrane': 'ROMembraneBank',
  'RO01_Filter': 'PreFilterBank',
  'RO01_Valve': 'FeedSuctionPiping',

  // --- Wastewater Treatment Plant (WW01) ---
  'WW01_Pump': 'ProcessDischargeLoop',
  'WW01_Filter': 'RejectConcentrateLoop',
  'WW01_Valve': 'InstrumentationDrainNetwork',

  // --- Galley Dishwasher Unit (DISH01) / Data & Telecom Mechanical Drives ---
  'DISH01_Drive': 'AzimuthDrive',
  'DISH01_Gearbox': 'Gearbox',
  'DISH01_Motor': 'DriveMotor',

  // --- Server Room Rack (SERVER01) ---
  'SERVER01_Fan': 'Data+Center.obj',
  'SERVER01_Storage': 'Data+Center.obj (1)',
  'SERVER01_Power Supply': 'ControlCabinet',
  'SERVER01_Cooling': 'ControlCabinet (1)'
};

/**
 * Reverse mapping table: CAD object name -> machine_id + component_type key
 */
export const CAD_TO_API_KEY = {};
Object.entries(API_CAD_MAPPING).forEach(([apiKey, cadName]) => {
  CAD_TO_API_KEY[cadName] = apiKey;
});

// Secondary aliases for CAD objects sharing the same physical subsystem
const CAD_ALIASES = {
  'IntakeSystem': 'CHP01_Engine',
  'ExhaustSystem': 'CHP01_Engine',
  'ControlSystem': 'CHP01_Generator',
  'Frame': 'CHP01_Engine',
  'ProtectiveFrame': 'CHP01_Engine',

  'IntakeSystem1': 'CHP02_Engine',
  'ExhaustSystem1': 'CHP02_Engine',
  'ControlSystem1': 'CHP02_Generator',
  'Frame1': 'CHP02_Engine',
  'ProtectiveFrame1': 'CHP02_Engine',

  'IntakeSystem2': 'CHP03_Engine',
  'ExhaustSystem2': 'CHP03_Engine',
  'ControlSystem2': 'CHP03_Generator',
  'Frame2': 'CHP03_Engine',
  'ProtectiveFrame2': 'CHP03_Engine',

  'FeedPumpAndMotor': 'RO01_Pump',
  'ROMembraneBank (1)': 'RO01_Membrane',
  'PrimaryFilter': 'RO01_Filter',
  'MembraneEndFittings': 'RO01_Valve',
  'FilterPiping': 'RO01_Valve',
  'ConnectedPiping': 'RO01_Valve',
  'CIPChemicalLoop': 'RO01_Valve',

  'InstrumentationAndDrain': 'WW01_Valve',

  'ElevationDrive': 'DISH01_Drive',
  'Box01': 'DISH01_Drive',
  'Box02': 'DISH01_Drive',
  'EBox': 'DISH01_Drive',
  'EBox2': 'DISH01_Drive',
  'EBox (1)': 'DISH01_Drive',
  'GeoSphere02': 'DISH01_Drive',
  'LNB': 'DISH01_Drive'
};

export class ApiDataManager {
  constructor() {
    this.predictionsMap = new Map(); // key (machine_id_component_type or CAD name) -> normalized prediction
    this.predictionsList = [];
    this.connectionState = 'CONNECTING'; // 'CONNECTING' | 'CONNECTED' | 'ERROR'
    this.lastUpdated = null;
    this.errorMessage = null;
    this.pollInterval = null;
    this.pollFrequencyMs = 30000; // Poll every 30 seconds
    this.listeners = new Set();

    // Start initial fetch & polling loop
    this.startPolling();
  }

  /**
   * Subscribe to live API update notifications
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  notifyListeners() {
    this.listeners.forEach((fn) => {
      try {
        fn({
          connectionState: this.connectionState,
          lastUpdated: this.lastUpdated,
          predictionsCount: this.predictionsList.length,
          errorMessage: this.errorMessage
        });
      } catch (err) {
        console.error('[ApiDataManager] Listener error:', err);
      }
    });
  }

  /**
   * Normalize raw prediction payload into standard structure
   */
  normalizePrediction(item) {
    if (!item) return null;

    const rawRul = item.predicted_rul_days !== undefined ? Number(item.predicted_rul_days) : null;
    // RUL: Round to nearest whole day (no decimals!)
    const rulDays = rawRul !== null && !isNaN(rawRul) ? Math.round(rawRul) : null;
    const stateObj = normalizeState(item.current_state);

    return {
      assetId: item.asset_id || 'UNKNOWN',
      componentId: item.component_id || item.asset_id || 'UNKNOWN',
      machineId: item.machine_id || 'UNKNOWN',
      machineName: item.machine_name || item.machine_id || 'Facility Unit',
      componentType: item.component_type || 'Component',
      roomId: item.room_id || 'R000',
      timestamp: item.timestamp || new Date().toISOString(),
      
      // Live ML Core Predictions
      rulDays: rulDays,
      rawRulDays: rawRul,
      currentState: stateObj.label,
      stateObj: stateObj,
      sensorStatus: (item.sensor_status || 'NORMAL').toUpperCase(),
      activeSensor: (item.active_sensor || 'primary').toUpperCase(),
      anomalyCount: typeof item.anomaly_count === 'number' ? item.anomaly_count : 0,
      maintenanceRequired: Boolean(item.maintenance_required),
      statusMessage: item.status_message || 'Operating normally.',

      // Metadata & Source Flag
      isLive: true,
      lastFetched: new Date()
    };
  }

  /**
   * Fetch predictions from live backend endpoint
   */
  async fetchPredictions() {
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: AbortSignal.timeout(10000) // 10s timeout
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      const rawList = Array.isArray(data) ? data : (data.predictions || []);

      if (!rawList.length) {
        throw new Error('Received empty predictions array from API');
      }

      const newMap = new Map();
      const normalizedList = [];

      rawList.forEach((rawItem) => {
        const norm = this.normalizePrediction(rawItem);
        if (!norm) return;

        normalizedList.push(norm);

        // Store by composite key: MACHINE_ID + '_' + COMPONENT_TYPE
        const comboKey = `${norm.machineId}_${norm.componentType}`;
        newMap.set(comboKey, norm);

        // Also store by assetId & componentId for direct lookup
        newMap.set(norm.assetId, norm);
        newMap.set(norm.componentId, norm);

        // Store directly by mapped CAD name if exists
        const cadName = API_CAD_MAPPING[comboKey];
        if (cadName) {
          newMap.set(cadName, norm);
        }
      });

      // Map secondary CAD aliases
      Object.entries(CAD_ALIASES).forEach(([aliasCAD, mainComboKey]) => {
        if (newMap.has(mainComboKey)) {
          newMap.set(aliasCAD, newMap.get(mainComboKey));
        }
      });

      // Special handling for A029 & A030 (both DISH01 Drive in API)
      const a29 = newMap.get('A029');
      const a30 = newMap.get('A030');
      if (a29) newMap.set('AzimuthDrive', a29);
      if (a30) newMap.set('ElevationDrive', a30);

      this.predictionsMap = newMap;
      this.predictionsList = normalizedList;
      this.connectionState = 'CONNECTED';
      this.lastUpdated = new Date();
      this.errorMessage = null;

      console.log(`✓ [ApiDataManager] Successfully synchronized ${normalizedList.length} live predictions from API.`);
      this.notifyListeners();
      return true;
    } catch (err) {
      console.warn('⚠️ [ApiDataManager] Failed to fetch live API predictions:', err.message);
      this.connectionState = 'ERROR';
      this.errorMessage = err.message;
      this.notifyListeners();
      return false;
    }
  }

  startPolling() {
    this.fetchPredictions();
    if (this.pollInterval) clearInterval(this.pollInterval);
    this.pollInterval = setInterval(() => this.fetchPredictions(), this.pollFrequencyMs);
  }

  stopPolling() {
    if (this.pollInterval) {
      clearInterval(this.pollInterval);
      this.pollInterval = null;
    }
  }

  /**
   * Get prediction record for a specific CAD component or machine/component pair
   * @param {string} rawName - CAD mesh name (e.g., 'EngineCore', 'BearingSystem', etc.)
   * @param {Object} [metadata] - Resolved CAD metadata
   * @returns {Object|null} Normalized API Prediction Record
   */
  getPredictionForComponent(rawName, metadata) {
    if (!rawName) return null;

    // Exclude facility floor, outer walls, structural bases, and unnamed CAD background shells
    if (rawName === 'CHP' || rawName === 'CHP (1)' || rawName === 'Body210' ||
        rawName.includes('Floor') || rawName.includes('Wall') || rawName.startsWith('Body') ||
        rawName.includes('Pipe') || rawName.includes('Skid')) {
      return null;
    }

    // 1. Direct lookup by raw CAD name
    if (this.predictionsMap.has(rawName)) {
      return this.predictionsMap.get(rawName);
    }

    // 2. Lookup via CAD_TO_API_KEY
    const apiKey = CAD_TO_API_KEY[rawName] || CAD_ALIASES[rawName];
    if (apiKey && this.predictionsMap.has(apiKey)) {
      return this.predictionsMap.get(apiKey);
    }

    // 3. Match using metadata room / subsystem / machine heuristics
    if (metadata) {
      // Heuristic for CHP Room generator units
      if (metadata.room?.includes('CHP') || rawName.includes('Engine') || rawName.includes('Generator') || rawName.includes('Bearing') || rawName.includes('Cooling') || rawName.includes('Lubricant') || rawName.includes('Fuel')) {
        let machineId = 'CHP01';
        if (rawName.endsWith('1')) machineId = 'CHP02';
        else if (rawName.endsWith('2')) machineId = 'CHP03';

        let compType = 'Engine';
        if (rawName.includes('Bearing')) compType = 'Bearing';
        else if (rawName.includes('Lubrication') || rawName.includes('Lube')) compType = 'Lubrication';
        else if (rawName.includes('Cooling')) compType = 'Cooling';
        else if (rawName.includes('Generator') || rawName.includes('Alternator')) compType = 'Generator';
        else if (rawName.includes('Fuel')) compType = 'Fuel';

        const comboKey = `${machineId}_${compType}`;
        if (this.predictionsMap.has(comboKey)) {
          return this.predictionsMap.get(comboKey);
        }
      }

      // Heuristic for Water Management (RO01 / PUMP01)
      if (metadata.room?.includes('Water')) {
        if (rawName.includes('Pump')) return this.predictionsMap.get('RO01_Pump') || this.predictionsMap.get('PUMP01_Pump');
        if (rawName.includes('Membrane')) return this.predictionsMap.get('RO01_Membrane');
        if (rawName.includes('Filter')) return this.predictionsMap.get('RO01_Filter');
        return this.predictionsMap.get('RO01_Valve');
      }

      // Heuristic for Sewage Management (WW01)
      if (metadata.room?.includes('Sewage')) {
        if (rawName.includes('Discharge') || rawName.includes('Pump')) return this.predictionsMap.get('WW01_Pump');
        if (rawName.includes('Reject') || rawName.includes('Filter')) return this.predictionsMap.get('WW01_Filter');
        return this.predictionsMap.get('WW01_Valve');
      }

      // Heuristic for Data & Telecom (SERVER01 / DISH01)
      if (metadata.room?.includes('Data')) {
        if (rawName.includes('Rack') || rawName.includes('Server') || rawName.includes('Data')) return this.predictionsMap.get('SERVER01_Storage') || this.predictionsMap.get('SERVER01_Fan');
        if (rawName.includes('Cabinet') || rawName.includes('Box')) return this.predictionsMap.get('SERVER01_Power Supply') || this.predictionsMap.get('SERVER01_Cooling');
        if (rawName.includes('Drive') || rawName.includes('Motor') || rawName.includes('Reflector') || rawName.includes('Gearbox')) return this.predictionsMap.get('DISH01_Drive') || this.predictionsMap.get('DISH01_Gearbox');
      }
    }

    return null;
  }
}

// Global Singleton Instance
export const apiDataManager = new ApiDataManager();
