import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Bookmark, Share, MoreHorizontal, ChevronLeft, ChevronRight } from 'lucide-react';
import { Post } from '../../types';
import { API_BASE_URL } from '../../config/api';
import { useAuth } from '../../context/AuthContext';
import { useQueryClient } from '@tanstack/react-query';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { dispatch } = useApp();
  const queryClient = useQueryClient();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  
  // 向后兼容：如果post.images不存在但post.image存在，则创建一个单元素数组
  const postImages = post.images || (post.image ? [post.image] : []);
  const effectName = post.effect?.name;

  const handleLike = async () => {
    if (!isAuthenticated) {
      alert('请先登录');
      return;
    }
    // Optimistic update on all cached post lists
    const queries = queryClient.getQueriesData<any>({ queryKey: ['posts'] });
    const previous = queries.map(([key, data]) => [key, data ? JSON.parse(JSON.stringify(data)) : data] as const);
    const toggle = (p: any) => p.id === post.id ? { ...p, isLiked: !p.isLiked, likesCount: (p.likesCount || 0) + (p.isLiked ? -1 : 1) } : p;
    queries.forEach(([key, data]) => {
      if (!data?.posts) return;
      queryClient.setQueryData(key as any, { ...data, posts: data.posts.map(toggle) });
    });
    // Also sync detail cache if exists
    const details = queryClient.getQueriesData<any>({ queryKey: ['post'] });
    const prevDetails = details.map(([key, data]) => [key, data ? JSON.parse(JSON.stringify(data)) : data] as const);
    details.forEach(([key, data]) => {
      if (!data?.post) return;
      if (data.post.id !== post.id) return;
      queryClient.setQueryData(key as any, { ...data, post: toggle(data.post) });
    });
    dispatch({ type: 'LIKE_POST', payload: post.id });
    try {
      const endpoint = post.isLiked ? 'unlike' : 'like';
      await fetch(`${API_BASE_URL}/api/community/posts/${post.id}/${endpoint}`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('cosnap_access_token') || ''}` }
      });
    } catch (e) {
      // rollback
      previous.forEach(([key, data]) => queryClient.setQueryData(key as any, data));
      prevDetails.forEach(([key, data]) => queryClient.setQueryData(key as any, data));
      console.warn('like failed', e);
    }
  };

  const handleBookmark = () => {
    if (!isAuthenticated) { alert('请先登录'); return; }
    dispatch({ type: 'BOOKMARK_POST', payload: post.id });
  };

  const handleCommentsClick = () => {
    try {
      navigate(`/post/${post.id}`);
    } catch (e) {
      console.error('navigate post detail failed', e);
    }
  };

  const handleImageClick = () => {
    navigate(`/post/${post.id}`);
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    if (diffInHours < 48) return 'Yesterday';
    return date.toLocaleDateString();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 pb-2">
        <div className="flex items-center space-x-3">
          <img
            src={post.user?.avatar || `${API_BASE_URL}/assets/placeholder-user.png`}
            alt={post.user?.username || 'user'}
            className="h-10 w-10 rounded-full object-cover"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = `${API_BASE_URL}/assets/placeholder-user.png`;
            }}
          />
          <div>
            <h4 className="font-semibold text-gray-900 dark:text-white text-sm">
              @{post.user?.username || 'anonymous'}
            </h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              {formatDate(post.createdAt)}
            </p>
          </div>
        </div>
        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* Image */}
      <div className="relative">
        <img
          src={postImages[currentImageIndex] || `${API_BASE_URL}/assets/placeholder-image-400x300.png`}
          alt="Post"
          className="w-full h-64 sm:h-80 object-cover cursor-pointer"
          onClick={handleImageClick}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = `${API_BASE_URL}/assets/placeholder-image-400x300.png`;
          }}
        />
        
        {/* Image Navigation for Multiple Images */}
        {postImages.length > 1 && (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                prevImage();
              }}
              className="absolute left-3 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                nextImage();
              }}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 p-2 bg-black/50 text-white rounded-full hover:bg-black/70 transition-colors"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
            
            {/* Image Counter */}
            <div className="absolute top-3 right-3 bg-black/70 text-white px-2 py-1 rounded-lg text-xs">
              {currentImageIndex + 1} / {postImages.length}
            </div>
          </>
        )}
        
        {effectName && (
          <div className="absolute bottom-3 left-3 bg-black/70 text-white px-2 py-1 rounded-lg text-xs">
            {effectName}
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
              <span className="text-sm font-medium">{post.likesCount ?? 0}</span>
            </button>
            
            <button
              onClick={handleCommentsClick}
              className="flex items-center space-x-1 text-gray-700 dark:text-gray-300 hover:text-blue-500 transition-colors"
            >
              <MessageCircle className="h-6 w-6" />
               <span className="text-sm font-medium">{post.commentsCount ?? 0}</span>
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
        <p className="text-gray-900 dark:text-white text-sm mb-2">
          <span className="font-semibold">@{post.user.username}</span>{' '}
          {post.caption}
        </p>

        {/* View All Comments Link */}
        {post.commentsCount > 0 && (
          <button
            onClick={handleCommentsClick}
            className="text-sm text-gray-500 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
          >
            View all {post.commentsCount} comments
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default PostCard;