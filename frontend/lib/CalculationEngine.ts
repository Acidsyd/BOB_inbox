/**
 * Advanced Calculation Engine with Web Worker Support
 * Handles dependency tracking, batch calculations, and performance optimization
 */

import { formulaEngine, FormulaContext } from './FormulaEngine';
import { Lead, ColumnDefinition, FormulaConfig } from '@/types/spreadsheet';

// Calculation Types
export interface CalculationRequest {
  id: string;
  type: 'formula' | 'enrichment' | 'lookup';
  leadId: string;
  columnId: string;
  expression?: string;
  context: FormulaContext;
  priority: 'low' | 'normal' | 'high';
  dependencies: string[];
}

export interface CalculationResult {
  id: string;
  leadId: string;
  columnId: string;
  success: boolean;
  result: any;
  error?: string;
  executionTime: number;
  timestamp: string;
  cacheHit: boolean;
}

export interface CalculationBatch {
  id: string;
  requests: CalculationRequest[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  results: CalculationResult[];
  startedAt: string;
  completedAt?: string;
}

export interface DependencyNode {
  columnId: string;
  expression?: string;
  dependencies: Set<string>;
  dependents: Set<string>;
  level: number; // Calculation order level
}

export interface CalculationPerformanceMetrics {
  totalCalculations: number;
  averageExecutionTime: number;
  cacheHitRate: number;
  workerUtilization: number;
  memoryUsage: number;
  calculationsPerSecond: number;
  errorRate: number;
}

// Web Worker Communication Types
export interface WorkerMessage {
  type: 'calculate' | 'batch_calculate' | 'clear_cache' | 'get_stats';
  id: string;
  data: any;
}

export interface WorkerResponse {
  type: 'result' | 'batch_result' | 'error' | 'stats';
  id: string;
  data: any;
  error?: string;
}

// Dependency Graph for calculation ordering
export class DependencyGraph {
  private nodes = new Map<string, DependencyNode>();
  private sortedColumns: string[] = [];

  constructor(columns: ColumnDefinition[]) {
    this.buildGraph(columns);
  }

  // Build dependency graph from columns
  private buildGraph(columns: ColumnDefinition[]): void {
    this.nodes.clear();

    // Create nodes for all columns
    for (const column of columns) {
      this.nodes.set(column.id, {
        columnId: column.id,
        expression: column.formula?.expression,
        dependencies: new Set(),
        dependents: new Set(),
        level: 0
      });
    }

    // Build dependencies
    for (const column of columns) {
      if (column.formula?.expression) {
        const dependencies = formulaEngine.getDependencies(column.formula.expression);
        const node = this.nodes.get(column.id);
        
        if (node) {
          for (const dep of dependencies) {
            const depColumn = columns.find(col => 
              col.key === dep || col.id === dep || col.name === dep
            );
            
            if (depColumn) {
              node.dependencies.add(depColumn.id);
              const depNode = this.nodes.get(depColumn.id);
              if (depNode) {
                depNode.dependents.add(column.id);
              }
            }
          }
        }
      }
    }

    // Calculate levels and sort
    this.calculateLevels();
    this.topologicalSort();
  }

  // Calculate calculation levels for dependency ordering
  private calculateLevels(): void {
    const visited = new Set<string>();
    
    const calculateLevel = (columnId: string): number => {
      if (visited.has(columnId)) {
        return this.nodes.get(columnId)?.level || 0;
      }
      
      visited.add(columnId);
      const node = this.nodes.get(columnId);
      if (!node) return 0;

      let maxDependencyLevel = -1;
      for (const depId of node.dependencies) {
        maxDependencyLevel = Math.max(maxDependencyLevel, calculateLevel(depId));
      }
      
      node.level = maxDependencyLevel + 1;
      return node.level;
    };

    for (const [columnId] of this.nodes) {
      calculateLevel(columnId);
    }
  }

  // Topological sort for calculation order
  private topologicalSort(): void {
    const sortedNodes = Array.from(this.nodes.values())
      .sort((a, b) => a.level - b.level);
    
    this.sortedColumns = sortedNodes.map(node => node.columnId);
  }

  // Get calculation order
  getCalculationOrder(): string[] {
    return [...this.sortedColumns];
  }

  // Get dependencies for a column
  getDependencies(columnId: string): string[] {
    const node = this.nodes.get(columnId);
    return node ? Array.from(node.dependencies) : [];
  }

  // Get dependents for a column
  getDependents(columnId: string): string[] {
    const node = this.nodes.get(columnId);
    return node ? Array.from(node.dependents) : [];
  }

  // Check for circular dependencies
  hasCircularDependency(): boolean {
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    const dfs = (columnId: string): boolean => {
      if (recursionStack.has(columnId)) return true;
      if (visited.has(columnId)) return false;

      visited.add(columnId);
      recursionStack.add(columnId);

      const node = this.nodes.get(columnId);
      if (node) {
        for (const depId of node.dependencies) {
          if (dfs(depId)) return true;
        }
      }

      recursionStack.delete(columnId);
      return false;
    };

    for (const [columnId] of this.nodes) {
      if (dfs(columnId)) return true;
    }

    return false;
  }

  // Get affected columns when a column changes
  getAffectedColumns(columnId: string): string[] {
    const affected = new Set<string>();
    
    const collectDependents = (id: string) => {
      const node = this.nodes.get(id);
      if (node) {
        for (const dependent of node.dependents) {
          if (!affected.has(dependent)) {
            affected.add(dependent);
            collectDependents(dependent);
          }
        }
      }
    };

    collectDependents(columnId);
    return Array.from(affected);
  }
}

// Calculation Cache
export class CalculationCache {
  private cache = new Map<string, { result: any; timestamp: number; hits: number }>();
  private maxSize = 10000;
  private ttl = 5 * 60 * 1000; // 5 minutes

  // Get cached result
  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check TTL
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    entry.hits++;
    return entry.result;
  }

  // Set cached result
  set(key: string, result: any): void {
    // Cleanup if cache is full
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    this.cache.set(key, {
      result,
      timestamp: Date.now(),
      hits: 0
    });
  }

  // Clear cache
  clear(): void {
    this.cache.clear();
  }

  // Remove entries for specific lead/column
  invalidate(leadId?: string, columnId?: string): void {
    const keysToDelete: string[] = [];
    
    for (const [key] of this.cache) {
      if (leadId && key.includes(leadId)) {
        keysToDelete.push(key);
      } else if (columnId && key.includes(columnId)) {
        keysToDelete.push(key);
      }
    }
    
    for (const key of keysToDelete) {
      this.cache.delete(key);
    }
  }

  // Cleanup expired entries
  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries())
      .filter(([_, entry]) => now - entry.timestamp <= this.ttl)
      .sort(([_, a], [__, b]) => b.hits - a.hits); // Sort by hits desc

    this.cache.clear();
    
    // Keep most used entries
    for (let i = 0; i < Math.min(entries.length, this.maxSize * 0.8); i++) {
      const [key, entry] = entries[i];
      this.cache.set(key, entry);
    }
  }

  // Get cache statistics
  getStats() {
    const totalHits = Array.from(this.cache.values())
      .reduce((sum, entry) => sum + entry.hits, 0);
    
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      totalHits,
      hitRate: totalHits > 0 ? (totalHits / (totalHits + this.cache.size)) : 0
    };
  }
}

// Web Worker Manager
export class WorkerManager {
  private workers: Worker[] = [];
  private workerQueue: CalculationRequest[][] = [];
  private pendingRequests = new Map<string, (result: CalculationResult) => void>();
  private workerCount: number;
  private roundRobinIndex = 0;

  constructor(workerCount = navigator.hardwareConcurrency || 4) {
    this.workerCount = Math.min(workerCount, 8); // Limit to 8 workers max
    this.initializeWorkers();
  }

  // Initialize web workers
  private initializeWorkers(): void {
    const workerScript = this.createWorkerScript();
    const workerBlob = new Blob([workerScript], { type: 'application/javascript' });
    const workerUrl = URL.createObjectURL(workerBlob);

    for (let i = 0; i < this.workerCount; i++) {
      try {
        const worker = new Worker(workerUrl);
        worker.onmessage = this.handleWorkerMessage.bind(this);
        worker.onerror = this.handleWorkerError.bind(this);
        this.workers.push(worker);
        this.workerQueue.push([]);
      } catch (error) {
        console.warn('Failed to create web worker:', error);
        // Fallback: reduce worker count
        this.workerCount = i;
        break;
      }
    }

    URL.revokeObjectURL(workerUrl);
  }

  // Create worker script as string
  private createWorkerScript(): string {
    return `
      // Web Worker for formula calculations
      class FormulaWorker {
        constructor() {
          this.cache = new Map();
          this.functions = this.createFunctions();
        }

        createFunctions() {
          return {
            CONCAT: (...args) => args.map(arg => String(arg || '')).join(''),
            UPPER: (text) => String(text || '').toUpperCase(),
            LOWER: (text) => String(text || '').toLowerCase(),
            TRIM: (text) => String(text || '').trim(),
            LEFT: (text, length) => String(text || '').substring(0, Math.max(0, length)),
            RIGHT: (text, length) => {
              const str = String(text || '');
              return str.substring(Math.max(0, str.length - Math.max(0, length)));
            },
            SUM: (...args) => args.reduce((sum, arg) => sum + (Number(arg) || 0), 0),
            AVERAGE: (...args) => {
              const validNumbers = args.filter(arg => !isNaN(Number(arg))).map(Number);
              return validNumbers.length > 0 ? validNumbers.reduce((sum, num) => sum + num, 0) / validNumbers.length : 0;
            },
            IF: (condition, trueValue, falseValue) => condition ? trueValue : falseValue,
            ISBLANK: (value) => value === null || value === undefined || String(value).trim() === '',
            NOW: () => new Date(),
            TODAY: () => {
              const now = new Date();
              return new Date(now.getFullYear(), now.getMonth(), now.getDate());
            }
          };
        }

        evaluate(expression, context) {
          const cacheKey = expression + ':' + context.lead.id;
          if (this.cache.has(cacheKey)) {
            return { result: this.cache.get(cacheKey), cached: true };
          }

          try {
            // Simple expression evaluation (basic implementation)
            let result = this.evaluateExpression(expression, context);
            this.cache.set(cacheKey, result);
            return { result, cached: false };
          } catch (error) {
            throw new Error('Formula evaluation error: ' + error.message);
          }
        }

        evaluateExpression(expression, context) {
          // Very basic expression evaluation for demo
          // In production, this would use the full FormulaEngine
          
          // Handle simple function calls
          const funcMatch = expression.match(/^([A-Z_]+)\\((.*)\\)$/);
          if (funcMatch) {
            const [, funcName, argsStr] = funcMatch;
            const func = this.functions[funcName];
            if (func) {
              const args = argsStr.split(',').map(arg => {
                arg = arg.trim();
                if (arg.startsWith('"') && arg.endsWith('"')) {
                  return arg.slice(1, -1);
                }
                if (arg.startsWith("'") && arg.endsWith("'")) {
                  return arg.slice(1, -1);
                }
                if (!isNaN(Number(arg))) {
                  return Number(arg);
                }
                // Column reference
                return context.lead[arg] || context.lead.extendedFields?.[arg] || '';
              });
              return func(...args);
            }
          }

          // Handle column references
          if (context.lead[expression] !== undefined) {
            return context.lead[expression];
          }
          if (context.lead.extendedFields?.[expression] !== undefined) {
            return context.lead.extendedFields[expression];
          }

          // Handle literals
          if (expression.startsWith('"') && expression.endsWith('"')) {
            return expression.slice(1, -1);
          }
          if (!isNaN(Number(expression))) {
            return Number(expression);
          }

          return expression;
        }

        clearCache() {
          this.cache.clear();
        }
      }

      const worker = new FormulaWorker();

      self.onmessage = function(e) {
        const { type, id, data } = e.data;
        
        try {
          switch (type) {
            case 'calculate':
              const startTime = performance.now();
              const { result, cached } = worker.evaluate(data.expression, data.context);
              const executionTime = performance.now() - startTime;
              
              self.postMessage({
                type: 'result',
                id,
                data: {
                  id: data.id,
                  leadId: data.context.lead.id,
                  columnId: data.columnId,
                  success: true,
                  result,
                  executionTime,
                  timestamp: new Date().toISOString(),
                  cacheHit: cached
                }
              });
              break;

            case 'batch_calculate':
              const results = [];
              for (const request of data.requests) {
                const startTime = performance.now();
                try {
                  const { result, cached } = worker.evaluate(request.expression, request.context);
                  const executionTime = performance.now() - startTime;
                  
                  results.push({
                    id: request.id,
                    leadId: request.context.lead.id,
                    columnId: request.columnId,
                    success: true,
                    result,
                    executionTime,
                    timestamp: new Date().toISOString(),
                    cacheHit: cached
                  });
                } catch (error) {
                  results.push({
                    id: request.id,
                    leadId: request.context.lead.id,
                    columnId: request.columnId,
                    success: false,
                    error: error.message,
                    executionTime: performance.now() - startTime,
                    timestamp: new Date().toISOString(),
                    cacheHit: false
                  });
                }
              }
              
              self.postMessage({
                type: 'batch_result',
                id,
                data: results
              });
              break;

            case 'clear_cache':
              worker.clearCache();
              self.postMessage({
                type: 'result',
                id,
                data: { success: true }
              });
              break;

            case 'get_stats':
              self.postMessage({
                type: 'stats',
                id,
                data: {
                  cacheSize: worker.cache.size,
                  memoryUsage: performance.memory ? performance.memory.usedJSHeapSize : 0
                }
              });
              break;

            default:
              throw new Error('Unknown message type: ' + type);
          }
        } catch (error) {
          self.postMessage({
            type: 'error',
            id,
            error: error.message
          });
        }
      };
    `;
  }

  // Handle worker messages
  private handleWorkerMessage(event: MessageEvent<WorkerResponse>): void {
    const { type, id, data, error } = event.data;
    
    if (type === 'result' && this.pendingRequests.has(id)) {
      const resolve = this.pendingRequests.get(id)!;
      this.pendingRequests.delete(id);
      
      if (error) {
        resolve({
          id,
          leadId: '',
          columnId: '',
          success: false,
          result: null,
          error,
          executionTime: 0,
          timestamp: new Date().toISOString(),
          cacheHit: false
        });
      } else {
        resolve(data);
      }
    }
  }

  // Handle worker errors
  private handleWorkerError(error: ErrorEvent): void {
    console.error('Worker error:', error);
  }

  // Execute calculation on worker
  async executeCalculation(request: CalculationRequest): Promise<CalculationResult> {
    const workerId = this.roundRobinIndex % this.workers.length;
    this.roundRobinIndex++;
    
    const worker = this.workers[workerId];
    if (!worker) {
      throw new Error('No available workers');
    }

    return new Promise((resolve) => {
      this.pendingRequests.set(request.id, resolve);
      
      worker.postMessage({
        type: 'calculate',
        id: request.id,
        data: {
          id: request.id,
          columnId: request.columnId,
          expression: request.expression,
          context: request.context
        }
      });
    });
  }

  // Execute batch calculation
  async executeBatchCalculation(requests: CalculationRequest[]): Promise<CalculationResult[]> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const workerId = this.roundRobinIndex % this.workers.length;
    this.roundRobinIndex++;
    
    const worker = this.workers[workerId];
    if (!worker) {
      throw new Error('No available workers');
    }

    return new Promise((resolve) => {
      this.pendingRequests.set(batchId, (results: any) => {
        resolve(results.data || results);
      });
      
      worker.postMessage({
        type: 'batch_calculate',
        id: batchId,
        data: { requests }
      });
    });
  }

  // Terminate all workers
  terminate(): void {
    for (const worker of this.workers) {
      worker.terminate();
    }
    this.workers = [];
    this.workerQueue = [];
    this.pendingRequests.clear();
  }
}

// Main Calculation Engine
export class CalculationEngine {
  private cache = new CalculationCache();
  private workerManager: WorkerManager;
  private dependencyGraph: DependencyGraph | null = null;
  private performanceMetrics: CalculationPerformanceMetrics = {
    totalCalculations: 0,
    averageExecutionTime: 0,
    cacheHitRate: 0,
    workerUtilization: 0,
    memoryUsage: 0,
    calculationsPerSecond: 0,
    errorRate: 0
  };

  constructor(workerCount?: number) {
    this.workerManager = new WorkerManager(workerCount);
  }

  // Initialize with columns
  initialize(columns: ColumnDefinition[]): void {
    this.dependencyGraph = new DependencyGraph(columns);
    
    // Check for circular dependencies
    if (this.dependencyGraph.hasCircularDependency()) {
      throw new Error('Circular dependency detected in formula columns');
    }
  }

  // Calculate single value
  async calculate(
    leadId: string,
    columnId: string,
    expression: string,
    context: FormulaContext,
    priority: 'low' | 'normal' | 'high' = 'normal'
  ): Promise<CalculationResult> {
    const cacheKey = `${leadId}:${columnId}:${expression}`;
    const cachedResult = this.cache.get(cacheKey);
    
    if (cachedResult !== null) {
      return {
        id: `calc_${Date.now()}`,
        leadId,
        columnId,
        success: true,
        result: cachedResult,
        executionTime: 0,
        timestamp: new Date().toISOString(),
        cacheHit: true
      };
    }

    const request: CalculationRequest = {
      id: `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: 'formula',
      leadId,
      columnId,
      expression,
      context,
      priority,
      dependencies: this.dependencyGraph?.getDependencies(columnId) || []
    };

    const result = await this.workerManager.executeCalculation(request);
    
    // Cache successful results
    if (result.success && !result.cacheHit) {
      this.cache.set(cacheKey, result.result);
    }

    // Update metrics
    this.updateMetrics(result);

    return result;
  }

  // Calculate batch of values
  async calculateBatch(
    leads: Lead[],
    columns: ColumnDefinition[],
    onProgress?: (progress: number) => void
  ): Promise<CalculationBatch> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const batch: CalculationBatch = {
      id: batchId,
      requests: [],
      status: 'pending',
      progress: 0,
      results: [],
      startedAt: new Date().toISOString()
    };

    // Get calculation order
    const calculationOrder = this.dependencyGraph?.getCalculationOrder() || 
                           columns.map(c => c.id);

    // Create calculation requests in dependency order
    for (const columnId of calculationOrder) {
      const column = columns.find(c => c.id === columnId);
      if (!column?.formula?.expression) continue;

      for (const lead of leads) {
        const request: CalculationRequest = {
          id: `calc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          type: 'formula',
          leadId: lead.id,
          columnId: column.id,
          expression: column.formula.expression,
          context: { lead, columns, allLeads: leads },
          priority: 'normal',
          dependencies: this.dependencyGraph?.getDependencies(columnId) || []
        };
        batch.requests.push(request);
      }
    }

    batch.status = 'processing';

    try {
      // Process in chunks to avoid overwhelming workers
      const chunkSize = 100;
      const chunks = [];
      for (let i = 0; i < batch.requests.length; i += chunkSize) {
        chunks.push(batch.requests.slice(i, i + chunkSize));
      }

      for (let i = 0; i < chunks.length; i++) {
        const chunkResults = await this.workerManager.executeBatchCalculation(chunks[i]);
        batch.results.push(...chunkResults);
        
        // Update progress
        batch.progress = ((i + 1) / chunks.length) * 100;
        onProgress?.(batch.progress);

        // Update cache for successful results
        for (const result of chunkResults) {
          if (result.success && !result.cacheHit) {
            const column = columns.find(c => c.id === result.columnId);
            if (column?.formula?.expression) {
              const cacheKey = `${result.leadId}:${result.columnId}:${column.formula.expression}`;
              this.cache.set(cacheKey, result.result);
            }
          }
          this.updateMetrics(result);
        }
      }

      batch.status = 'completed';
      batch.completedAt = new Date().toISOString();
    } catch (error) {
      batch.status = 'failed';
      console.error('Batch calculation failed:', error);
    }

    return batch;
  }

  // Recalculate affected columns when data changes
  async recalculateAffected(
    changedColumnId: string,
    leads: Lead[],
    columns: ColumnDefinition[]
  ): Promise<CalculationResult[]> {
    if (!this.dependencyGraph) return [];

    const affectedColumns = this.dependencyGraph.getAffectedColumns(changedColumnId);
    const results: CalculationResult[] = [];

    // Invalidate cache for affected columns
    for (const columnId of affectedColumns) {
      this.cache.invalidate(undefined, columnId);
    }

    // Recalculate affected formulas
    for (const columnId of affectedColumns) {
      const column = columns.find(c => c.id === columnId);
      if (!column?.formula?.expression) continue;

      for (const lead of leads) {
        const result = await this.calculate(
          lead.id,
          columnId,
          column.formula.expression,
          { lead, columns, allLeads: leads }
        );
        results.push(result);
      }
    }

    return results;
  }

  // Clear all caches
  clearCache(): void {
    this.cache.clear();
  }

  // Clear cache for specific lead or column
  invalidateCache(leadId?: string, columnId?: string): void {
    this.cache.invalidate(leadId, columnId);
  }

  // Get performance metrics
  getPerformanceMetrics(): CalculationPerformanceMetrics {
    return { ...this.performanceMetrics };
  }

  // Get cache statistics
  getCacheStats() {
    return this.cache.getStats();
  }

  // Update performance metrics
  private updateMetrics(result: CalculationResult): void {
    this.performanceMetrics.totalCalculations++;
    
    // Update average execution time
    const totalTime = this.performanceMetrics.averageExecutionTime * 
                     (this.performanceMetrics.totalCalculations - 1);
    this.performanceMetrics.averageExecutionTime = 
      (totalTime + result.executionTime) / this.performanceMetrics.totalCalculations;
    
    // Update cache hit rate
    const cacheStats = this.cache.getStats();
    this.performanceMetrics.cacheHitRate = cacheStats.hitRate;
    
    // Update error rate
    if (!result.success) {
      this.performanceMetrics.errorRate = 
        (this.performanceMetrics.errorRate * (this.performanceMetrics.totalCalculations - 1) + 1) /
        this.performanceMetrics.totalCalculations;
    }
  }

  // Terminate workers and cleanup
  terminate(): void {
    this.workerManager.terminate();
    this.cache.clear();
  }
}

// Export singleton instance
export const calculationEngine = new CalculationEngine();