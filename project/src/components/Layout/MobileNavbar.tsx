import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Home, 
  Sparkles, 
  Users, 
  User, 
  Bell, 
  Search, 
  Image as ImageIcon,
  ArrowLeft,
  Share2,
  MoreHorizontal,
  Menu,
  X
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { RegionSelector } from '../RegionSelector';

interface MobileNavbarProps {
  title?: string;
  showBack?: boolean;
  showSearch?: boolean;
  showShare?: boolean;
  onBack?: () => void;
  onSearch?: () => void;
  onShare?: () => void;
}

const MobileNavbar: React.FC<MobileNavbarProps> = ({
  title,
  showBack = false,
  showSearch = true,
  showShare = false,
  onBack,
  onSearch,
  onShare
}) => {
  const location = useLocation();
  const { state, dispatch } = useApp();
  const { isAuthenticated } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lastScrollY, setLastScrollY] = useState(0);
  const [isHeaderVisible, setIsHeaderVisible] = useState(true);

  const navigation = [
    { name: '首页', href: '/', icon: Home },
    { name: '特效', href: '/effects', icon: Sparkles },
    { name: '社区', href: '/community', icon: Users },
    { name: '我的', href: '/profile', icon: User },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Auto-hide header on scroll for immersive experience
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      setIsHeaderVisible(currentScrollY < lastScrollY || currentScrollY < 50);
      setLastScrollY(currentScrollY);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [lastScrollY]);

  // Check if current page is a detail page
  const isDetailPage = location.pathname.includes('/effect/') || 
                      location.pathname.includes('/apply/') || 
                      location.pathname.includes('/comments/');

  const handleMenuToggle = () => {
    setIsMenuOpen(!isMenuOpen);
    // Add haptic feedback simulation
    document.body.classList.add('haptic-light');
    setTimeout(() => document.body.classList.remove('haptic-light'), 100);
  };

  return (
    <>
      {/* Top Header */}
      <motion.header
        initial={{ y: 0 }}
        animate={{ y: isHeaderVisible ? 0 : -100 }}
        transition={{ duration: 0.3, ease: 'easeInOut' }}
        className="fixed top-0 left-0 right-0 z-50 bg-white/95 dark:bg-obsidian-900/95 backdrop-blur-lg border-b border-pearl-200 dark:border-obsidian-700"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <div className="flex items-center justify-between h-14 px-4">
          {/* Left Section */}
          <div className="flex items-center space-x-3">
            {showBack ? (
              <button
                onClick={onBack}
                className="flex items-center justify-center w-11 h-11 rounded-full hover:bg-pearl-100 dark:hover:bg-obsidian-800 transition-colors touch-feedback"
              >
                <ArrowLeft className="h-5 w-5 text-obsidian-700 dark:text-pearl-300" />
              </button>
            ) : (
              <button
                onClick={handleMenuToggle}
                className="flex items-center justify-center w-11 h-11 rounded-full hover:bg-pearl-100 dark:hover:bg-obsidian-800 transition-colors touch-feedback"
              >
                <Menu className="h-5 w-5 text-obsidian-700 dark:text-pearl-300" />
              </button>
            )}
          </div>

          {/* Center Title */}
          <div className="flex-1 text-center">
            {title ? (
              <h1 className="text-lg font-semibold text-obsidian-900 dark:text-pearl-100 truncate">
                {title}
              </h1>
            ) : (
              <Link to="/" className="flex items-center justify-center space-x-2">
                <div className="bg-gradient-to-br from-mint-500 to-cosmic-500 p-1.5 rounded-lg">
                  <Sparkles className="h-4 w-4 text-white" />
                </div>
                <span className="text-lg font-bold gradient-text">Cosnap</span>
              </Link>
            )}
          </div>

          {/* Right Section */}
          <div className="flex items-center space-x-2">
            {showSearch && (
              <button
                onClick={onSearch}
                className="flex items-center justify-center w-11 h-11 rounded-full hover:bg-pearl-100 dark:hover:bg-obsidian-800 transition-colors touch-feedback"
              >
                <Search className="h-5 w-5 text-obsidian-700 dark:text-pearl-300" />
              </button>
            )}
            
            {showShare && (
              <button
                onClick={onShare}
                className="flex items-center justify-center w-11 h-11 rounded-full hover:bg-pearl-100 dark:hover:bg-obsidian-800 transition-colors touch-feedback"
              >
                <Share2 className="h-5 w-5 text-obsidian-700 dark:text-pearl-300" />
              </button>
            )}

            <button
              onClick={() => dispatch({ type: 'TOGGLE_NOTIFICATIONS' })}
              className="flex items-center justify-center w-11 h-11 rounded-full hover:bg-pearl-100 dark:hover:bg-obsidian-800 transition-colors touch-feedback relative"
            >
              <Bell className="h-5 w-5 text-obsidian-700 dark:text-pearl-300" />
              {state.notifications && state.notifications.length > 0 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-sakura-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-xs font-medium">
                    {state.notifications.filter(n => !n.read).length > 9 ? '9+' : state.notifications.filter(n => !n.read).length}
                  </span>
                </div>
              )}
            </button>
          </div>
        </div>

        {/* Secondary Header for Search and Region Selector */}
        {!isDetailPage && !title && (
          <div className="border-t border-pearl-100 dark:border-obsidian-800 px-4 py-2">
            <div className="flex items-center justify-between">
              <RegionSelector showDescription={false} />
              <div className="flex items-center space-x-2">
                <Link 
                  to="/image-library"
                  className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-pearl-100 dark:hover:bg-obsidian-800 transition-colors touch-feedback relative"
                >
                  <ImageIcon className="h-5 w-5 text-obsidian-700 dark:text-pearl-300" />
                </Link>
              </div>
            </div>
          </div>
        )}
      </motion.header>

      {/* Bottom Navigation - WeChat Style */}
      {!isDetailPage && (
        <nav 
          className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 dark:bg-obsidian-900/95 backdrop-blur-lg border-t border-pearl-200 dark:border-obsidian-700"
          style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        >
          <div className="flex justify-around py-2">
            {navigation.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className="mobile-nav-item touch-feedback"
                  style={{ minHeight: '60px' }}
                >
                  <motion.div
                    whileTap={{ scale: 0.95 }}
                    className={`flex flex-col items-center ${active ? 'text-mint-600 dark:text-mint-400' : 'text-obsidian-600 dark:text-pearl-400'}`}
                  >
                    <div className="relative mb-1">
                      <Icon className="h-6 w-6" />
                      {active && (
                        <motion.div
                          layoutId="mobile-nav-indicator"
                          className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-1 h-1 bg-mint-500 rounded-full"
                          initial={false}
                          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        />
                      )}
                    </div>
                    <span className="text-xs font-medium">{item.name}</span>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Slide-out Menu - WeChat Style */}
      <AnimatePresence>
        {isMenuOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="fixed inset-0 bg-black/50 z-50"
              onClick={() => setIsMenuOpen(false)}
            />
            
            {/* Menu Panel */}
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 left-0 bottom-0 w-80 bg-white dark:bg-obsidian-900 z-50 shadow-2xl"
              style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
            >
              {/* Menu Header */}
              <div className="flex items-center justify-between p-4 border-b border-pearl-200 dark:border-obsidian-700">
                <div className="flex items-center space-x-3">
                  <div className="bg-gradient-to-br from-mint-500 to-cosmic-500 p-2 rounded-xl">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xl font-bold gradient-text">Cosnap</span>
                </div>
                <button
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-pearl-100 dark:hover:bg-obsidian-800 transition-colors touch-feedback"
                >
                  <X className="h-5 w-5 text-obsidian-700 dark:text-pearl-300" />
                </button>
              </div>

              {/* User Profile Section */}
              {isAuthenticated && (
                <div className="p-4 border-b border-pearl-200 dark:border-obsidian-700">
                  <div className="flex items-center space-x-3">
                    <img
                      src={state.user?.avatar || `${import.meta.env.VITE_API_BASE_URL || 'https://cosnap-back.onrender.com'}/assets/placeholder-user.png`}
                      alt={state.user?.username || 'User'}
                      className="w-12 h-12 rounded-full object-cover ring-2 ring-mint-500"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).src = `${import.meta.env.VITE_API_BASE_URL || 'https://cosnap-back.onrender.com'}/assets/placeholder-user.png`;
                      }}
                    />
                    <div>
                      <h3 className="font-semibold text-obsidian-900 dark:text-pearl-100">
                        {state.user?.username || '用户'}
                      </h3>
                      <p className="text-sm text-obsidian-600 dark:text-pearl-400">
                        {state.user?.email || 'user@example.com'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Menu Items */}
              <div className="p-4 space-y-2">
                {navigation.map((item) => {
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      to={item.href}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center space-x-3 p-3 rounded-lg hover:bg-pearl-100 dark:hover:bg-obsidian-800 transition-colors touch-feedback"
                    >
                      <Icon className="h-5 w-5 text-obsidian-700 dark:text-pearl-300" />
                      <span className="text-obsidian-900 dark:text-pearl-100 font-medium">
                        {item.name}
                      </span>
                    </Link>
                  );
                })}
              </div>

              {/* Additional Menu Items */}
              <div className="p-4 border-t border-pearl-200 dark:border-obsidian-700 space-y-2">
                <Link
                  to="/image-library"
                  onClick={() => setIsMenuOpen(false)}
                  className="flex items-center space-x-3 p-3 rounded-lg hover:bg-pearl-100 dark:hover:bg-obsidian-800 transition-colors touch-feedback"
                >
                  <ImageIcon className="h-5 w-5 text-obsidian-700 dark:text-pearl-300" />
                  <span className="text-obsidian-900 dark:text-pearl-100 font-medium">图片库</span>
                </Link>
                
                <button
                  onClick={() => {
                    dispatch({ type: 'TOGGLE_NOTIFICATIONS' });
                    setIsMenuOpen(false);
                  }}
                  className="w-full flex items-center space-x-3 p-3 rounded-lg hover:bg-pearl-100 dark:hover:bg-obsidian-800 transition-colors touch-feedback"
                >
                  <Bell className="h-5 w-5 text-obsidian-700 dark:text-pearl-300" />
                  <span className="text-obsidian-900 dark:text-pearl-100 font-medium">通知</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Spacer for fixed header */}
      <div style={{ height: isDetailPage ? '56px' : '104px', paddingTop: 'env(safe-area-inset-top, 0px)' }} />
      
      {/* Spacer for fixed bottom navigation */}
      {!isDetailPage && (
        <div style={{ height: '76px', paddingBottom: 'env(safe-area-inset-bottom, 0px)' }} />
      )}
    </>
  );
};

export default MobileNavbar;