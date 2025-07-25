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
import CommentsDetail from './pages/CommentsDetail';
import UserProfile from './pages/UserProfile';

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
            <Route path="/comments/:postId" element={<CommentsDetail />} />
            <Route path="/user/:userId" element={<UserProfile />} />
          </Routes>
        </div>
      </Router>
    </AppProvider>
  );
}

export default App;