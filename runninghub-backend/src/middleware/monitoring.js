import { performance } from 'perf_hooks';

// In-memory metrics storage (in production, use Redis or external metrics store)
class MetricsCollector {
  constructor() {
    this.metrics = new Map();
    this.histograms = new Map();
    this.counters = new Map();
    this.gauges = new Map();
    this.startTime = Date.now();
  }

  // Counter metrics
  incrementCounter(name, labels = {}, value = 1) {
    const key = this.getMetricKey(name, labels);
    const current = this.counters.get(key) || 0;
    this.counters.set(key, current + value);
  }

  // Gauge metrics
  setGauge(name, labels = {}, value) {
    const key = this.getMetricKey(name, labels);
    this.gauges.set(key, value);
  }

  // Histogram metrics for response times
  recordHistogram(name, labels = {}, value) {
    const key = this.getMetricKey(name, labels);
    if (!this.histograms.has(key)) {
      this.histograms.set(key, []);
    }
    this.histograms.get(key).push({
      value,
      timestamp: Date.now()
    });

    // Keep only last 1000 entries to prevent memory leak
    const entries = this.histograms.get(key);
    if (entries.length > 1000) {
      entries.splice(0, entries.length - 1000);
    }
  }

  getMetricKey(name, labels) {
    const labelString = Object.entries(labels)
      .sort()
      .map(([k, v]) => `${k}="${v}"`)
      .join(',');
    return labelString ? `${name}{${labelString}}` : name;
  }

  // Calculate percentiles for histograms
  calculatePercentile(values, percentile) {
    if (values.length === 0) return 0;
    
    const sorted = values.map(v => v.value).sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  // Export metrics in Prometheus format
  exportPrometheusMetrics() {
    const lines = [];
    const now = Date.now();

    // Application info
    lines.push('# HELP cosnap_info Application information');
    lines.push('# TYPE cosnap_info gauge');
    lines.push(`cosnap_info{version="${process.env.npm_package_version || '1.0.0'}",environment="${process.env.NODE_ENV || 'development'}"} 1`);

    // Uptime
    lines.push('# HELP cosnap_uptime_seconds Application uptime in seconds');
    lines.push('# TYPE cosnap_uptime_seconds gauge');
    lines.push(`cosnap_uptime_seconds ${(now - this.startTime) / 1000}`);

    // Process metrics
    const memUsage = process.memoryUsage();
    lines.push('# HELP process_resident_memory_bytes Resident memory size in bytes');
    lines.push('# TYPE process_resident_memory_bytes gauge');
    lines.push(`process_resident_memory_bytes ${memUsage.rss}`);

    lines.push('# HELP process_heap_memory_bytes Heap memory size in bytes');
    lines.push('# TYPE process_heap_memory_bytes gauge');
    lines.push(`process_heap_memory_bytes ${memUsage.heapUsed}`);

    // Counters
    for (const [key, value] of this.counters) {
      const metricName = key.split('{')[0];
      lines.push(`# HELP ${metricName} Total number of ${metricName.replace(/_/g, ' ')}`);
      lines.push(`# TYPE ${metricName} counter`);
      lines.push(`${key} ${value}`);
    }

    // Gauges
    for (const [key, value] of this.gauges) {
      const metricName = key.split('{')[0];
      lines.push(`# HELP ${metricName} Current value of ${metricName.replace(/_/g, ' ')}`);
      lines.push(`# TYPE ${metricName} gauge`);
      lines.push(`${key} ${value}`);
    }

    // Histograms
    for (const [key, values] of this.histograms) {
      const metricName = key.split('{')[0];
      const recentValues = values.filter(v => now - v.timestamp < 300000); // Last 5 minutes
      
      if (recentValues.length > 0) {
        lines.push(`# HELP ${metricName} ${metricName.replace(/_/g, ' ')} histogram`);
        lines.push(`# TYPE ${metricName} histogram`);
        
        // Calculate percentiles
        const p50 = this.calculatePercentile(recentValues, 50);
        const p95 = this.calculatePercentile(recentValues, 95);
        const p99 = this.calculatePercentile(recentValues, 99);
        
        const baseKey = key.replace('}', ',quantile="');
        lines.push(`${baseKey}0.5"} ${p50}`);
        lines.push(`${baseKey}0.95"} ${p95}`);
        lines.push(`${baseKey}0.99"} ${p99}`);
        lines.push(`${key.replace('}', '_count}')} ${recentValues.length}`);
        lines.push(`${key.replace('}', '_sum}')} ${recentValues.reduce((sum, v) => sum + v.value, 0)}`);
      }
    }

    return lines.join('\n') + '\n';
  }
}

// Global metrics instance
const metrics = new MetricsCollector();

// Middleware for collecting HTTP metrics
export const httpMetricsMiddleware = (req, res, next) => {
  const startTime = performance.now();
  const startTimestamp = Date.now();

  // Track request start
  metrics.incrementCounter('http_requests_total', {
    method: req.method,
    route: req.route?.path || req.path,
    status: 'started'
  });

  // Capture original end method
  const originalEnd = res.end;
  
  res.end = function(...args) {
    const endTime = performance.now();
    const duration = (endTime - startTime) / 1000; // Convert to seconds

    // Record metrics
    const labels = {
      method: req.method,
      route: req.route?.path || req.path,
      status: res.statusCode.toString()
    };

    metrics.incrementCounter('http_requests_total', labels);
    metrics.recordHistogram('http_request_duration_seconds', labels, duration);
    
    // Track error rates
    if (res.statusCode >= 400) {
      metrics.incrementCounter('http_errors_total', {
        ...labels,
        error_type: res.statusCode >= 500 ? 'server_error' : 'client_error'
      });
    }

    // Call original end method
    originalEnd.apply(this, args);
  };

  next();
};

// Middleware for collecting custom business metrics
export const businessMetricsMiddleware = (req, res, next) => {
  // Add metrics recording functions to request object
  req.metrics = {
    incrementCounter: (name, labels, value) => metrics.incrementCounter(name, labels, value),
    setGauge: (name, labels, value) => metrics.setGauge(name, labels, value),
    recordHistogram: (name, labels, value) => metrics.recordHistogram(name, labels, value)
  };

  next();
};

// Health check middleware with detailed status
export const healthCheckMiddleware = async (req, res, next) => {
  if (req.path === '/health') {
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      pid: process.pid,
      version: process.env.npm_package_version || '1.0.0',
      environment: process.env.NODE_ENV || 'development'
    };

    // Set health metrics
    metrics.setGauge('cosnap_health_status', { service: 'backend' }, 1);
    metrics.setGauge('cosnap_memory_usage_bytes', { type: 'rss' }, health.memory.rss);
    metrics.setGauge('cosnap_memory_usage_bytes', { type: 'heap_used' }, health.memory.heapUsed);
    metrics.setGauge('cosnap_memory_usage_bytes', { type: 'heap_total' }, health.memory.heapTotal);

    return res.json(health);
  }

  next();
};

// Metrics endpoint middleware
export const metricsEndpointMiddleware = (req, res, next) => {
  if (req.path === '/metrics') {
    res.set('Content-Type', 'text/plain; version=0.0.4; charset=utf-8');
    return res.send(metrics.exportPrometheusMetrics());
  }

  next();
};

// Database metrics middleware
export const databaseMetricsMiddleware = (prisma) => {
  // Wrap Prisma methods to collect metrics
  const originalQuery = prisma.$queryRaw;
  
  prisma.$queryRaw = async function(...args) {
    const startTime = performance.now();
    
    try {
      const result = await originalQuery.apply(this, args);
      const duration = (performance.now() - startTime) / 1000;
      
      metrics.incrementCounter('database_queries_total', { status: 'success' });
      metrics.recordHistogram('database_query_duration_seconds', { status: 'success' }, duration);
      
      return result;
    } catch (error) {
      const duration = (performance.now() - startTime) / 1000;
      
      metrics.incrementCounter('database_queries_total', { status: 'error' });
      metrics.recordHistogram('database_query_duration_seconds', { status: 'error' }, duration);
      
      throw error;
    }
  };

  return prisma;
};

// Task processing metrics
export const recordTaskMetrics = (taskType, status, duration = null) => {
  metrics.incrementCounter('cosnap_tasks_total', { type: taskType, status });
  
  if (duration !== null) {
    metrics.recordHistogram('cosnap_task_duration_seconds', { type: taskType, status }, duration);
  }

  if (status === 'failed') {
    metrics.incrementCounter('cosnap_task_failures_total', { type: taskType });
  }
};

// Payment metrics
export const recordPaymentMetrics = (paymentMethod, status, amount = null) => {
  metrics.incrementCounter('cosnap_payments_total', { method: paymentMethod, status });
  
  if (amount !== null && status === 'success') {
    metrics.setGauge('cosnap_payment_amount_total', { method: paymentMethod }, amount);
  }
};

// API rate limiting metrics
export const recordRateLimitMetrics = (identifier, blocked = false) => {
  metrics.incrementCounter('cosnap_rate_limit_requests_total', { 
    identifier: identifier.substring(0, 10), // Truncate for privacy
    blocked: blocked.toString() 
  });
  
  if (blocked) {
    metrics.incrementCounter('cosnap_rate_limit_blocked_total', { 
      identifier: identifier.substring(0, 10) 
    });
  }
};

export { metrics };
export default {
  httpMetricsMiddleware,
  businessMetricsMiddleware,
  healthCheckMiddleware,
  metricsEndpointMiddleware,
  databaseMetricsMiddleware,
  recordTaskMetrics,
  recordPaymentMetrics,
  recordRateLimitMetrics,
  metrics
};