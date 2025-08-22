import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChartBarIcon,
  UsersIcon,
  EyeIcon,
  HandThumbUpIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ClockIcon,
  DevicePhoneMobileIcon,
  ComputerDesktopIcon,
  GlobeAltIcon,
  FunnelIcon
} from '@heroicons/react/24/outline';
import { useBeta } from '../../context/BetaContext';
import { useAuth } from '../../context/AuthContext';
import analyticsService from '../../services/analyticsService';

interface AnalyticsData {
  userMetrics: {
    totalUsers: number;
    activeUsers: number;
    newUsers: number;
    returningUsers: number;
    avgSessionDuration: number;
    bounceRate: number;
  };
  
  engagementMetrics: {
    pageViews: number;
    uniquePageViews: number;
    avgTimeOnPage: number;
    conversionRate: number;
    clickThroughRate: number;
    featureAdoption: Record<string, number>;
  };
  
  userJourney: {
    onboardingCompletion: number;
    firstEffectCompletion: number;
    communityEngagement: number;
    feedbackSubmission: number;
    retentionRate: Record<string, number>;
  };
  
  deviceMetrics: {
    mobile: number;
    desktop: number;
    tablet: number;
    browsers: Record<string, number>;
    os: Record<string, number>;
  };
  
  geographicData: {
    countries: Record<string, number>;
    cities: Record<string, number>;
    timeZones: Record<string, number>;
  };
  
  realTimeData: {
    activeNow: number;
    currentSessions: number;
    topPages: Array<{page: string, views: number}>;
    recentActions: Array<{
      action: string;
      timestamp: Date;
      userId?: string;
      metadata?: any;
    }>;
  };
}

interface AnalyticsPeriod {
  label: string;
  value: string;
  days: number;
}

const UserBehaviorDashboard: React.FC = () => {
  const { analytics, userAccess } = useBeta();
  const { user } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const realtimeEvents = analyticsService.useRealtimeAnalytics();
  const [selectedPeriod, setSelectedPeriod] = useState<AnalyticsPeriod>({
    label: 'Last 7 days',
    value: '7d',
    days: 7
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<'users' | 'engagement' | 'journey' | 'devices' | 'geographic'>('users');

  const periods: AnalyticsPeriod[] = [
    { label: 'Today', value: '1d', days: 1 },
    { label: 'Last 7 days', value: '7d', days: 7 },
    { label: 'Last 30 days', value: '30d', days: 30 },
    { label: 'Last 90 days', value: '90d', days: 90 }
  ];

  // Check if user has analytics access
  const hasAnalyticsAccess = useMemo(() => {
    return userAccess?.accessLevel === 'DEVELOPER' || 
           userAccess?.accessLevel === 'ADVANCED' ||
           user?.role === 'admin';
  }, [userAccess, user]);

  // Fetch analytics data
  const fetchAnalyticsData = useCallback(async () => {
    if (!hasAnalyticsAccess) return;

    setIsLoading(true);
    try {
      // Simulate API call - replace with actual endpoint
      const response = await fetch(`/api/analytics/dashboard?period=${selectedPeriod.value}`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const analyticsData = await response.json();
        setData(analyticsData);
      } else {
        // Fallback to mock data for development
        setData(generateMockData());
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
      setData(generateMockData());
    } finally {
      setIsLoading(false);
    }
  }, [selectedPeriod.value, hasAnalyticsAccess]);

  // Generate mock data for development
  const generateMockData = useCallback((): AnalyticsData => {
    const baseMultiplier = selectedPeriod.days / 7;
    
    return {
      userMetrics: {
        totalUsers: Math.floor(1250 * baseMultiplier),
        activeUsers: Math.floor(890 * baseMultiplier),
        newUsers: Math.floor(235 * baseMultiplier),
        returningUsers: Math.floor(655 * baseMultiplier),
        avgSessionDuration: 425 + Math.random() * 100,
        bounceRate: 0.25 + Math.random() * 0.1
      },
      
      engagementMetrics: {
        pageViews: Math.floor(5400 * baseMultiplier),
        uniquePageViews: Math.floor(3200 * baseMultiplier),
        avgTimeOnPage: 185 + Math.random() * 50,
        conversionRate: 0.12 + Math.random() * 0.05,
        clickThroughRate: 0.08 + Math.random() * 0.03,
        featureAdoption: {
          'Image Upload': 0.85,
          'AI Effects': 0.72,
          'Community': 0.34,
          'Feedback': 0.28,
          'Advanced Features': 0.15
        }
      },
      
      userJourney: {
        onboardingCompletion: 0.78,
        firstEffectCompletion: 0.65,
        communityEngagement: 0.31,
        feedbackSubmission: 0.23,
        retentionRate: {
          'Day 1': 0.85,
          'Day 7': 0.58,
          'Day 30': 0.32,
          'Day 90': 0.18
        }
      },
      
      deviceMetrics: {
        mobile: 0.68,
        desktop: 0.28,
        tablet: 0.04,
        browsers: {
          'Chrome': 0.52,
          'Safari': 0.31,
          'Firefox': 0.12,
          'Edge': 0.05
        },
        os: {
          'iOS': 0.42,
          'Android': 0.35,
          'Windows': 0.18,
          'macOS': 0.05
        }
      },
      
      geographicData: {
        countries: {
          'China': 0.45,
          'United States': 0.18,
          'Japan': 0.12,
          'South Korea': 0.08,
          'United Kingdom': 0.06,
          'Others': 0.11
        },
        cities: {
          'Beijing': 0.15,
          'Shanghai': 0.12,
          'New York': 0.08,
          'Tokyo': 0.07,
          'London': 0.05
        },
        timeZones: {
          'UTC+8': 0.52,
          'UTC-5': 0.18,
          'UTC+9': 0.12,
          'UTC+0': 0.08,
          'Others': 0.10
        }
      },
      
      realTimeData: {
        activeNow: Math.floor(45 + Math.random() * 20),
        currentSessions: Math.floor(38 + Math.random() * 15),
        topPages: [
          { page: '/effects', views: 127 },
          { page: '/upload', views: 89 },
          { page: '/community', views: 45 },
          { page: '/profile', views: 32 },
          { page: '/home', views: 28 }
        ],
        recentActions: [
          { action: 'effect_completed', timestamp: new Date(Date.now() - 30000), userId: 'user123' },
          { action: 'image_uploaded', timestamp: new Date(Date.now() - 45000), userId: 'user456' },
          { action: 'feedback_submitted', timestamp: new Date(Date.now() - 60000), userId: 'user789' },
          { action: 'community_post', timestamp: new Date(Date.now() - 90000), userId: 'user321' },
          { action: 'user_registration', timestamp: new Date(Date.now() - 120000), userId: 'user654' }
        ]
      }
    };
  }, [selectedPeriod.days]);

  // Load data on mount and period change
  useEffect(() => {
    fetchAnalyticsData();
  }, [fetchAnalyticsData]);

  // Track dashboard usage
  useEffect(() => {
    if (hasAnalyticsAccess) {
      analytics.trackEvent('analytics_dashboard_viewed', {
        period: selectedPeriod.value,
        metric: selectedMetric,
        userId: user?.id
      });
    }
  }, [analytics, selectedPeriod.value, selectedMetric, user?.id, hasAnalyticsAccess]);

  const formatNumber = (num: number): string => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num.toString();
  };

  const formatPercentage = (num: number): string => {
    return `${(num * 100).toFixed(1)}%`;
  };

  const formatDuration = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
  };

  const renderMetricCard = (title: string, value: string | number, icon: React.ReactNode, trend?: 'up' | 'down', trendValue?: string) => (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700"
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{value}</p>
          {trend && trendValue && (
            <div className={`flex items-center mt-2 text-sm ${
              trend === 'up' ? 'text-green-600' : 'text-red-600'
            }`}>
              {trend === 'up' ? (
                <ArrowTrendingUpIcon className="w-4 h-4 mr-1" />
              ) : (
                <ArrowTrendingDownIcon className="w-4 h-4 mr-1" />
              )}
              {trendValue}
            </div>
          )}
        </div>
        <div className="p-3 bg-blue-100 dark:bg-blue-900/20 rounded-lg">
          {icon}
        </div>
      </div>
    </motion.div>
  );

  const renderChart = (data: Record<string, number>, title: string, type: 'bar' | 'pie' = 'bar') => (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">{title}</h3>
      <div className="space-y-3">
        {Object.entries(data).map(([key, value], index) => (
          <div key={key} className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">{key}</span>
            <div className="flex items-center space-x-2">
              <div className="w-24 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${typeof value === 'number' ? value * 100 : value}%` }}
                  className="bg-blue-600 h-2 rounded-full"
                  transition={{ delay: index * 0.1 }}
                />
              </div>
              <span className="text-sm font-medium text-gray-900 dark:text-white w-12 text-right">
                {typeof value === 'number' ? formatPercentage(value) : value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  if (!hasAnalyticsAccess) {
    return (
      <div className="flex items-center justify-center h-64 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="text-center">
          <ChartBarIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Analytics Access Required
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            You need Advanced or Developer access to view analytics.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="bg-gray-200 dark:bg-gray-700 rounded-lg h-32" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-600 dark:text-gray-400">Failed to load analytics data</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h2>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Real-time user behavior insights</p>
        </div>
        
        <div className="flex flex-wrap gap-4 mt-4 lg:mt-0">
          {/* Period Selector */}
          <select
            value={selectedPeriod.value}
            onChange={(e) => {
              const period = periods.find(p => p.value === e.target.value);
              if (period) setSelectedPeriod(period);
            }}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            {periods.map(period => (
              <option key={period.value} value={period.value}>
                {period.label}
              </option>
            ))}
          </select>

          {/* Metric Selector */}
          <div className="flex border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
            {[
              { key: 'users', label: 'Users', icon: <UsersIcon className="w-4 h-4" /> },
              { key: 'engagement', label: 'Engagement', icon: <EyeIcon className="w-4 h-4" /> },
              { key: 'journey', label: 'Journey', icon: <FunnelIcon className="w-4 h-4" /> },
              { key: 'devices', label: 'Devices', icon: <DevicePhoneMobileIcon className="w-4 h-4" /> },
              { key: 'geographic', label: 'Geographic', icon: <GlobeAltIcon className="w-4 h-4" /> }
            ].map(metric => (
              <button
                key={metric.key}
                onClick={() => setSelectedMetric(metric.key as any)}
                className={`px-3 py-2 text-sm flex items-center space-x-2 transition-colors ${
                  selectedMetric === metric.key
                    ? 'bg-blue-600 text-white'
                    : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                }`}
              >
                {metric.icon}
                <span>{metric.label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Real-time Status */}
      <div className="bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Real-time Activity</h3>
            <p className="opacity-90">Live user interactions and sessions</p>
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold">{data.realTimeData.activeNow}</p>
            <p className="opacity-90">users online now</p>
          </div>
        </div>
        
        {/* Real-time Event Stream */}
        <div className="mt-4 max-h-32 overflow-y-auto text-sm">
          <h4 className="font-semibold mb-2">Recent Events</h4>
          {realtimeEvents.slice(-5).map((event, index) => (
            <div key={index} className="bg-white/10 rounded p-2 mb-1">
              <span className="font-medium">{event.type}</span>
              <span className="text-xs ml-2 opacity-75">
                {new Date(event.timestamp).toLocaleTimeString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Metric Cards */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedMetric}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {selectedMetric === 'users' && (
            <>
              {renderMetricCard(
                'Total Users',
                formatNumber(data.userMetrics.totalUsers),
                <UsersIcon className="w-6 h-6 text-blue-600" />,
                'up',
                '+12.5%'
              )}
              {renderMetricCard(
                'Active Users',
                formatNumber(data.userMetrics.activeUsers),
                <EyeIcon className="w-6 h-6 text-green-600" />,
                'up',
                '+8.3%'
              )}
              {renderMetricCard(
                'New Users',
                formatNumber(data.userMetrics.newUsers),
                <UsersIcon className="w-6 h-6 text-purple-600" />,
                'up',
                '+15.2%'
              )}
              {renderMetricCard(
                'Avg Session',
                formatDuration(data.userMetrics.avgSessionDuration),
                <ClockIcon className="w-6 h-6 text-orange-600" />,
                'down',
                '-2.1%'
              )}
            </>
          )}
          
          {selectedMetric === 'engagement' && (
            <>
              {renderMetricCard(
                'Page Views',
                formatNumber(data.engagementMetrics.pageViews),
                <EyeIcon className="w-6 h-6 text-blue-600" />
              )}
              {renderMetricCard(
                'Conversion Rate',
                formatPercentage(data.engagementMetrics.conversionRate),
                <ArrowTrendingUpIcon className="w-6 h-6 text-green-600" />
              )}
              {renderMetricCard(
                'Click-through Rate',
                formatPercentage(data.engagementMetrics.clickThroughRate),
                <HandThumbUpIcon className="w-6 h-6 text-purple-600" />
              )}
              {renderMetricCard(
                'Avg Time on Page',
                formatDuration(data.engagementMetrics.avgTimeOnPage),
                <ClockIcon className="w-6 h-6 text-orange-600" />
              )}
            </>
          )}
        </motion.div>
      </AnimatePresence>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {selectedMetric === 'users' && (
          <>
            {renderChart(data.userJourney.retentionRate, 'User Retention')}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
              <div className="space-y-3">
                {data.realTimeData.recentActions.map((action, index) => (
                  <div key={index} className="flex items-center justify-between py-2 border-b border-gray-200 dark:border-gray-700 last:border-b-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {action.action.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </p>
                      <p className="text-xs text-gray-500">
                        {action.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                    {action.userId && (
                      <span className="text-xs text-gray-400">{action.userId}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
        
        {selectedMetric === 'engagement' && (
          <>
            {renderChart(data.engagementMetrics.featureAdoption, 'Feature Adoption')}
            {renderChart(data.realTimeData.topPages.reduce((acc, page) => {
              acc[page.page] = page.views;
              return acc;
            }, {} as Record<string, number>), 'Top Pages')}
          </>
        )}
        
        {selectedMetric === 'devices' && (
          <>
            {renderChart(data.deviceMetrics.browsers, 'Browser Distribution')}
            {renderChart(data.deviceMetrics.os, 'Operating System')}
          </>
        )}
        
        {selectedMetric === 'geographic' && (
          <>
            {renderChart(data.geographicData.countries, 'Countries')}
            {renderChart(data.geographicData.cities, 'Cities')}
          </>
        )}
      </div>
      
      {/* Add Conversion Funnel and Performance Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
        <ConversionFunnel data={data} />
        <PerformanceSummary data={data} />
      </div>
    </div>
  );
};

// Add advanced conversion funnel tracking
const ConversionFunnel: React.FC<{ data: AnalyticsData }> = ({ data }) => {
  const stages = [
    { name: 'Onboarding', completed: data.userJourney.onboardingCompletion },
    { name: 'First Effect', completed: data.userJourney.firstEffectCompletion },
    { name: 'Community Engagement', completed: data.userJourney.communityEngagement },
    { name: 'Feedback Submission', completed: data.userJourney.feedbackSubmission }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">User Conversion Funnel</h3>
      <div className="space-y-4">
        {stages.map((stage, index) => (
          <div key={stage.name} className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                <span>{stage.name}</span>
                <span>{(stage.completed * 100).toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${stage.completed * 100}%` }}
                  className="bg-blue-600 h-2.5 rounded-full"
                  transition={{ delay: index * 0.2 }}
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Performance and Feature Engagement Summary
const PerformanceSummary: React.FC<{ data: AnalyticsData }> = ({ data }) => {
  const performanceIndicators = [
    { 
      name: 'Beta User Activation', 
      value: formatPercentage(data.userJourney.onboardingCompletion),
      target: 0.75,
      description: 'Completed onboarding process'
    },
    { 
      name: 'Feature Discovery', 
      value: formatPercentage(Object.values(data.engagementMetrics.featureAdoption).reduce((a, b) => a + b, 0) / Object.keys(data.engagementMetrics.featureAdoption).length),
      target: 0.6,
      description: 'Average feature usage rate'
    },
    { 
      name: 'Daily Active Users', 
      value: formatPercentage(data.userMetrics.activeUsers / data.userMetrics.totalUsers),
      target: 0.4,
      description: 'Percentage of daily active users'
    },
    { 
      name: 'Feedback Response', 
      value: formatPercentage(data.userJourney.feedbackSubmission),
      target: 0.7,
      description: 'Users providing feedback'
    }
  ];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-sm border border-gray-200 dark:border-gray-700">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance & Engagement Summary</h3>
      <div className="space-y-4">
        {performanceIndicators.map((indicator, index) => (
          <div key={indicator.name} className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                <span>{indicator.name}</span>
                <span className={`font-semibold ${
                  parseFloat(indicator.value) >= (indicator.target * 100) 
                    ? 'text-green-600' 
                    : 'text-red-600'
                }`}>
                  {indicator.value}
                </span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(parseFloat(indicator.value), 100)}%` }}
                  className="bg-blue-600 h-2.5 rounded-full"
                  transition={{ delay: index * 0.2 }}
                />
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{indicator.description}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export { UserBehaviorDashboard, ConversionFunnel, PerformanceSummary };