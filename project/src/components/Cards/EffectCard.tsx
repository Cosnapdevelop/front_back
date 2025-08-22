import React from 'react';
import { motion } from 'framer-motion';
import { Heart, Bookmark, Clock, BarChart3, Eye } from 'lucide-react';
import { Effect } from '../../types';
import { useApp } from '../../context/AppContext';
import { Link, useNavigate } from 'react-router-dom';
import { trackFeatureUsage, trackEngagement } from '../../utils/analytics';

interface EffectCardProps {
  effect: Effect;
  onClick?: () => void;
}

const EffectCard: React.FC<EffectCardProps> = ({ effect, onClick }) => {
  const { dispatch } = useApp();
  const navigate = useNavigate();

  const handleLike = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch({ type: 'LIKE_EFFECT', payload: effect.id });
    trackEngagement('effect_like');
    trackFeatureUsage('effect_interaction', 'clicked');
  };

  const handleBookmark = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dispatch({ type: 'BOOKMARK_EFFECT', payload: effect.id });
    trackEngagement('effect_bookmark');
    trackFeatureUsage('effect_interaction', 'clicked');
  };

  const handleView = () => {
    dispatch({ type: 'VIEW_EFFECT', payload: effect });
    // Track effect view
    trackFeatureUsage('effect_card', 'clicked');
    trackEngagement('effect_view');
    
    // Scroll to top when navigating to effect detail
    setTimeout(() => {
      window.scrollTo({
        top: 0,
        behavior: 'smooth'
      });
    }, 100);
    onClick?.();
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'Easy': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      case 'Medium': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
      case 'Hard': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/30';
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4 }}
      whileTap={{ scale: 0.98 }}
      className="group cursor-pointer"
      onClick={handleView}
    >
      <Link to={`/effect/${effect.id}`} className="block">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm hover:shadow-lg transition-all duration-300 overflow-hidden border border-gray-200 dark:border-gray-700">
          {/* Image Section */}
          <div className="relative overflow-hidden">
            <div className="grid grid-cols-2 gap-0">
              <div className="relative">
                <img
                  src={effect.beforeImage}
                  alt="Before"
                  className="w-full h-32 sm:h-40 object-cover"
                />
                <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  Before
                </div>
              </div>
              <div className="relative">
                <img
                  src={effect.afterImage}
                  alt="After"
                  className="w-full h-32 sm:h-40 object-cover"
                />
                <div className="absolute top-2 left-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                  After
                </div>
              </div>
            </div>
            
            {/* Overlay on hover */}
            <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center">
              <div className="flex items-center space-x-2 text-white">
                <Eye className="h-5 w-5" />
                <span className="text-sm font-medium">View Effect</span>
              </div>
            </div>
          </div>

          {/* Content Section */}
          <div className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-semibold text-gray-900 dark:text-white text-sm sm:text-base line-clamp-2 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                {effect.name}
              </h3>
              <div className="flex items-center space-x-1 ml-2">
                <button
                  onClick={handleBookmark}
                  className={`p-1.5 rounded-lg transition-colors ${
                    effect.isBookmarked
                      ? 'text-purple-600 bg-purple-100 dark:text-purple-400 dark:bg-purple-900/30'
                      : 'text-gray-400 hover:text-purple-600 hover:bg-purple-50 dark:hover:text-purple-400 dark:hover:bg-purple-900/30'
                  }`}
                >
                  <Bookmark className="h-4 w-4" fill={effect.isBookmarked ? 'currentColor' : 'none'} />
                </button>
              </div>
            </div>

            {/* Author */}
            <div className="flex items-center space-x-2 mb-3">
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(`/user/${effect.author.id}`);
                  // Scroll to top when navigating to user profile
                  setTimeout(() => {
                    window.scrollTo({
                      top: 0,
                      behavior: 'smooth'
                    });
                  }, 100);
                }}
                className="flex-shrink-0 hover:opacity-80 transition-opacity"
              >
                <img
                  src={effect.author.avatar}
                  alt={effect.author.username}
                  className="h-6 w-6 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-purple-500 hover:ring-offset-1 dark:hover:ring-offset-gray-800 transition-all"
                />
              </button>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  navigate(`/user/${effect.author.id}`);
                  // Scroll to top when navigating to user profile
                  setTimeout(() => {
                    window.scrollTo({
                      top: 0,
                      behavior: 'smooth'
                    });
                  }, 100);
                }}
                className="text-xs text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
              >
                @{effect.author.username}
              </button>
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
              {effect.description}
            </p>

            {/* Tags */}
            <div className="flex flex-wrap gap-1 mb-3">
              {effect.tags.slice(0, 3).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 text-xs rounded-full"
                >
                  #{tag}
                </span>
              ))}
              {effect.tags.length > 3 && (
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  +{effect.tags.length - 3} more
                </span>
              )}
            </div>

            {/* Stats and Info */}
            <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 mb-3">
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-1">
                  <Clock className="h-3 w-3" />
                  <span>{effect.processingTime}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <BarChart3 className="h-3 w-3" />
                  <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getDifficultyColor(effect.difficulty)}`}>
                    {effect.difficulty}
                  </span>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between">
              <button
                onClick={handleLike}
                className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  effect.isLiked
                    ? 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30'
                    : 'text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/30'
                }`}
              >
                <Heart className="h-4 w-4" fill={effect.isLiked ? 'currentColor' : 'none'} />
                <span>{effect.likesCount}</span>
              </button>

              <span className="text-xs text-gray-500 dark:text-gray-400">
                {effect.category}
              </span>
            </div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
};

export default EffectCard;