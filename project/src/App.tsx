import React, { lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Layout/Navbar';
import { LazyLoadWrapper } from './components/UI/LazyLoadWrapper';

// Lazy load pages for better performance
const Home = lazy(() => import('./pages/Home'));
const Effects = lazy(() => import('./pages/Effects'));
const Community = lazy(() => import('./pages/Community'));
const Profile = lazy(() => import('./pages/Profile'));
const EffectDetail = lazy(() => import('./pages/EffectDetail'));
const ApplyEffect = lazy(() => import('./pages/ApplyEffect'));
const PostDetail = lazy(() => import('./pages/PostDetail'));
const UserProfile = lazy(() => import('./pages/UserProfile'));
const ImageLibrary = lazy(() => import('./pages/ImageLibrary'));
const Login = lazy(() => import('./pages/Login'));
const Register = lazy(() => import('./pages/Register'));

function App() {
  return (
    <ErrorBoundary>
      <AppProvider>
        <AuthProvider>
        <Router>
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
            <ErrorBoundary>
              <Navbar />
            </ErrorBoundary>
            <ErrorBoundary>
              <LazyLoadWrapper fallbackMessage="Loading page...">
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
                </Routes>
              </LazyLoadWrapper>
            </ErrorBoundary>
          </div>
        </Router>
        </AuthProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;