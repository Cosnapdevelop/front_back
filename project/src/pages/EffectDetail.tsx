import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Heart, 
  Bookmark, 
  Share, 
  MessageCircle, 
  Play,
  Clock,
  BarChart3,
  User,
  Sparkles,
  Calendar,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { AnimatePresence } from 'framer-motion';

const EffectDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const [showComments, setShowComments] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);

  const effect = state.effects.find(e => e.id === id);

  // Scroll to top when effect changes
  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  }, [id]); // Trigger when effect ID changes

  if (!effect) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Effect not found</p>
        </div>
      </div>
    );
  }

  const handleLike = () => {
    dispatch({ type: 'LIKE_EFFECT', payload: effect.id });
  };

  const handleBookmark = () => {
    dispatch({ type: 'BOOKMARK_EFFECT', payload: effect.id });
  };

  const handleFollow = () => {
    dispatch({ type: 'FOLLOW_USER', payload: effect.author.id });
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Create new comment
      const comment = {
        id: Date.now().toString(),
        user: state.user!,
        content: newComment.trim(),
        createdAt: new Date().toISOString(),
        likesCount: 0,
        isLiked: false,
        replies: [],
      };
      
      // Add comment to the effect
      dispatch({ type: 'ADD_COMMENT', payload: { effectId: effect.id, comment } });
      
      // Clear the input
      setNewComment('');
      
    } catch (error) {
      console.error('Error posting comment:', error);
      alert('Failed to post comment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLikeComment = (commentId: string) => {
    dispatch({ type: 'LIKE_COMMENT', payload: { effectId: effect.id, commentId } });
  };
  const handleApplyEffect = () => {
    navigate(`/apply/${effect.id}`);
  };

  const handleShare = (platform: string) => {
    const url = window.location.href;
    const title = `Check out this amazing AI effect: ${effect.name}`;
    const description = effect.description;
    
    switch (platform) {
      case 'copy':
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
        break;
      case 'whatsapp':
        window.open(`https://wa.me/?text=${encodeURIComponent(`${title} - ${url}`)}`);
        break;
      case 'wechat':
        // WeChat sharing typically requires their SDK, but we can copy link for now
        navigator.clipboard.writeText(url);
        alert('Link copied! You can paste it in WeChat.');
        break;
      case 'instagram':
        // Instagram doesn't support direct URL sharing, so we copy the link
        navigator.clipboard.writeText(url);
        alert('Link copied! You can share it in your Instagram story or bio.');
        break;
      case 'twitter':
        window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(title)}&url=${encodeURIComponent(url)}`);
        break;
      case 'facebook':
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`);
        break;
      case 'linkedin':
        window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`);
        break;
      case 'telegram':
        window.open(`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`);
        break;
      default:
        navigator.clipboard.writeText(url);
        alert('Link copied to clipboard!');
    }
    setShowShareMenu(false);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-16 z-40">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
            >
              <ArrowLeft className="h-5 w-5" />
              <span>Back</span>
            </button>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleLike}
                className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-colors ${
                  effect.isLiked
                    ? 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/30'
                    : 'text-gray-600 hover:text-red-600 hover:bg-red-50 dark:text-gray-400 dark:hover:text-red-400 dark:hover:bg-red-900/30'
                }`}
              >
                <Heart className="h-5 w-5" fill={effect.isLiked ? 'currentColor' : 'none'} />
                <span>{effect.likesCount}</span>
              </button>
              
              <button
                onClick={handleBookmark}
                className={`p-2 rounded-lg transition-colors ${
                  effect.isBookmarked
                    ? 'text-purple-600 bg-purple-50 dark:text-purple-400 dark:bg-purple-900/30'
                    : 'text-gray-600 hover:text-purple-600 hover:bg-purple-50 dark:text-gray-400 dark:hover:text-purple-400 dark:hover:bg-purple-900/30'
                }`}
              >
                <Bookmark className="h-5 w-5" fill={effect.isBookmarked ? 'currentColor' : 'none'} />
              </button>
              
              <div className="relative">
                <button 
                  onClick={() => setShowShareMenu(!showShareMenu)}
                  className="p-2 rounded-lg text-gray-600 hover:text-blue-600 hover:bg-blue-50 dark:text-gray-400 dark:hover:text-blue-400 dark:hover:bg-blue-900/30 transition-colors"
                >
                  <Share className="h-5 w-5" />
                </button>
                
                <AnimatePresence>
                  {showShareMenu && (
                    <>
                      {/* Backdrop */}
                      <div 
                        className="fixed inset-0 z-40"
                        onClick={() => setShowShareMenu(false)}
                      />
                      
                      {/* Share Menu */}
                      <motion.div
                        initial={{ opacity: 0, y: -10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -10, scale: 0.95 }}
                        transition={{ duration: 0.2 }}
                        className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 z-50 overflow-hidden"
                      >
                        <div className="p-3">
                          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
                            Share this effect
                          </h3>
                          <div className="grid grid-cols-2 gap-2">
                            <button
                              onClick={() => handleShare('copy')}
                              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                            >
                              <div className="w-8 h-8 bg-gray-500 rounded-lg flex items-center justify-center">
                                <Copy className="h-4 w-4 text-white" />
                              </div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">Copy Link</span>
                            </button>
                            
                            <button
                              onClick={() => handleShare('whatsapp')}
                              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                            >
                              <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs font-bold">W</span>
                              </div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">WhatsApp</span>
                            </button>
                            
                            <button
                              onClick={() => handleShare('wechat')}
                              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                            >
                              <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs font-bold">微</span>
                              </div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">WeChat</span>
                            </button>
                            
                            <button
                              onClick={() => handleShare('instagram')}
                              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                            >
                              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs font-bold">IG</span>
                              </div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">Instagram</span>
                            </button>
                            
                            <button
                              onClick={() => handleShare('twitter')}
                              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                            >
                              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs font-bold">X</span>
                              </div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">Twitter</span>
                            </button>
                            
                            <button
                              onClick={() => handleShare('facebook')}
                              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                            >
                              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs font-bold">f</span>
                              </div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">Facebook</span>
                            </button>
                            
                            <button
                              onClick={() => handleShare('linkedin')}
                              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                            >
                              <div className="w-8 h-8 bg-blue-700 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs font-bold">in</span>
                              </div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">LinkedIn</span>
                            </button>
                            
                            <button
                              onClick={() => handleShare('telegram')}
                              className="flex items-center space-x-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-left"
                            >
                              <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center">
                                <span className="text-white text-xs font-bold">T</span>
                              </div>
                              <span className="text-sm text-gray-700 dark:text-gray-300">Telegram</span>
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Before/After Images */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-2">
                <div className="relative">
                  <img
                    src={effect.beforeImage}
                    alt="Before"
                    className="w-full h-64 md:h-80 object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                    Before
                  </div>
                </div>
                <div className="relative">
                  <img
                    src={effect.afterImage}
                    alt="After"
                    className="w-full h-64 md:h-80 object-cover"
                  />
                  <div className="absolute top-4 left-4 bg-black/70 text-white px-3 py-1.5 rounded-lg text-sm font-medium">
                    After
                  </div>
                </div>
              </div>
            </div>

            {/* Effect Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-4">
                {effect.name}
              </h1>
              
              <p className="text-gray-600 dark:text-gray-400 text-lg mb-6">
                {effect.description}
              </p>

              {/* Tags */}
              <div className="flex flex-wrap gap-2 mb-6">
                {effect.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1.5 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-sm rounded-full font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>

              {/* Stats */}
              <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4" />
                  <span>{effect.processingTime}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4" />
                  <span className={`px-2 py-1 rounded text-xs font-medium ${getDifficultyColor(effect.difficulty)}`}>
                    {effect.difficulty}
                  </span>
                </div>
                <div className="flex items-center space-x-2">
                  <Heart className="h-4 w-4" />
                  <span>{effect.likesCount} likes</span>
                </div>
              </div>
            </div>

            {/* Author Info */}
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <button
                    onClick={() => navigate(`/user/${effect.author.id}`)}
                    className="flex-shrink-0 hover:opacity-80 transition-opacity"
                  >
                    <img
                      src={effect.author.avatar}
                      alt={effect.author.username}
                      className="h-12 w-12 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-purple-500 hover:ring-offset-2 dark:hover:ring-offset-gray-800 transition-all"
                    />
                  </button>
                  <div>
                    <button
                      onClick={() => navigate(`/user/${effect.author.id}`)}
                      className="font-semibold text-gray-900 dark:text-white hover:text-purple-600 dark:hover:text-purple-400 transition-colors text-left"
                    >
                      @{effect.author.username}
                    </button>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {effect.author.bio}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {effect.author.followersCount} followers
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleFollow}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    effect.author.isFollowing
                      ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                      : 'bg-purple-500 hover:bg-purple-600 text-white'
                  }`}
                >
                  {effect.author.isFollowing ? 'Following' : 'Follow'}
                </button>
              </div>
            </div>

            {/* Comments */}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            <div className="sticky top-32 space-y-6">
              {/* Apply Effect Button */}
              <div className="relative">
                <button
                  onClick={handleApplyEffect}
                  className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 flex items-center justify-center space-x-2"
                >
                  <Play className="h-5 w-5" />
                  <span>Apply Effect</span>
                </button>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 text-xs text-gray-500 dark:text-gray-400 bg-gray-900 dark:bg-gray-700 text-white px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  Apply Effect
                  <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900 dark:border-t-gray-700"></div>
                </div>
              </div>

              {/* Comments */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center">
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Comments
                  </h3>
                  <button
                    onClick={() => setShowComments(!showComments)}
                    className="text-sm text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300"
                  >
                    {showComments ? 'Hide' : 'Show'} Comments
                  </button>
                </div>

                {showComments && (
                  <div className="space-y-4">
                    {/* Comment Input */}
                    <div className="flex items-start space-x-3">
                      <img
                        src={state.user?.avatar}
                        alt="Your avatar"
                        className="h-8 w-8 rounded-full object-cover"
                      />
                      <div className="flex-1">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment..."
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                        />
                        <div className="flex justify-end mt-2">
                          <button 
                            onClick={handleSubmitComment}
                            disabled={!newComment.trim() || isSubmitting}
                            className="bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                          >
                            {isSubmitting ? 'Posting...' : 'Post Comment'}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Sample Comments */}
                    {/* Comments List */}
                    {effect.comments && effect.comments.length > 0 && (
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
                        {effect.comments.map((comment) => (
                          <div key={comment.id} className="flex items-start space-x-3">
                            <img
                              src={comment.user.avatar}
                              alt={comment.user.username}
                              className="h-8 w-8 rounded-full object-cover"
                            />
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="font-medium text-gray-900 dark:text-white text-sm">
                                  @{comment.user.username}
                                </span>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {new Date(comment.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                              <p className="text-gray-700 dark:text-gray-300 text-sm">
                                {comment.content}
                              </p>
                              <div className="flex items-center space-x-3 mt-2">
                                <button
                                  onClick={() => handleLikeComment(comment.id)}
                                  className={`flex items-center space-x-1 text-xs transition-colors ${
                                    comment.isLiked
                                      ? 'text-red-500'
                                      : 'text-gray-500 dark:text-gray-400 hover:text-red-500'
                                  }`}
                                >
                                  <Heart className="h-3 w-3" />
                                  <span>{comment.likesCount}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {/* No Comments State */}
                    {(!effect.comments || effect.comments.length === 0) && (
                      <div className="border-t border-gray-200 dark:border-gray-700 pt-4 text-center">
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          No comments yet. Be the first to share your thoughts!
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Similar Effects */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="font-semibold text-gray-900 dark:text-white mb-4">
                  Similar Effects
                </h3>
                <div className="space-y-3">
                  {state.effects
                    .filter(e => e.id !== effect.id && e.category === effect.category)
                    .slice(0, 3)
                    .map((relatedEffect) => (
                      <button
                        key={relatedEffect.id}
                        onClick={() => {
                          navigate(`/effect/${relatedEffect.id}`);
                          // Scroll to top immediately for better UX
                          setTimeout(() => {
                            window.scrollTo({
                              top: 0,
                              behavior: 'smooth'
                            });
                          }, 100);
                        }}
                        className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                      >
                        <img
                          src={relatedEffect.afterImage}
                          alt={relatedEffect.name}
                          className="h-12 w-12 rounded-lg object-cover"
                        />
                        <div className="flex-1 text-left">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            {relatedEffect.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {relatedEffect.likesCount} likes
                          </p>
                        </div>
                      </button>
                    ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EffectDetail;