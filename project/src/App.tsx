import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
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
    <AppProvider>
      <Router>
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
          <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/effects" element={<Effects />} />
            <Route path="/community" element={<Community />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/effect/:id" element={<EffectDetail />} />
            <Route path="/apply/:id" element={<ApplyEffect />} />
            <Route path="/image-library" element={<ImageLibrary />} />
            <Route path="/post/:postId" element={<PostDetail />} />
            <Route path="/user/:userId" element={<UserProfile />} />
          </Routes>
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;