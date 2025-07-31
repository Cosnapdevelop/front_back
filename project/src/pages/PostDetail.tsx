import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  Heart, 
  MessageCircle, 
  Bookmark, 
  Share, 
  ArrowLeft, 
  Send, 
  MoreHorizontal,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { Post, Comment, User } from '../types';

const PostDetail = () => {
  const { postId } = useParams<{ postId: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const [post, setPost] = useState<Post | null>(null);
  const [newComment, setNewComment] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [showImageModal, setShowImageModal] = useState(false);
  const [modalImageIndex, setModalImageIndex] = useState(0);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyContent, setReplyContent] = useState('');
  
  // 向后兼容：如果post.images不存在但post.image存在，则创建一个单元素数组
  const postImages = post?.images || (post?.image ? [post.image] : []);

  useEffect(() => {
    if (postId) {
      const foundPost = state.posts.find(p => p.id === postId);
      if (foundPost) {
        // 保留本地的评论，只更新其他属性
        setPost(prevPost => {
          if (prevPost && prevPost.comments.length > foundPost.comments.length) {
            // 如果本地有更多评论，保留本地评论
            return {
              ...foundPost,
              comments: prevPost.comments,
              commentsCount: prevPost.commentsCount
            };
          }
          return foundPost;
        });
      } else {
        setPost(null);
      }
    }
  }, [postId, state.posts]);

  if (!post) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Post not found
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            The post you're looking for doesn't exist or has been removed.
          </p>
          <button
            onClick={() => navigate('/community')}
            className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
          >
            Back to Community
          </button>
        </div>
      </div>
    );
  }

  const handleLike = () => {
    dispatch({ type: 'LIKE_POST', payload: post.id });
    // 不需要手动更新本地状态，useEffect 会自动同步
  };

  const handleBookmark = () => {
    dispatch({ type: 'BOOKMARK_POST', payload: post.id });
    // 不需要手动更新本地状态，useEffect 会自动同步
  };

  const handleSubmitComment = async () => {
    if (!newComment.trim() || !state.user) return;
    
    setIsSubmitting(true);
    
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const comment: Comment = {
        id: Date.now().toString(),
        user: state.user as User, // UserProfile extends User
        content: newComment.trim(),
        createdAt: new Date().toISOString(),
        likesCount: 0,
        isLiked: false,
        replies: [],
      };
      
      // 暂时只更新本地状态，稍后会添加全局状态同步
      setPost(prev => prev ? {
        ...prev,
        comments: [...prev.comments, comment],
        commentsCount: prev.commentsCount + 1
      } : null);
      
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCommentLike = (commentId: string) => {
    setPost(prev => {
      if (!prev) return null;
      
      const updateCommentLike = (comments: any[]): any[] => {
        return comments.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              isLiked: !comment.isLiked,
              likesCount: comment.isLiked ? comment.likesCount - 1 : comment.likesCount + 1
            };
          }
          if (comment.replies && comment.replies.length > 0) {
            return {
              ...comment,
              replies: updateCommentLike(comment.replies)
            };
          }
          return comment;
        });
      };
      
      return {
        ...prev,
        comments: updateCommentLike(prev.comments)
      };
    });
  };

  const handleReply = async (commentId: string) => {
    if (!replyContent.trim() || !state.user) return;
    
    const reply = {
      id: Date.now().toString(),
      user: state.user,
      content: replyContent.trim(),
      createdAt: new Date().toISOString(),
      likesCount: 0,
      isLiked: false,
      replies: [],
    };
    
    setPost(prev => {
      if (!prev) return null;
      
      const addReplyToComment = (comments: any[]): any[] => {
        return comments.map(comment => {
          if (comment.id === commentId) {
            return {
              ...comment,
              replies: [...(comment.replies || []), reply]
            };
          }
          return comment;
        });
      };
      
      return {
        ...prev,
        comments: addReplyToComment(prev.comments)
      };
    });
    
    setReplyingTo(null);
    setReplyContent('');
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  const nextImage = () => {
    if (postImages.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % postImages.length);
    }
  };

  const prevImage = () => {
    if (postImages.length > 0) {
      setCurrentImageIndex((prev) => (prev - 1 + postImages.length) % postImages.length);
    }
  };

  const openImageModal = (index: number) => {
    setModalImageIndex(index);
    setShowImageModal(true);
  };

  const closeImageModal = () => {
    setShowImageModal(false);
  };

  const nextModalImage = () => {
    if (postImages.length > 0) {
      setModalImageIndex((prev) => (prev + 1) % postImages.length);
    }
  };

  const prevModalImage = () => {
    if (postImages.length > 0) {
      setModalImageIndex((prev) => (prev - 1 + postImages.length) % postImages.length);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate('/community')}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back to Community</span>
          </button>
          
          <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
            <MoreHorizontal className="h-5 w-5" />
          </button>
        </div>

        {/* Post Content */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {/* User Info */}
          <div className="flex items-center justify-between p-4 pb-2">
            <div className="flex items-center space-x-3">
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
          </div>

          {/* Images */}
          <div className="relative">
            {/* Main Image */}
            <div className="relative">
              <img
                src={postImages[currentImageIndex] || 'https://via.placeholder.com/400x300?text=No+Image'}
                alt={`Post ${currentImageIndex + 1}`}
                className="w-full h-96 sm:h-[500px] object-cover cursor-pointer"
                onClick={() => openImageModal(currentImageIndex)}
              />
              
              {/* Image Navigation */}
              {postImages.length > 1 && (
                <>
                  <button
                    onClick={prevImage}
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={nextImage}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  
                  {/* Image Counter */}
                  <div className="absolute top-3 right-3 bg-black/70 text-white px-2 py-1 rounded-lg text-xs">
                    {currentImageIndex + 1} / {postImages.length}
                  </div>
                </>
              )}
              
              {/* Effect Badge */}
              <div className="absolute bottom-3 left-3 bg-black/70 text-white px-2 py-1 rounded-lg text-xs">
                {post.effect.name}
              </div>
            </div>

            {/* Image Thumbnails */}
            {postImages.length > 1 && (
              <div className="flex space-x-2 p-4 bg-gray-50 dark:bg-gray-700">
                {postImages.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setCurrentImageIndex(index)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                      index === currentImageIndex
                        ? 'border-purple-500'
                        : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                    }`}
                  >
                    <img
                      src={image}
                      alt={`Thumbnail ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-4">
                <button
                  onClick={handleLike}
                  className={`flex items-center space-x-1 transition-colors ${
                    post.isLiked
                      ? 'text-red-500'
                      : 'text-gray-700 dark:text-gray-300 hover:text-red-500'
                  }`}
                >
                  <Heart className="h-6 w-6" fill={post.isLiked ? 'currentColor' : 'none'} />
                  <span className="text-sm font-medium">{post.likesCount}</span>
                </button>
                
                <button className="flex items-center space-x-1 text-gray-700 dark:text-gray-300 hover:text-blue-500 transition-colors">
                  <MessageCircle className="h-6 w-6" />
                  <span className="text-sm font-medium">{post.commentsCount}</span>
                </button>
                
                <button className="text-gray-700 dark:text-gray-300 hover:text-green-500 transition-colors">
                  <Share className="h-6 w-6" />
                </button>
              </div>
              
              <button
                onClick={handleBookmark}
                className={`transition-colors ${
                  post.isBookmarked
                    ? 'text-purple-500'
                    : 'text-gray-700 dark:text-gray-300 hover:text-purple-500'
                }`}
              >
                <Bookmark className="h-6 w-6" fill={post.isBookmarked ? 'currentColor' : 'none'} />
              </button>
            </div>

            {/* Caption */}
            <p className="text-gray-900 dark:text-white text-sm mb-4">
              <span className="font-semibold">@{post.user.username}</span>{' '}
              {post.caption}
            </p>
          </div>
        </div>

        {/* Comments Section */}
        <div className="mt-6 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Comments ({post.commentsCount})
            </h3>
          </div>

          {/* Add Comment */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex space-x-3">
              <img
                src={state.user?.avatar || '/default-avatar.png'}
                alt="Your avatar"
                className="h-8 w-8 rounded-full object-cover flex-shrink-0"
              />
              <div className="flex-1">
                <textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Add a comment..."
                  rows={2}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                />
                <div className="flex justify-end mt-2">
                  <button
                    onClick={handleSubmitComment}
                    disabled={!newComment.trim() || isSubmitting}
                    className="flex items-center space-x-2 bg-purple-500 hover:bg-purple-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg font-medium transition-colors"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Posting...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Post</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Comments List */}
          <div className="max-h-96 overflow-y-auto">
            {post.comments.length > 0 ? (
              <div className="p-4 space-y-4">
                {post.comments.map((comment) => (
                  <div key={comment.id} className="flex space-x-3">
                    <img
                      src={comment.user.avatar}
                      alt={comment.user.username}
                      className="h-8 w-8 rounded-full object-cover flex-shrink-0"
                    />
                    <div className="flex-1">
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                        <p className="text-sm text-gray-900 dark:text-white">
                          <span className="font-semibold">@{comment.user.username}</span>{' '}
                          {comment.content}
                        </p>
                      </div>
                      <div className="flex items-center space-x-4 mt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {formatDate(comment.createdAt)}
                        </span>
                        <button 
                          onClick={() => handleCommentLike(comment.id)}
                          className={`text-xs ${comment.isLiked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'} hover:text-red-500`}
                        >
                          {comment.isLiked ? '❤️' : '🤍'} {comment.likesCount > 0 && comment.likesCount}
                        </button>
                        <button 
                          onClick={() => setReplyingTo(comment.id)}
                          className="text-xs text-gray-500 dark:text-gray-400 hover:text-blue-500"
                        >
                          Reply
                        </button>
                      </div>
                      
                      {/* Reply Input */}
                      {replyingTo === comment.id && (
                        <div className="mt-3 flex space-x-2">
                          <input
                            type="text"
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            placeholder="Write a reply..."
                            className="flex-1 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                handleReply(comment.id);
                              }
                            }}
                          />
                          <button
                            onClick={() => handleReply(comment.id)}
                            className="px-3 py-2 bg-purple-500 hover:bg-purple-600 text-white text-sm rounded-lg transition-colors"
                          >
                            Send
                          </button>
                          <button
                            onClick={() => {
                              setReplyingTo(null);
                              setReplyContent('');
                            }}
                            className="px-3 py-2 text-gray-500 hover:text-gray-700 text-sm"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                      
                      {/* Replies */}
                      {comment.replies && comment.replies.length > 0 && (
                        <div className="mt-3 ml-10 space-y-3">
                          {comment.replies.map((reply) => (
                            <div key={reply.id} className="flex space-x-2">
                              <img
                                src={reply.user.avatar}
                                alt={reply.user.username}
                                className="h-6 w-6 rounded-full object-cover flex-shrink-0"
                              />
                              <div className="flex-1">
                                <div className="bg-gray-100 dark:bg-gray-600 rounded-lg p-2">
                                  <p className="text-xs text-gray-900 dark:text-white">
                                    <span className="font-semibold">@{reply.user.username}</span>{' '}
                                    {reply.content}
                                  </p>
                                </div>
                                <div className="flex items-center space-x-3 mt-1">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    {formatDate(reply.createdAt)}
                                  </span>
                                  <button 
                                    onClick={() => handleCommentLike(reply.id)}
                                    className={`text-xs ${reply.isLiked ? 'text-red-500' : 'text-gray-500 dark:text-gray-400'} hover:text-red-500`}
                                  >
                                    {reply.isLiked ? '❤️' : '🤍'} {reply.likesCount > 0 && reply.likesCount}
                                  </button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center">
                <p className="text-gray-500 dark:text-gray-400">
                  No comments yet. Be the first to comment!
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Image Modal */}
      <AnimatePresence>
        {showImageModal && (
          <>
            <div 
              className="fixed inset-0 bg-black/90 z-50"
              onClick={closeImageModal}
            />
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div className="relative max-w-4xl max-h-full">
                <button
                  onClick={closeImageModal}
                  className="absolute top-4 right-4 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors z-10"
                >
                  <X className="h-6 w-6" />
                </button>
                
                <img
                  src={postImages[modalImageIndex] || 'https://via.placeholder.com/400x300?text=No+Image'}
                  alt={`Full size ${modalImageIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                  onClick={(e) => e.stopPropagation()}
                />
                
                {postImages.length > 1 && (
                  <>
                    <button
                      onClick={prevModalImage}
                      className="absolute left-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                    >
                      <ChevronLeft className="h-6 w-6" />
                    </button>
                    <button
                      onClick={nextModalImage}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
                    >
                      <ChevronRight className="h-6 w-6" />
                    </button>
                    
                    <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black/70 text-white px-3 py-1 rounded-lg text-sm">
                      {modalImageIndex + 1} / {postImages.length}
                    </div>
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PostDetail; 