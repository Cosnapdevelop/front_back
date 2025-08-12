import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ErrorBoundary from './components/ErrorBoundary';
import Navbar from './components/Layout/Navbar';
import Home from './pages/Home';
import Effects from './pages/Effects';
import Community from './pages/Community';
import Profile from './pages/Profile';
import EffectDetail from './pages/EffectDetail';
import ApplyEffect from './pages/ApplyEffect';
import PostDetail from './pages/PostDetail';
import UserProfile from './pages/UserProfile';
import ImageLibrary from './pages/ImageLibrary';

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
              <Routes>
                <Route path="/" element={<Home />} />
                <Route path="/effects" element={<Effects />} />
                <Route path="/community" element={<ProtectedRoute><Community /></ProtectedRoute>} />
                <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
                <Route path="/effect/:id" element={<EffectDetail />} />
                <Route path="/apply/:id" element={<ProtectedRoute><ApplyEffect /></ProtectedRoute>} />
                <Route path="/image-library" element={<ImageLibrary />} />
                <Route path="/post/:postId" element={<PostDetail />} />
                <Route path="/user/:userId" element={<UserProfile />} />
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />
              </Routes>
            </ErrorBoundary>
          </div>
        </Router>
        </AuthProvider>
      </AppProvider>
    </ErrorBoundary>
  );
}

export default App;