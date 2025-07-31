import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Sparkles, Users, User, Bell, Search, Image as ImageIcon } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import NotificationDropdown from './NotificationDropdown';
import { useImageLibrary } from '../../hooks/useImageLibrary';
import { RegionSelector } from '../RegionSelector';

const Navbar = () => {
  const location = useLocation();
  const { state, dispatch } = useApp();
  const { imageCount } = useImageLibrary();

  const navigation = [
    { name: 'Home', href: '/', icon: Home },
    { name: 'Effects', href: '/effects', icon: Sparkles },
    { name: 'Community', href: '/community', icon: Users },
    { name: 'Profile', href: '/profile', icon: User },
  ];

  const isActive = (path: string) => location.pathname === path;

  // Check if current page is a detail page where mobile nav should be hidden
  const isDetailPage = location.pathname.includes('/effect/') || 
                      location.pathname.includes('/apply/') || 
                      location.pathname.includes('/comments/');
  return (
    <nav className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="bg-gradient-to-br from-mint-500 to-cosmic-500 p-2 rounded-xl animate-glow">
              <Sparkles className="h-6 w-6 text-white" />
            </div>
            <span className="text-xl font-bold gradient-text">
              Cosnap
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                    isActive(item.href)
                      ? 'text-mint-600 dark:text-mint-400'
                      : 'text-obsidian-600 dark:text-pearl-300 hover:text-mint-600 dark:hover:text-mint-400'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <Icon className="h-4 w-4" />
                    <span>{item.name}</span>
                  </div>
                  {isActive(item.href) && (
                    <motion.div
                      layoutId="navbar-indicator"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r from-mint-500 to-cosmic-500 rounded-full"
                      initial={false}
                      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Right side actions */}
          <div className="flex items-center space-x-3">
            {/* 地区选择器 - 桌面版 (暂时禁用，全部使用移动版布局) */}
            {/* 
            <div className="hidden lg:block">
              <RegionSelector showDescription={false} />
            </div>
            */}

            {/* Search button removed from here, moved to secondary bar */}
            
            {/* Image Library */}
            <Link 
              to="/image-library"
              className="p-2 text-obsidian-600 dark:text-pearl-300 hover:text-mint-600 dark:hover:text-mint-400 transition-colors rounded-lg hover:bg-mint-50 dark:hover:bg-mint-900/20 relative"
            >
              <ImageIcon className="h-5 w-5" />
              {/* Image count badge */}
              {imageCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-cosmic-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium">
                  {imageCount > 9 ? '9+' : imageCount}
                </span>
              )}
            </Link>
            
            {/* Notification Bell */}
            <div className="relative">
              <button 
                onClick={() => dispatch({ type: 'TOGGLE_NOTIFICATIONS' })}
                className="p-2 text-obsidian-600 dark:text-pearl-300 hover:text-mint-600 dark:hover:text-mint-400 transition-colors rounded-lg hover:bg-mint-50 dark:hover:bg-mint-900/20"
              >
                <Bell className="h-5 w-5" />
                {/* Notification Badge */}
                {state.notifications && state.notifications.length > 0 && (
                  <span className="absolute -top-1 -right-1 bg-sakura-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-medium animate-pulse">
                    {state.notifications.filter(n => !n.read).length > 9 ? '9+' : state.notifications.filter(n => !n.read).length}
                  </span>
                )}
              </button>
              <NotificationDropdown />
            </div>

            {/* User avatar */}
            {state.user && (
              <Link to="/profile" className="flex items-center space-x-2">
                <img
                  src={state.user.avatar}
                  alt={state.user.username}
                  className="h-8 w-8 rounded-full object-cover ring-2 ring-mint-500 ring-offset-2 dark:ring-offset-obsidian-900 hover:ring-cosmic-500 transition-all duration-300"
                />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      {!isDetailPage && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 border-t border-pearl-200 dark:border-obsidian-700 bg-white/95 dark:bg-obsidian-900/95 backdrop-blur-lg z-50 safe-area-inset-bottom">
          <div className="flex justify-around py-3 pb-safe">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  className={`flex flex-col items-center py-1 px-3 text-xs font-medium transition-colors duration-200 ${
                    isActive(item.href)
                      ? 'text-mint-600 dark:text-mint-400'
                      : 'text-obsidian-600 dark:text-pearl-300'
                  }`}
                >
                  <Icon className="h-6 w-6 mb-1" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* 地区选择器 - 移动版集成到搜索按钮旁边 */}
      {!isDetailPage && (
        <div className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-4 py-2">
          <div className="flex justify-between items-center">
            <RegionSelector showDescription={false} />
            <button className="p-2 text-obsidian-600 dark:text-pearl-300 hover:text-mint-600 dark:hover:text-mint-400 transition-colors">
              <Search className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;