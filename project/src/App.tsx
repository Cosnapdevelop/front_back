import React, { useEffect, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import { BetaProvider } from './context/BetaContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Layout/Navbar';
import PerformanceMonitor from './components/Performance/PerformanceMonitor';
import RealTimeMonitor from './components/Performance/RealTimeMonitor';
import LoadingState from './components/UI/LoadingState';
import BetaOnboardingFlow from './components/Beta/BetaOnboardingFlow';
import BetaOnboardingTutorial from './components/Onboarding/BetaOnboardingTutorial';
import FeedbackWidget from './components/Feedback/FeedbackWidget';
import AnimeOnboardingFlow, { useAnimeOnboarding } from './components/Anime/AnimeOnboardingFlow';
import { trackPageView, trackPerformance } from './utils/analytics';
import { usePerformanceMonitoring } from './hooks/usePerformanceMonitoring';

// Lazy load pages for optimal code splitting
const Home = React.lazy(() => import('./pages/Home'));
const Effects = React.lazy(() => import('./pages/Effects'));
const Community = React.lazy(() => import('./pages/Community'));
const Profile = React.lazy(() => import('./pages/Profile'));
const EffectDetail = React.lazy(() => import('./pages/EffectDetail'));
const ApplyEffect = React.lazy(() => import('./pages/ApplyEffect'));
const PostDetail = React.lazy(() => import('./pages/PostDetail'));
const UserProfile = React.lazy(() => import('./pages/UserProfile'));
const ImageLibrary = React.lazy(() => import('./pages/ImageLibrary'));
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const ForgotPassword = React.lazy(() => import('./pages/ForgotPassword'));
const EmailSent = React.lazy(() => import('./pages/EmailSent'));
const ResetPassword = React.lazy(() => import('./pages/ResetPassword'));
const ResetSuccess = React.lazy(() => import('./pages/ResetSuccess'));

// Analytics tracking component
const AnalyticsTracker: React.FC = () => {
  const location = useLocation();
  const performanceMetrics = usePerformanceMonitoring();

  useEffect(() => {
    // Track page views on route changes
    trackPageView(location.pathname, document.title);
  }, [location.pathname]);

  useEffect(() => {
    // Track performance metrics when available
    if (performanceMetrics.pageLoadTime) {
      trackPerformance('page_load_time', performanceMetrics.pageLoadTime);
    }
    if (performanceMetrics.firstContentfulPaint) {
      trackPerformance('page_load_time', performanceMetrics.firstContentfulPaint);
    }
  }, [performanceMetrics]);

  return null;
};

function App() {
  const animeOnboarding = useAnimeOnboarding();
  
  return (
    <ErrorBoundary>
      <AppProvider>
        <AuthProvider>
          <BetaProvider>
            <ToastProvider>
              <Router>
                <AnalyticsTracker />
                <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
                  <ErrorBoundary>
                    <Navbar />
                  </ErrorBoundary>
                  <ErrorBoundary>
                    <Suspense fallback={<LoadingState fullScreen message="Loading..." />}>
                      <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/effects" element={<Effects />} />
                        <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
                        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                        <Route path="/effect/:id" element={<EffectDetail />} />
                        <Route path="/apply/:id" element={<ProtectedRoute><ApplyEffect /></ProtectedRoute>} />
                        <Route path="/image-library" element={<ImageLibrary />} />
                        <Route path="/post/:postId" element={<ProtectedRoute><PostDetail /></ProtectedRoute>} />
                        <Route path="/user/:userId" element={<UserProfile />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/register" element={<Register />} />
                        <Route path="/forgot-password" element={<ForgotPassword />} />
                        <Route path="/forgot-password/email-sent" element={<EmailSent />} />
                        <Route path="/reset-password/:token" element={<ResetPassword />} />
                        <Route path="/reset-password/success" element={<ResetSuccess />} />
                      </Routes>
                    </Suspense>
                  </ErrorBoundary>
                  
                  {/* Beta Onboarding System */}
                  <BetaOnboardingFlow />
                  <BetaOnboardingTutorial />
                  
                  {/* Anime Onboarding Flow */}
                  <AnimeOnboardingFlow
                    isOpen={animeOnboarding.isOpen}
                    onClose={animeOnboarding.handleClose}
                    onComplete={animeOnboarding.handleComplete}
                  />
                  
                  {/* Feedback Collection System */}
                  <FeedbackWidget 
                    position="bottom-right"
                    autoTrigger={{
                      afterActions: 5,
                      afterTime: 30
                    }}
                  />
                  
                  {/* Performance Monitoring Components */}
                  <PerformanceMonitor 
                    showDetailedMetrics={process.env.NODE_ENV === 'development'}
                    alertThresholds={{
                      fcp: 1500,  // First Contentful Paint target
                      lcp: 2500,  // Largest Contentful Paint target
                      fid: 100,   // First Input Delay target
                      cls: 0.1,   // Cumulative Layout Shift target
                      apiResponseTime: 3000, // API response time target
                    }}
                  />
                  <RealTimeMonitor />
                </div>
              </Router>
            </ToastProvider>
          </BetaProvider>
        </AuthProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;