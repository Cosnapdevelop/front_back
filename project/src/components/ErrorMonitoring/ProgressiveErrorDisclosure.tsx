import React, { useState, useEffect } from 'react';
import { AlertTriangle, Info, ChevronDown, ChevronRight, X, ExternalLink } from 'lucide-react';
import { BaseError, ErrorSeverity } from '../../types/errors';

export interface DisclosureLevel {
  level: 1 | 2 | 3 | 4;
  trigger: 'immediate' | 'retry_failed' | 'multiple_failures' | 'critical_failure';
  display: 'silent' | 'toast' | 'modal' | 'fullscreen';
  showTechnicalDetails: boolean;
  showRecoveryActions: boolean;
  showPreventionTips: boolean;
  persistInHistory: boolean;
}

interface ErrorContext {
  userJourney: 'onboarding' | 'creating' | 'sharing' | 'managing' | 'purchasing';
  userExperience: 'new' | 'experienced' | 'power';
  deviceType: 'mobile' | 'tablet' | 'desktop';
  connectionType: 'fast' | 'slow' | 'offline';
  timeOfDay: 'peak' | 'normal' | 'low';
  errorHistory: Array<{
    errorType: string;
    timestamp: number;
    resolved: boolean;
  }>;
}

interface ProgressiveErrorDisclosureProps {
  error: Error;
  context: ErrorContext;
  onDismiss: () => void;
  onRetry?: () => void;
  onContactSupport?: () => void;
  onReportFeedback?: (feedback: string) => void;
}

const ProgressiveErrorDisclosure: React.FC<ProgressiveErrorDisclosureProps> = ({
  error,
  context,
  onDismiss,
  onRetry,
  onContactSupport,
  onReportFeedback
}) => {
  const [disclosureLevel, setDisclosureLevel] = useState<DisclosureLevel | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const [userFeedback, setUserFeedback] = useState('');
  const [showFeedbackForm, setShowFeedbackForm] = useState(false);
  
  useEffect(() => {
    const level = calculateDisclosureLevel(error, context);
    setDisclosureLevel(level);
  }, [error, context]);
  
  if (!disclosureLevel || disclosureLevel.display === 'silent') {
    return null;
  }
  
  const errorKey = `${error.name}_${context.userJourney}`;
  const errorOccurrences = context.errorHistory.filter(e => 
    e.errorType === error.name && 
    Date.now() - e.timestamp < 3600000 // Last hour
  ).length;
  
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };
  
  const handleFeedbackSubmit = () => {
    if (userFeedback.trim() && onReportFeedback) {
      onReportFeedback(userFeedback.trim());
      setUserFeedback('');
      setShowFeedbackForm(false);
    }
  };
  
  const containerClass = getContainerClass(disclosureLevel.display);
  const content = (
    <div className={getContentClass(disclosureLevel.display)}>
      {renderHeader(error, context, disclosureLevel)}
      {renderMainMessage(error, context, disclosureLevel)}
      {disclosureLevel.showRecoveryActions && renderRecoveryActions(error, context, onRetry, onContactSupport)}
      {renderProgressiveContent(error, context, disclosureLevel, expandedSections, toggleSection)}
      {renderFeedbackSection(showFeedbackForm, userFeedback, setUserFeedback, setShowFeedbackForm, handleFeedbackSubmit)}
      {renderDismissButton(onDismiss, disclosureLevel)}
    </div>
  );
  
  if (disclosureLevel.display === 'fullscreen') {
    return (
      <div className={containerClass}>
        {content}
      </div>
    );
  }
  
  return content;
};

function calculateDisclosureLevel(error: Error, context: ErrorContext): DisclosureLevel {
  const errorOccurrences = context.errorHistory.filter(e => 
    e.errorType === error.name && 
    Date.now() - e.timestamp < 3600000
  ).length;
  
  const unresolvedErrors = context.errorHistory.filter(e => 
    !e.resolved && 
    Date.now() - e.timestamp < 1800000 // Last 30 minutes
  ).length;
  
  // Critical errors get immediate full disclosure
  if (error instanceof BaseError && error.severity === ErrorSeverity.CRITICAL) {
    return {
      level: 4,
      trigger: 'critical_failure',
      display: 'fullscreen',
      showTechnicalDetails: true,
      showRecoveryActions: true,
      showPreventionTips: true,
      persistInHistory: true
    };
  }
  
  // Multiple failures in short time
  if (unresolvedErrors > 3 || errorOccurrences > 2) {
    return {
      level: 3,
      trigger: 'multiple_failures',
      display: context.deviceType === 'mobile' ? 'fullscreen' : 'modal',
      showTechnicalDetails: context.userExperience === 'power',
      showRecoveryActions: true,
      showPreventionTips: true,
      persistInHistory: true
    };
  }
  
  // Second occurrence or retry failed
  if (errorOccurrences > 0) {
    return {
      level: 2,
      trigger: 'retry_failed',
      display: 'modal',
      showTechnicalDetails: false,
      showRecoveryActions: true,
      showPreventionTips: context.userExperience !== 'new',
      persistInHistory: true
    };
  }
  
  // First occurrence
  return {
    level: 1,
    trigger: 'immediate',
    display: 'toast',
    showTechnicalDetails: false,
    showRecoveryActions: context.userExperience === 'power',
    showPreventionTips: false,
    persistInHistory: false
  };
}

function getContainerClass(display: string): string {
  switch (display) {
    case 'fullscreen':
      return 'fixed inset-0 bg-gray-900/75 z-50 flex items-center justify-center p-4';
    case 'modal':
      return 'fixed inset-0 bg-black/50 z-40 flex items-center justify-center p-4';
    case 'toast':
      return 'fixed top-4 right-4 z-30 max-w-sm';
    default:
      return '';
  }
}

function getContentClass(display: string): string {
  const baseClass = 'bg-white dark:bg-gray-800 rounded-lg shadow-xl';
  
  switch (display) {
    case 'fullscreen':
      return `${baseClass} max-w-2xl w-full max-h-[90vh] overflow-y-auto`;
    case 'modal':
      return `${baseClass} max-w-lg w-full max-h-[80vh] overflow-y-auto`;
    case 'toast':
      return `${baseClass} p-4 border border-gray-200 dark:border-gray-700`;
    default:
      return baseClass;
  }
}

function renderHeader(error: Error, context: ErrorContext, disclosureLevel: DisclosureLevel) {
  if (disclosureLevel.display === 'toast') return null;
  
  const getSeverityColor = () => {
    if (error instanceof BaseError) {
      switch (error.severity) {
        case ErrorSeverity.CRITICAL: return 'text-red-600 bg-red-100 dark:bg-red-900/20';
        case ErrorSeverity.HIGH: return 'text-orange-600 bg-orange-100 dark:bg-orange-900/20';
        case ErrorSeverity.MEDIUM: return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
        default: return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      }
    }
    return 'text-red-600 bg-red-100 dark:bg-red-900/20';
  };
  
  return (
    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
      <div className="flex items-center space-x-3">
        <div className={`p-2 rounded-full ${getSeverityColor()}`}>
          <AlertTriangle className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {getErrorTitle(error, context)}
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Level {disclosureLevel.level} disclosure • {disclosureLevel.trigger.replace(/_/g, ' ')}
          </p>
        </div>
      </div>
    </div>
  );
}

function renderMainMessage(error: Error, context: ErrorContext, disclosureLevel: DisclosureLevel) {
  const message = getContextualMessage(error, context);
  const containerClass = disclosureLevel.display === 'toast' 
    ? '' 
    : 'p-6 space-y-4';
  
  return (
    <div className={containerClass}>
      <div className="flex items-start space-x-3">
        {disclosureLevel.display === 'toast' && (
          <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
        )}
        <div className="flex-1">
          <p className="text-gray-700 dark:text-gray-300">
            {message}
          </p>
          
          {disclosureLevel.level > 1 && (
            <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                💡 {getPreventionTip(error, context)}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function renderRecoveryActions(
  error: Error, 
  context: ErrorContext, 
  onRetry?: () => void, 
  onContactSupport?: () => void
) {
  const actions = getRecoveryActions(error, context, onRetry, onContactSupport);
  
  if (actions.length === 0) return null;
  
  return (
    <div className="px-6 pb-4">
      <div className="space-y-2">
        {actions.map((action, index) => (
          <button
            key={index}
            onClick={action.action}
            className={`w-full flex items-center justify-center space-x-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              action.primary
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300'
            }`}
          >
            {action.icon && <action.icon className="w-4 h-4" />}
            <span>{action.label}</span>
            {action.estimatedTime && (
              <span className="text-xs opacity-75">({action.estimatedTime})</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function renderProgressiveContent(
  error: Error,
  context: ErrorContext,
  disclosureLevel: DisclosureLevel,
  expandedSections: Set<string>,
  toggleSection: (section: string) => void
) {
  if (disclosureLevel.display === 'toast') return null;
  
  const sections = [
    {
      id: 'technical',
      title: 'Technical Details',
      show: disclosureLevel.showTechnicalDetails || disclosureLevel.level > 2,
      content: (
        <div className="bg-gray-100 dark:bg-gray-700 rounded p-3 text-sm font-mono">
          <div className="text-red-600 dark:text-red-400 mb-2">
            {error.name}: {error.message}
          </div>
          {error.stack && (
            <div className="text-gray-600 dark:text-gray-400 text-xs max-h-32 overflow-y-auto">
              {error.stack}
            </div>
          )}
        </div>
      )
    },
    {
      id: 'context',
      title: 'Error Context',
      show: disclosureLevel.level > 2,
      content: (
        <div className="text-sm space-y-2">
          <div><strong>User Journey:</strong> {context.userJourney}</div>
          <div><strong>Experience Level:</strong> {context.userExperience}</div>
          <div><strong>Device:</strong> {context.deviceType}</div>
          <div><strong>Connection:</strong> {context.connectionType}</div>
          <div><strong>Time:</strong> {context.timeOfDay}</div>
        </div>
      )
    },
    {
      id: 'similar',
      title: 'Similar Issues',
      show: disclosureLevel.level > 1,
      content: (
        <div className="text-sm space-y-2">
          <p>Other users have experienced similar issues when:</p>
          <ul className="list-disc list-inside space-y-1 text-gray-600 dark:text-gray-400">
            <li>Network connection is unstable</li>
            <li>Browser cache needs clearing</li>
            <li>Ad blockers interfere with requests</li>
          </ul>
        </div>
      )
    }
  ];
  
  return (
    <div className="px-6 space-y-3">
      {sections
        .filter(section => section.show)
        .map(section => (
          <div key={section.id} className="border border-gray-200 dark:border-gray-700 rounded-lg">
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between p-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg"
            >
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                {section.title}
              </span>
              {expandedSections.has(section.id) ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
            {expandedSections.has(section.id) && (
              <div className="p-3 pt-0">
                {section.content}
              </div>
            )}
          </div>
        ))}
    </div>
  );
}

function renderFeedbackSection(
  showFeedbackForm: boolean,
  userFeedback: string,
  setUserFeedback: (feedback: string) => void,
  setShowFeedbackForm: (show: boolean) => void,
  handleFeedbackSubmit: () => void
) {
  return (
    <div className="px-6 pb-4 border-t border-gray-200 dark:border-gray-700 mt-4 pt-4">
      {!showFeedbackForm ? (
        <button
          onClick={() => setShowFeedbackForm(true)}
          className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
        >
          Provide feedback about this error
        </button>
      ) : (
        <div className="space-y-3">
          <textarea
            value={userFeedback}
            onChange={(e) => setUserFeedback(e.target.value)}
            placeholder="Help us improve by describing what you were trying to do when this error occurred..."
            className="w-full p-3 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            rows={3}
          />
          <div className="flex space-x-2">
            <button
              onClick={handleFeedbackSubmit}
              disabled={!userFeedback.trim()}
              className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
            >
              Submit
            </button>
            <button
              onClick={() => setShowFeedbackForm(false)}
              className="px-3 py-1 text-sm bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-400 dark:hover:bg-gray-500"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function renderDismissButton(onDismiss: () => void, disclosureLevel: DisclosureLevel) {
  if (disclosureLevel.display === 'toast') {
    return (
      <button
        onClick={onDismiss}
        className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600"
      >
        <X className="w-4 h-4" />
      </button>
    );
  }
  
  return (
    <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
      <button
        onClick={onDismiss}
        className="px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white"
      >
        Dismiss
      </button>
    </div>
  );
}

// Helper functions
function getErrorTitle(error: Error, context: ErrorContext): string {
  if (error instanceof BaseError) {
    switch (error.code) {
      case 'NETWORK_ERROR': return 'Connection Problem';
      case 'FILE_TOO_LARGE': return 'File Size Issue';
      case 'TASK_TIMEOUT': return 'Processing Delayed';
      default: return 'Something Went Wrong';
    }
  }
  
  return error.name.replace(/([A-Z])/g, ' $1').trim();
}

function getContextualMessage(error: Error, context: ErrorContext): string {
  const baseMessage = error.message;
  
  // Customize message based on user experience level
  if (context.userExperience === 'new') {
    return `${baseMessage} Don't worry - this happens sometimes and is usually easy to fix.`;
  } else if (context.userExperience === 'power') {
    return baseMessage;
  }
  
  return `${baseMessage} This is a temporary issue that we can resolve.`;
}

function getPreventionTip(error: Error, context: ErrorContext): string {
  if (error instanceof BaseError) {
    switch (error.code) {
      case 'NETWORK_ERROR':
        return 'Use a stable Wi-Fi connection for better reliability';
      case 'FILE_TOO_LARGE':
        return 'Images under 10MB process faster and more reliably';
      case 'TASK_TIMEOUT':
        return 'Complex images may take longer to process during peak hours';
      default:
        return 'Refreshing the page often resolves temporary issues';
    }
  }
  
  return 'These types of errors are usually temporary and resolve quickly';
}

function getRecoveryActions(
  error: Error, 
  context: ErrorContext, 
  onRetry?: () => void, 
  onContactSupport?: () => void
): Array<{
  label: string;
  action: () => void;
  primary?: boolean;
  icon?: React.ComponentType<any>;
  estimatedTime?: string;
}> {
  const actions = [];
  
  if (onRetry && error instanceof BaseError && error.retryable) {
    actions.push({
      label: 'Try Again',
      action: onRetry,
      primary: true,
      estimatedTime: '30s'
    });
  }
  
  if (context.userExperience === 'power' || context.userJourney === 'managing') {
    actions.push({
      label: 'View Help',
      action: () => window.open('/help/errors', '_blank'),
      icon: ExternalLink
    });
  }
  
  if (onContactSupport) {
    actions.push({
      label: 'Contact Support',
      action: onContactSupport
    });
  }
  
  return actions;
}

export default ProgressiveErrorDisclosure;