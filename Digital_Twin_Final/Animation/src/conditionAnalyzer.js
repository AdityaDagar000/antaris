/**
 * Centralized Predictive Maintenance & Intelligent Condition Analysis Engine
 * Integrates live ML/RUL Predictions from apiDataManager with polar telemetry.
 */

import { apiDataManager, STATE_SYSTEM } from './services/apiDataManager.js';

export class ConditionAnalyzer {
  constructor(sensorManager) {
    this.sensorManager = sensorManager;
    this.historyMap = new Map();
    this.maxHistorySamples = 40;
    this.analysisCache = new Map();
    this.testAnomalyMap = new Map();
    this.initHistory();
  }

  initHistory() {
    if (!this.sensorManager?.sensorState) return;
    this.sensorManager.sensorState.forEach((compState, rawName) => {
      const labelMap = new Map();
      compState.metrics.forEach((m) => {
        if (!m.isText) {
          labelMap.set(m.label, [m.currentValue]);
        }
      });
      this.historyMap.set(rawName, labelMap);
    });
  }

  injectTestAnomaly(rawName, level = 'WARNING') {
    if (!rawName) return;
    if (level === 'NORMAL') {
      this.testAnomalyMap.delete(rawName);
      return;
    }

    const factorMap = {
      'WATCH': { tempFactor: 1.12, vibFactor: 1.4, pressFactor: 0.85 },
      'WARNING': { tempFactor: 1.25, vibFactor: 2.1, pressFactor: 0.70 },
      'CRITICAL': { tempFactor: 1.40, vibFactor: 3.2, pressFactor: 0.50 }
    };

    this.testAnomalyMap.set(rawName, {
      level,
      factors: factorMap[level] || factorMap['WARNING']
    });
  }

  /**
   * Core Condition & Health Analysis per Component
   * Combines real ML API prediction with real-time physical telemetry.
   * @param {string} rawName 
   * @param {Object} [metadata]
   * @returns {Object} Comprehensive Health & Maintenance Analysis State
   */
  analyzeComponent(rawName, metadata) {
    const rawData = this.sensorManager ? this.sensorManager.getSensorData(rawName) : null;
    const compState = this.sensorManager ? this.sensorManager.sensorState.get(rawName) : null;
    const prediction = apiDataManager.getPredictionForComponent(rawName, metadata);

    const metricsAnalysis = [];
    if (compState && rawData) {
      compState.metrics.forEach((m) => {
        metricsAnalysis.push({
          label: m.label,
          value: m.currentValue ? `${m.currentValue.toFixed(1)} ${m.unit || ''}` : (m.textValue || 'OK'),
          unit: m.unit || '',
          severity: 0
        });
      });
    }

    if (prediction) {
      const stateObj = prediction.stateObj || STATE_SYSTEM.NORMAL;
      const rulDays = prediction.rulDays;
      const displayRul = rulDays !== null ? `${rulDays} days remaining (ML PREDICTED)` : 'Data unavailable';

      let healthScore = 98;
      if (stateObj.key === 'FAILURE') healthScore = 12;
      else if (stateObj.key === 'CRITICAL') healthScore = 28;
      else if (stateObj.key === 'DEGRADING') healthScore = 54;
      else if (stateObj.key === 'EARLY_DEGRADING') healthScore = 76;
      else {
        if (rulDays && rulDays < 60) healthScore = Math.min(95, Math.max(85, Math.round(rulDays * 1.6)));
        else healthScore = 98;
      }

      const result = {
        rawName,
        canonicalName: prediction.componentType,
        generatorName: prediction.machineName,
        componentId: prediction.componentId,
        assetId: prediction.assetId,
        machineId: prediction.machineId,
        machineName: prediction.machineName,
        roomId: prediction.roomId,
        healthScore,
        healthCategory: stateObj.label,
        anomalyLevel: stateObj.key,
        conditionState: stateObj.label,
        currentState: stateObj.label,
        stateColor: stateObj.color,
        stateObj,
        sensorStatus: prediction.sensorStatus,
        activeSensor: prediction.activeSensor,
        anomalyCount: prediction.anomalyCount,
        maintenanceRequired: prediction.maintenanceRequired,
        displayRul,
        rulDays,
        statusMessage: prediction.statusMessage,
        recommendation: prediction.statusMessage || 'Operating within standard polar engineering limits.',
        metricsAnalysis
      };

      this.analysisCache.set(rawName, result);
      return result;
    }

    // Fallback baseline
    return {
      rawName,
      canonicalName: rawName || 'Equipment',
      generatorName: 'Facility Unit',
      componentId: 'C001',
      assetId: 'A001',
      machineId: 'CHP01',
      machineName: 'Bharti Station',
      roomId: 'R001',
      healthScore: 100,
      healthCategory: 'NORMAL',
      anomalyLevel: 'NORMAL',
      conditionState: 'NORMAL',
      currentState: 'NORMAL',
      stateColor: '#10b981',
      stateObj: STATE_SYSTEM.NORMAL,
      sensorStatus: 'NORMAL',
      activeSensor: 'PRIMARY',
      anomalyCount: 0,
      maintenanceRequired: false,
      displayRul: '> 2500 hrs',
      rulDays: 100,
      statusMessage: 'Operating normally.',
      recommendation: 'Operating within standard polar engineering limits.',
      metricsAnalysis
    };
  }

  /**
   * Global System Health Calculation across all live ML predictions
   * @returns {{ systemHealthScore: number, systemStatus: string, stateObj: Object, activeCount: number, attentionCount: number, criticalCount: number }}
   */
  getGlobalSystemHealth() {
    if (apiDataManager.predictionsList.length > 0) {
      let worstState = STATE_SYSTEM.NORMAL;
      let criticalCount = 0;
      let degradingCount = 0;
      let earlyCount = 0;

      apiDataManager.predictionsList.forEach((pred) => {
        const s = pred.stateObj || STATE_SYSTEM.NORMAL;
        if (s.severity > worstState.severity) {
          worstState = s;
        }
        if (s.key === 'FAILURE' || s.key === 'CRITICAL') criticalCount++;
        else if (s.key === 'DEGRADING') degradingCount++;
        else if (s.key === 'EARLY_DEGRADING') earlyCount++;
      });

      let systemStatus = 'OPTIMAL · 100% HEALTHY';
      if (worstState.key === 'FAILURE' || worstState.key === 'CRITICAL') {
        systemStatus = `CRITICAL (${criticalCount} ANOMALIES)`;
      } else if (worstState.key === 'DEGRADING') {
        systemStatus = `DEGRADING (${degradingCount} AT RISK)`;
      } else if (worstState.key === 'EARLY_DEGRADING') {
        systemStatus = `EARLY DEGRADATION (${earlyCount} UNITS)`;
      }

      return {
        systemHealthScore: worstState.severity === 0 ? 100 : (100 - worstState.severity * 18),
        systemStatus,
        stateObj: worstState,
        activeCount: apiDataManager.predictionsList.length - criticalCount - degradingCount - earlyCount,
        attentionCount: earlyCount + degradingCount,
        criticalCount
      };
    }

    return {
      systemHealthScore: 100,
      systemStatus: 'SYSTEM HEALTH 100% · NORMAL',
      stateObj: STATE_SYSTEM.NORMAL,
      activeCount: 32,
      attentionCount: 0,
      criticalCount: 0
    };
  }
}
