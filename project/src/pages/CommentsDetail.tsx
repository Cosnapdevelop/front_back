import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  Heart, 
  MessageCircle, 
  MoreHorizontal,
  Send,
  Reply,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Comment, User } from '../types';

const CommentsDetail = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { state } = useApp();
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMoreComments, setHasMoreComments] = useState(true);

  const post = state.posts.find(p => p.id === postId);

  useEffect(() => {
    // Simulate API call to fetch comments
    const fetchComments = async () => {
      setLoading(true);
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Mock comments data
      const mockComments: Comment[] = [
        {
          id: '1',
          user: {
            id: '1',
            username: 'ai_artist_pro',
            avatar: 'https://images.pexels.com/photos/1264210/pexels-photo-1264210.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
            bio: 'Professional AI artist',
            followersCount: 15420,
            followingCount: 892,
            isFollowing: false,
          },
          content: 'This effect is absolutely stunning! The neon colors are perfect. How did you achieve such vibrant results?',
          createdAt: '2024-01-16T10:30:00Z',
          likesCount: 24,
          isLiked: false,
        },
        {
          id: '2',
          user: {
            id: '2',
            username: 'creative_soul',
            avatar: 'https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
            bio: 'Digital artist',
            followersCount: 8760,
            followingCount: 445,
            isFollowing: true,
          },
          content: 'Amazing work! Could you share the workflow parameters you used? I\'d love to try something similar.',
          createdAt: '2024-01-16T09:15:00Z',
          likesCount: 18,
          isLiked: true,
        },
        {
          id: '3',
          user: {
            id: '3',
            username: 'tech_wizard',
            avatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
            bio: 'AI workflow developer',
            followersCount: 22100,
            followingCount: 156,
            isFollowing: false,
          },
          content: 'The lighting effects are incredible! This is exactly the kind of cyberpunk aesthetic I\'ve been trying to achieve. Thanks for the inspiration! 🔥',
          createdAt: '2024-01-16T08:45:00Z',
          likesCount: 31,
          isLiked: false,
        },
        {
          id: '4',
          user: {
            id: '4',
            username: 'pixel_dreamer',
            avatar: 'https://images.pexels.com/photos/1674752/pexels-photo-1674752.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
            bio: 'Pixel art enthusiast',
            followersCount: 5200,
            followingCount: 320,
            isFollowing: false,
          },
          content: 'Love the color palette! The contrast between the neon and dark tones creates such a dramatic effect.',
          createdAt: '2024-01-16T07:20:00Z',
          likesCount: 12,
          isLiked: false,
        },
      ];
      
      setComments(mockComments);
      setLoading(false);
    };

    fetchComments();
  }, [postId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const handleLikeComment = (commentId: string) => {
    setComments(prev => prev.map(comment => 
      comment.id === commentId 
        ? {
            ...comment,
            isLiked: !comment.isLiked,
            likesCount: comment.isLiked ? comment.likesCount - 1 : comment.likesCount + 1
          }
        : {
            ...comment,
            replies: comment.replies?.map(reply =>
              reply.id === commentId
                ? {
                    ...reply,
                    isLiked: !reply.isLiked,
                    likesCount: reply.isLiked ? reply.likesCount - 1 : reply.likesCount + 1
                  }
                : reply
            )
          }
    ));
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim()) return;
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const comment: Comment = {
      id: Date.now().toString(),
      user: state.user!,
      content: newComment,
      createdAt: new Date().toISOString(),
      likesCount: 0,
      isLiked: false,
      replies: [],
    };
    
    setComments(prev => [comment, ...prev]);
    setNewComment('');
    setReplyingTo(null);
  };

  const handleSubmitReply = async (parentId: string) => {
    if (!replyText.trim()) return;
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const reply: Comment = {
      id: Date.now().toString(),
      user: state.user!,
      content: replyText,
      createdAt: new Date().toISOString(),
      likesCount: 0,
      isLiked: false,
      replies: [],
    };
    
    setComments(prev => prev.map(comment => 
      comment.id === parentId 
        ? { ...comment, replies: [...(comment.replies || []), reply] }
        : comment
    ));
    
    setReplyText('');
    setReplyingTo(null);
  };

  const handleLoadMoreComments = async () => {
    if (loadingMore || !hasMoreComments) return;
    
    setLoadingMore(true);
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock additional comments
    const additionalComments: Comment[] = [
      {
        id: Date.now().toString(),
        user: {
          id: '5',
          username: 'design_master',
          avatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
          bio: 'UI/UX Designer',
          followersCount: 12300,
          followingCount: 567,
          isFollowing: false,
        },
        content: 'The composition and lighting in this piece are absolutely phenomenal! Really inspiring work.',
        createdAt: '2024-01-15T20:30:00Z',
        likesCount: 8,
        isLiked: false,
      },
      {
        id: (Date.now() + 1).toString(),
        user: {
          id: '6',
          username: 'art_enthusiast',
          avatar: 'https://images.pexels.com/photos/1181686/pexels-photo-1181686.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
          bio: 'Art lover',
          followersCount: 3400,
          followingCount: 890,
          isFollowing: true,
        },
        content: 'This is exactly the style I\'ve been trying to achieve! Any tips on the post-processing workflow?',
        createdAt: '2024-01-15T19:45:00Z',
        likesCount: 15,
        isLiked: false,
      },
    ];
    
    setComments(prev => [...prev, ...additionalComments]);
    setLoadingMore(false);
    
    // Simulate that there are no more comments after this load
    setHasMoreComments(false);
  };

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Post not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-16 z-40">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-4">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate(-1)}
                className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-mint-600 dark:hover:text-mint-400 transition-colors"
              >
                <ArrowLeft className="h-5 w-5" />
                <span>Back</span>
              </button>
              <div className="h-6 w-px bg-gray-300 dark:bg-gray-600" />
              <h1 className="text-lg font-semibold text-gray-900 dark:text-white">
                Comments ({comments.length})
              </h1>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Original Post Preview */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
          <div className="p-4">
            <div className="flex items-center space-x-3 mb-4">
              <img
                src={post.user.avatar}
                alt={post.user.username}
                className="h-10 w-10 rounded-full object-cover"
              />
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
                  @{post.user.username}
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {formatDate(post.createdAt)}
                </p>
              </div>
            </div>
            
            <img
              src={post.image}
              alt="Post"
              className="w-full h-48 object-cover rounded-lg mb-3"
            />
            
            <p className="text-gray-900 dark:text-white text-sm">
              <span className="font-semibold">@{post.user.username}</span>{' '}
              {post.caption}
            </p>
          </div>
        </div>

        {/* Comment Input */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex items-start space-x-3">
            <img
              src={state.user?.avatar}
              alt="Your avatar"
              className="h-10 w-10 rounded-full object-cover flex-shrink-0"
            />
            <div className="flex-1">
              <textarea
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                placeholder={replyingTo ? `Reply to comment...` : "Add a comment..."}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              />
              <div className="flex items-center justify-between mt-3">
                {replyingTo && (
                  <button
                    onClick={() => setReplyingTo(null)}
                    className="text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                  >
                    Cancel reply
                  </button>
                )}
                <div className="flex items-center space-x-3 ml-auto">
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    {newComment.length}/500
                  </span>
                  <button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim()}
                    className="flex items-center space-x-2 bg-gradient-to-r from-mint-500 to-cosmic-500 hover:from-mint-600 hover:to-cosmic-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-all"
                  >
                    <Send className="h-4 w-4" />
                    <span>Post</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Comments List */}
        <div className="space-y-4">
          {loading ? (
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4">
                  <div className="animate-pulse">
                    <div className="flex items-start space-x-3">
                      <div className="h-10 w-10 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/4"></div>
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-3/4"></div>
                        <div className="h-4 bg-gray-300 dark:bg-gray-600 rounded w-1/2"></div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <AnimatePresence>
              {comments.map((comment, index) => (
                <motion.div
                  key={comment.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4"
                >
                  <div className="flex items-start space-x-3">
                    <img
                      src={comment.user.avatar}
                      alt={comment.user.username}
                      className="h-10 w-10 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2 mb-1">
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">
                          @{comment.user.username}
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(comment.createdAt)}
                        </span>
                      </div>
                      
                      <p className="text-gray-700 dark:text-gray-300 text-sm mb-3 leading-relaxed">
                        {comment.content}
                      </p>
                      
                      <div className="flex items-center space-x-4">
                        <button
                          onClick={() => handleLikeComment(comment.id)}
                          className={`flex items-center space-x-1 text-xs transition-colors ${
                            comment.isLiked
                              ? 'text-red-500'
                              : 'text-gray-500 dark:text-gray-400 hover:text-red-500'
                          }`}
                        >
                          <Heart className="h-4 w-4" fill={comment.isLiked ? 'currentColor' : 'none'} />
                          <span>{comment.likesCount}</span>
                        </button>
                        
                        <button
                          onClick={() => setReplyingTo(comment.id)}
                          className="flex items-center space-x-1 text-xs text-gray-500 dark:text-gray-400 hover:text-mint-500 transition-colors"
                        >
                          <Reply className="h-4 w-4" />
                          <span>Reply</span>
                        </button>
                        
                        <button className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors">
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Inline Reply Input */}
                  {replyingTo === comment.id && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 ml-13 border-l-2 border-mint-200 dark:border-mint-700 pl-4"
                    >
                      <div className="flex items-start space-x-3">
                        <img
                          src={state.user?.avatar}
                          alt="Your avatar"
                          className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                        />
                        <div className="flex-1">
                          <textarea
                            value={replyText}
                            onChange={(e) => setReplyText(e.target.value)}
                            placeholder={`Reply to @${comment.user.username}...`}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-mint-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none text-sm"
                          />
                          <div className="flex items-center justify-between mt-2">
                            <button
                              onClick={() => {
                                setReplyingTo(null);
                                setReplyText('');
                              }}
                              className="text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
                            >
                              Cancel
                            </button>
                            <div className="flex items-center space-x-3">
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {replyText.length}/500
                              </span>
                              <button
                                onClick={() => handleSubmitReply(comment.id)}
                                disabled={!replyText.trim()}
                                className="flex items-center space-x-1 bg-gradient-to-r from-mint-500 to-cosmic-500 hover:from-mint-600 hover:to-cosmic-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-3 py-1.5 rounded-lg font-medium transition-all text-xs"
                              >
                                <Send className="h-3 w-3" />
                                <span>Reply</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}

                  {/* Replies Display */}
                  {comment.replies && comment.replies.length > 0 && (
                    <div className="mt-4 ml-13 border-l-2 border-gray-200 dark:border-gray-700 pl-4 space-y-3">
                      {comment.replies.map((reply) => (
                        <motion.div
                          key={reply.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3"
                        >
                          <div className="flex items-start space-x-2">
                            <button
                              onClick={() => navigate(`/user/${reply.user.id}`)}
                              className="flex-shrink-0 hover:opacity-80 transition-opacity"
                            >
                              <img
                                src={reply.user.avatar}
                                alt={reply.user.username}
                                className="h-7 w-7 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-purple-500 hover:ring-offset-1 dark:hover:ring-offset-gray-700 transition-all"
                              />
                            </button>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center space-x-2 mb-1">
                                <button
                                  onClick={() => navigate(`/user/${reply.user.id}`)}
                                  className="font-medium text-gray-900 dark:text-white text-xs hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                                >
                                  @{reply.user.username}
                                </button>
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  {formatDate(reply.createdAt)}
                                </span>
                              </div>
                              
                              <p className="text-gray-700 dark:text-gray-300 text-xs leading-relaxed">
                                {reply.content}
                              </p>
                              
                              <div className="flex items-center space-x-3 mt-2">
                                <button
                                  onClick={() => handleLikeComment(reply.id)}
                                  className={`flex items-center space-x-1 text-xs transition-colors ${
                                    reply.isLiked
                                      ? 'text-red-500'
                                      : 'text-gray-500 dark:text-gray-400 hover:text-red-500'
                                  }`}
                                >
                                  <Heart className="h-3 w-3" fill={reply.isLiked ? 'currentColor' : 'none'} />
                                  <span>{reply.likesCount}</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Load More */}
        {!loading && comments.length > 0 && hasMoreComments && (
          <div className="text-center mt-8">
            <button 
              onClick={handleLoadMoreComments}
              disabled={loadingMore}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 px-6 py-3 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loadingMore ? 'Loading...' : 'Load More Comments'}
            </button>
          </div>
        )}

        {/* Empty State */}
        {!loading && comments.length === 0 && (
          <div className="text-center py-12">
            <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <MessageCircle className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              No comments yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400">
              Be the first to share your thoughts!
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CommentsDetail;