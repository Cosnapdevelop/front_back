import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Heart, MessageCircle, Bookmark, Share, MoreHorizontal } from 'lucide-react';
import { Post } from '../../types';
import { useApp } from '../../context/AppContext';
import { useNavigate } from 'react-router-dom';

interface PostCardProps {
  post: Post;
}

const PostCard: React.FC<PostCardProps> = ({ post }) => {
  const { dispatch } = useApp();
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(false);

  const handleLike = () => {
    dispatch({ type: 'LIKE_POST', payload: post.id });
  };

  const handleBookmark = () => {
    dispatch({ type: 'BOOKMARK_POST', payload: post.id });
  };

  const handleCommentsClick = () => {
    navigate(`/comments/${post.id}`);
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
        <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors">
          <MoreHorizontal className="h-5 w-5" />
        </button>
      </div>

      {/* Image */}
      <div className="relative">
        <img
          src={post.image}
          alt="Post"
          className="w-full h-64 sm:h-80 object-cover"
        />
        <div className="absolute bottom-3 left-3 bg-black/70 text-white px-2 py-1 rounded-lg text-xs">
          {post.effect.name}
        </div>
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
            
            <button
              onClick={handleCommentsClick}
              className="flex items-center space-x-1 text-gray-700 dark:text-gray-300 hover:text-blue-500 transition-colors"
            >
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
        <p className="text-gray-900 dark:text-white text-sm mb-2">
          <span className="font-semibold">@{post.user.username}</span>{' '}
          {post.caption}
        </p>

        {/* Comments */}
        {showComments && post.comments.length > 0 && (
          <div className="mt-3 space-y-2 border-t border-gray-100 dark:border-gray-700 pt-3">
            {post.comments.map((comment) => (
              <div key={comment.id} className="flex items-start space-x-2">
                <button
                  onClick={() => navigate(`/user/${comment.user.id}`)}
                  className="flex-shrink-0 hover:opacity-80 transition-opacity"
                >
                  <img
                    src={comment.user.avatar}
                    alt={comment.user.username}
                    className="h-6 w-6 rounded-full object-cover cursor-pointer hover:ring-2 hover:ring-purple-500 hover:ring-offset-1 dark:hover:ring-offset-gray-800 transition-all"
                  />
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 dark:text-white">
                    <button
                      onClick={() => navigate(`/user/${comment.user.id}`)}
                      className="font-semibold hover:text-purple-600 dark:hover:text-purple-400 transition-colors"
                    >
                      @{comment.user.username}
                    </button>{' '}
                    {comment.content}
                  </p>
                  <div className="flex items-center space-x-3 mt-1">
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      {formatDate(comment.createdAt)}
                    </span>
                    <button className="text-xs text-gray-500 dark:text-gray-400 hover:text-red-500">
                      {comment.likesCount} likes
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};

export default PostCard;