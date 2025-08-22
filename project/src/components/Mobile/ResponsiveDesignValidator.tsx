import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Smartphone, 
  Tablet, 
  Monitor, 
  Check, 
  X, 
  AlertTriangle,
  Zap,
  Eye,
  Moon,
  Sun
} from 'lucide-react';

interface BreakpointTest {
  name: string;
  width: number;
  height: number;
  passed: boolean;
  issues: string[];
}

interface ResponsiveDesignValidatorProps {
  showValidator?: boolean;
  onClose?: () => void;
}

const ResponsiveDesignValidator: React.FC<ResponsiveDesignValidatorProps> = ({
  showValidator = false,
  onClose
}) => {
  const [currentViewport, setCurrentViewport] = useState({ width: 0, height: 0 });
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [tests, setTests] = useState<BreakpointTest[]>([]);
  const [isRunningTests, setIsRunningTests] = useState(false);

  const breakpoints = [
    { name: 'iPhone SE', width: 375, height: 667, device: 'phone' },
    { name: 'iPhone 12', width: 390, height: 844, device: 'phone' },
    { name: 'iPhone 12 Pro Max', width: 428, height: 926, device: 'phone' },
    { name: 'Samsung Galaxy S21', width: 360, height: 800, device: 'phone' },
    { name: 'iPad Mini', width: 768, height: 1024, device: 'tablet' },
    { name: 'iPad Pro', width: 1024, height: 1366, device: 'tablet' },
    { name: 'Desktop', width: 1440, height: 900, device: 'desktop' },
  ];

  useEffect(() => {
    const updateViewport = () => {
      setCurrentViewport({
        width: window.innerWidth,
        height: window.innerHeight
      });
    };

    updateViewport();
    window.addEventListener('resize', updateViewport);
    return () => window.removeEventListener('resize', updateViewport);
  }, []);

  useEffect(() => {
    const checkDarkMode = () => {
      setIsDarkMode(document.documentElement.classList.contains('dark'));
    };

    checkDarkMode();
    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, { 
      attributes: true, 
      attributeFilter: ['class'] 
    });

    return () => observer.disconnect();
  }, []);

  const runResponsiveTests = async () => {
    setIsRunningTests(true);
    const testResults: BreakpointTest[] = [];

    for (const breakpoint of breakpoints) {
      const issues: string[] = [];
      
      // Test touch targets
      const buttons = document.querySelectorAll('button, a, [role="button"]');
      const smallButtons = Array.from(buttons).filter(btn => {
        const rect = btn.getBoundingClientRect();
        return rect.width < 44 || rect.height < 44;
      });
      
      if (smallButtons.length > 0) {
        issues.push(`${smallButtons.length} touch targets smaller than 44px`);
      }

      // Test horizontal scroll
      const hasHorizontalScroll = document.body.scrollWidth > breakpoint.width;
      if (hasHorizontalScroll) {
        issues.push('Horizontal scroll detected');
      }

      // Test font sizes
      const smallTexts = document.querySelectorAll('*').length;
      const computedStyles = Array.from(document.querySelectorAll('p, span, div')).filter(el => {
        const style = window.getComputedStyle(el);
        const fontSize = parseFloat(style.fontSize);
        return fontSize < 16 && el.textContent?.trim();
      });

      if (computedStyles.length > 10) {
        issues.push('Many text elements smaller than 16px');
      }

      // Test safe area support
      const hasSafeAreaSupport = document.documentElement.style.getPropertyValue('--safe-area-inset-top') || 
                                 getComputedStyle(document.documentElement).getPropertyValue('padding-top').includes('env(safe-area-inset-top)');
      
      if (!hasSafeAreaSupport && breakpoint.device === 'phone') {
        issues.push('Missing safe area inset support');
      }

      testResults.push({
        name: breakpoint.name,
        width: breakpoint.width,
        height: breakpoint.height,
        passed: issues.length === 0,
        issues
      });

      // Simulate testing delay
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    setTests(testResults);
    setIsRunningTests(false);
  };

  const getDeviceIcon = (width: number) => {
    if (width < 768) return Smartphone;
    if (width < 1024) return Tablet;
    return Monitor;
  };

  const getCurrentBreakpoint = () => {
    return breakpoints.find(bp => 
      currentViewport.width <= bp.width + 50 && currentViewport.width >= bp.width - 50
    )?.name || 'Custom';
  };

  if (!showValidator) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-white dark:bg-obsidian-800 rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b border-pearl-200 dark:border-obsidian-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-mint-500 to-cosmic-500 rounded-lg flex items-center justify-center">
                  <Eye className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-obsidian-900 dark:text-pearl-100">
                    Responsive Design Validator
                  </h2>
                  <p className="text-sm text-obsidian-600 dark:text-pearl-400">
                    Current: {getCurrentBreakpoint()} ({currentViewport.width}×{currentViewport.height})
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setIsDarkMode(!isDarkMode)}
                  className="p-2 rounded-lg hover:bg-pearl-100 dark:hover:bg-obsidian-700 transition-colors"
                >
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>
                
                <button
                  onClick={onClose}
                  className="p-2 rounded-lg hover:bg-pearl-100 dark:hover:bg-obsidian-700 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[60vh] overflow-y-auto">
            <div className="mb-6">
              <button
                onClick={runResponsiveTests}
                disabled={isRunningTests}
                className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-mint-500 to-cosmic-500 text-white rounded-lg hover:from-mint-600 hover:to-cosmic-600 transition-all disabled:opacity-50"
              >
                <Zap className="w-4 h-4" />
                <span>{isRunningTests ? 'Running Tests...' : 'Run Responsive Tests'}</span>
              </button>
            </div>

            {/* Current Viewport Info */}
            <div className="mb-6 p-4 bg-pearl-50 dark:bg-obsidian-700 rounded-xl">
              <h3 className="font-semibold text-obsidian-900 dark:text-pearl-100 mb-2">
                Current Viewport
              </h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-obsidian-600 dark:text-pearl-400">Width:</span>
                  <span className="ml-2 font-mono">{currentViewport.width}px</span>
                </div>
                <div>
                  <span className="text-obsidian-600 dark:text-pearl-400">Height:</span>
                  <span className="ml-2 font-mono">{currentViewport.height}px</span>
                </div>
                <div>
                  <span className="text-obsidian-600 dark:text-pearl-400">Ratio:</span>
                  <span className="ml-2 font-mono">
                    {(currentViewport.width / currentViewport.height).toFixed(2)}
                  </span>
                </div>
                <div>
                  <span className="text-obsidian-600 dark:text-pearl-400">Mode:</span>
                  <span className="ml-2">{isDarkMode ? 'Dark' : 'Light'}</span>
                </div>
              </div>
            </div>

            {/* Test Results */}
            {tests.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-semibold text-obsidian-900 dark:text-pearl-100">
                  Test Results
                </h3>
                
                {tests.map((test, index) => {
                  const DeviceIcon = getDeviceIcon(test.width);
                  
                  return (
                    <motion.div
                      key={test.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className={`p-4 rounded-xl border ${
                        test.passed 
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800'
                          : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <DeviceIcon className={`w-5 h-5 ${
                            test.passed ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                          }`} />
                          <div>
                            <h4 className="font-medium text-obsidian-900 dark:text-pearl-100">
                              {test.name}
                            </h4>
                            <p className="text-sm text-obsidian-600 dark:text-pearl-400">
                              {test.width}×{test.height}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          {test.passed ? (
                            <Check className="w-5 h-5 text-green-600 dark:text-green-400" />
                          ) : (
                            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
                          )}
                        </div>
                      </div>
                      
                      {test.issues.length > 0 && (
                        <div className="mt-3 space-y-1">
                          {test.issues.map((issue, issueIndex) => (
                            <div key={issueIndex} className="flex items-center space-x-2 text-sm">
                              <X className="w-3 h-3 text-red-500" />
                              <span className="text-red-700 dark:text-red-300">{issue}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Quick Fixes */}
            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
                Quick Responsive Design Tips
              </h3>
              <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
                <li>• Ensure all touch targets are at least 44×44px</li>
                <li>• Use min-width: 320px for the smallest supported viewport</li>
                <li>• Test with device orientation changes</li>
                <li>• Add safe-area-inset for iPhone X+ devices</li>
                <li>• Use relative units (rem, em) for better scaling</li>
                <li>• Test dark mode on all viewport sizes</li>
              </ul>
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ResponsiveDesignValidator;