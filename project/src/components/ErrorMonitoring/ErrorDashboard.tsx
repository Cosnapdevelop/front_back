import React, { useState, useEffect } from 'react';
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  Clock, 
  RefreshCw, 
  Settings,
  TrendingDown,
  TrendingUp,
  Zap,
  Shield,
  Wifi,
  Database
} from 'lucide-react';
import { useErrorHandler } from '../../context/ErrorContext';

interface ErrorDashboardProps {
  isOpen: boolean;
  onClose: () => void;
}

const ErrorDashboard: React.FC<ErrorDashboardProps> = ({ isOpen, onClose }) => {
  const {
    state,
    checkSystemHealth,
    clearErrorHistory,
    resetCircuitBreaker,
    toggleErrorNotifications,
    toggleDebugMode,
    retryLastOperation
  } = useErrorHandler();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'errors' | 'circuit-breakers' | 'settings'>('overview');
  const [refreshing, setRefreshing] = useState(false);
  
  useEffect(() => {
    if (isOpen) {
      checkSystemHealth();
    }
  }, [isOpen, checkSystemHealth]);
  
  if (!isOpen) return null;
  
  const handleRefresh = async () => {
    setRefreshing(true);
    await checkSystemHealth();
    setTimeout(() => setRefreshing(false), 500);
  };
  
  const getHealthColor = () => {
    switch (state.systemHealth) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };
  
  const getHealthIcon = () => {
    switch (state.systemHealth) {
      case 'healthy': return <CheckCircle className="w-5 h-5" />;
      case 'degraded': return <AlertTriangle className="w-5 h-5" />;
      case 'critical': return <AlertTriangle className="w-5 h-5" />;
      default: return <Activity className="w-5 h-5" />;
    }
  };
  
  const getCircuitBreakerIcon = (serviceName: string) => {
    switch (serviceName) {
      case 'runninghub_api': return <Zap className="w-4 h-4" />;
      case 'database': return <Database className="w-4 h-4" />;
      case 'payment_gateway': return <Shield className="w-4 h-4" />;
      default: return <Wifi className="w-4 h-4" />;
    }
  };
  
  const getCircuitBreakerColor = (state: string) => {
    switch (state) {
      case 'closed': return 'text-green-600 bg-green-100';
      case 'half-open': return 'text-yellow-600 bg-yellow-100';
      case 'open': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };
  
  const recentErrorsCount = state.recentErrors.filter(error => 
    Date.now() - error.timestamp < 300000 && !error.resolved
  ).length;
  
  const errorTrend = state.recentErrors.length > 0 ? 'stable' : 'decreasing';
  
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-3">
            <Activity className="w-6 h-6 text-blue-600" />
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              Error Monitoring Dashboard
            </h2>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <RefreshCw className={`w-5 h-5 ${refreshing ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              ✕
            </button>
          </div>
        </div>
        
        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          {[
            { id: 'overview', label: 'Overview', icon: Activity },
            { id: 'errors', label: 'Errors', icon: AlertTriangle },
            { id: 'circuit-breakers', label: 'Circuit Breakers', icon: Shield },
            { id: 'settings', label: 'Settings', icon: Settings }
          ].map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setActiveTab(id as any)}
              className={`flex items-center space-x-2 px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                activeTab === id
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{label}</span>
            </button>
          ))}
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* System Health */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">System Health</h3>
                    <div className={`p-2 rounded-full ${getHealthColor()}`}>
                      {getHealthIcon()}
                    </div>
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                    {state.systemHealth}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Last check: {new Date(state.lastHealthCheck).toLocaleTimeString()}
                  </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Total Errors</h3>
                    <AlertTriangle className="w-5 h-5 text-orange-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {state.totalErrors}
                  </p>
                  <div className="flex items-center mt-1">
                    {errorTrend === 'decreasing' ? (
                      <TrendingDown className="w-4 h-4 text-green-500 mr-1" />
                    ) : (
                      <TrendingUp className="w-4 h-4 text-red-500 mr-1" />
                    )}
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {recentErrorsCount} in last 5 minutes
                    </p>
                  </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Active Issues</h3>
                    <Clock className="w-5 h-5 text-blue-500" />
                  </div>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {state.recentErrors.filter(e => !e.resolved).length}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Unresolved errors
                  </p>
                </div>
              </div>
              
              {/* Error Types Chart */}
              <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                  Error Distribution
                </h3>
                <div className="space-y-2">
                  {Object.entries(state.errorsByType).map(([type, count]) => (
                    <div key={type} className="flex items-center justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">{type}</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                          <div 
                            className="bg-blue-500 h-2 rounded-full"
                            style={{ width: `${(count / Math.max(...Object.values(state.errorsByType))) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {count}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          {activeTab === 'errors' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Recent Errors
                </h3>
                <div className="space-x-2">
                  <button
                    onClick={retryLastOperation}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Retry Last
                  </button>
                  <button
                    onClick={clearErrorHistory}
                    className="px-3 py-1 text-sm bg-gray-600 text-white rounded hover:bg-gray-700"
                  >
                    Clear History
                  </button>
                </div>
              </div>
              
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {state.recentErrors.length === 0 ? (
                  <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    No errors recorded
                  </div>
                ) : (
                  state.recentErrors.map((error) => (
                    <div 
                      key={error.id}
                      className={`p-3 rounded-lg border ${
                        error.resolved 
                          ? 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800'
                          : 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800'
                      }`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                              {error.type}
                            </span>
                            <span className={`px-2 py-1 text-xs rounded-full ${
                              error.severity === 'CRITICAL' ? 'bg-red-100 text-red-800' :
                              error.severity === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                              error.severity === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-blue-100 text-blue-800'
                            }`}>
                              {error.severity}
                            </span>
                            {error.resolved && (
                              <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded-full">
                                Resolved
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                            {error.message}
                          </p>
                          <div className="text-xs text-gray-500 dark:text-gray-400">
                            {new Date(error.timestamp).toLocaleString()}
                            {error.component && ` • ${error.component}`}
                            {error.feature && ` • ${error.feature}`}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
          
          {activeTab === 'circuit-breakers' && (
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Circuit Breaker Status
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(state.circuitBreakerStates).map(([serviceName, state]) => (
                  <div key={serviceName} className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        {getCircuitBreakerIcon(serviceName)}
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {serviceName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </h4>
                      </div>
                      <div className={`px-2 py-1 text-xs rounded-full ${getCircuitBreakerColor(state)}`}>
                        {state.toUpperCase()}
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {state === 'closed' ? 'Operating normally' :
                         state === 'half-open' ? 'Testing recovery' :
                         'Service unavailable'}
                      </span>
                      {state !== 'closed' && (
                        <button
                          onClick={() => resetCircuitBreaker(serviceName)}
                          className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Error Handling Settings
              </h3>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      Error Notifications
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Show toast notifications for errors
                    </p>
                  </div>
                  <button
                    onClick={toggleErrorNotifications}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      state.errorNotificationsEnabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        state.errorNotificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                      Debug Mode
                    </h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Show detailed error information
                    </p>
                  </div>
                  <button
                    onClick={toggleDebugMode}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      state.debugMode ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        state.debugMode ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
                
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                        Development Settings
                      </h4>
                      <p className="text-xs text-yellow-700 dark:text-yellow-300 mt-1">
                        These settings are for development and debugging purposes. 
                        In production, error handling is optimized for user experience.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ErrorDashboard;