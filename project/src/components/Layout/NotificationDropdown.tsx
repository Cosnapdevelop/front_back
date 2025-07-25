import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Heart, 
  MessageCircle, 
  UserPlus, 
  Sparkles,
  X,
  Check,
  Trash2
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Notification } from '../../types';
import { useNavigate } from 'react-router-dom';

const NotificationDropdown: React.FC = () => {
  const { state, dispatch } = useApp();
  const navigate = useNavigate();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'like':
        return <Heart className="h-4 w-4 text-sakura-500" />;
      case 'reply':
        return <MessageCircle className="h-4 w-4 text-cosmic-500" />;
      case 'follow':
        return <UserPlus className="h-4 w-4 text-mint-500" />;
      case 'effect_shared':
        return <Sparkles className="h-4 w-4 text-neon-500" />;
      default:
        return <Bell className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)}h ago`;
    return `${Math.floor(diffInMinutes / 1440)}d ago`;
  };

  const handleNotificationClick = (notification: Notification) => {
    // Mark as read
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: notification.id });
    
    // Navigate to the relevant page
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
    }
    
    // Close dropdown
    dispatch({ type: 'TOGGLE_NOTIFICATIONS' });
  };

  const markAllAsRead = () => {
    state.notifications.forEach(notification => {
      if (!notification.read) {
        dispatch({ type: 'MARK_NOTIFICATION_READ', payload: notification.id });
      }
    });
  };

  const clearAllNotifications = () => {
    dispatch({ type: 'CLEAR_NOTIFICATIONS' });
  };

  const unreadCount = state.notifications.filter(n => !n.read).length;

  return (
    <AnimatePresence>
      {state.showNotifications && (
        <>
          {/* Backdrop */}
          <div 
            className="fixed inset-0 z-40"
            onClick={() => dispatch({ type: 'TOGGLE_NOTIFICATIONS' })}
          />
          
          {/* Dropdown */}
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 max-h-96 overflow-hidden"
          >
            {/* Header */}
            <div className="p-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  Notifications
                  {unreadCount > 0 && (
                    <span className="ml-2 bg-sakura-500 text-white text-xs rounded-full px-2 py-1">
                      {unreadCount}
                    </span>
                  )}
                </h3>
                <div className="flex items-center space-x-2">
                  {unreadCount > 0 && (
                    <button
                      onClick={markAllAsRead}
                      className="text-xs text-mint-600 dark:text-mint-400 hover:text-mint-700 dark:hover:text-mint-300 flex items-center space-x-1"
                    >
                      <Check className="h-3 w-3" />
                      <span>Mark all read</span>
                    </button>
                  )}
                  {state.notifications.length > 0 && (
                    <button
                      onClick={clearAllNotifications}
                      className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 flex items-center space-x-1"
                    >
                      <Trash2 className="h-3 w-3" />
                      <span>Clear</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {state.notifications.length === 0 ? (
                <div className="p-8 text-center">
                  <Bell className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 dark:text-gray-400 text-sm">
                    No notifications yet
                  </p>
                  <p className="text-gray-500 dark:text-gray-500 text-xs mt-1">
                    We'll notify you when there's something new!
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200 dark:divide-gray-700">
                  {state.notifications.map((notification) => (
                    <motion.button
                      key={notification.id}
                      onClick={() => handleNotificationClick(notification)}
                      className={`w-full p-4 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors ${
                        !notification.read ? 'bg-mint-50 dark:bg-mint-900/20' : ''
                      }`}
                      whileHover={{ x: 2 }}
                    >
                      <div className="flex items-start space-x-3">
                        <div className="flex-shrink-0 mt-1">
                          {getNotificationIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center space-x-2 mb-1">
                            <img
                              src={notification.user.avatar}
                              alt={notification.user.username}
                              className="h-5 w-5 rounded-full object-cover"
                            />
                            <span className="text-xs font-medium text-gray-900 dark:text-white">
                              @{notification.user.username}
                            </span>
                            {!notification.read && (
                              <div className="w-2 h-2 bg-sakura-500 rounded-full"></div>
                            )}
                          </div>
                          <p className="text-sm text-gray-900 dark:text-white font-medium mb-1">
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            {formatTimeAgo(notification.createdAt)}
                          </p>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Footer */}
            {state.notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                <button className="w-full text-center text-sm text-mint-600 dark:text-mint-400 hover:text-mint-700 dark:hover:text-mint-300 font-medium">
                  View All Notifications
                </button>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default NotificationDropdown;