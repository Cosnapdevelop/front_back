import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, TrendingUp, Clock, Users, X, Upload, Image as ImageIcon, Send, Camera, Trash2 } from 'lucide-react';
import { useApp } from '../context/AppContext';
import PostCard from '../components/Cards/PostCard';

const Community = () => {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<'trending' | 'recent' | 'following'>('trending');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedEffect, setSelectedEffect] = useState<string>('');
  const [postCaption, setPostCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const tabs = [
    { id: 'trending', label: 'Trending', icon: TrendingUp },
    { id: 'recent', label: 'Recent', icon: Clock },
    { id: 'following', label: 'Following', icon: Users },
  ];

  const getFilteredPosts = () => {
    switch (activeTab) {
      case 'trending':
        return [...state.posts].sort((a, b) => b.likesCount - a.likesCount);
      case 'recent':
        return [...state.posts].sort((a, b) => 
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
      case 'following':
        return state.posts.filter(post => post.user.isFollowing);
      default:
        return state.posts;
    }
  };

  const filteredPosts = getFilteredPosts();

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    // Limit to 5 images
    const maxImages = 5;
    const filesToProcess = files.slice(0, maxImages - selectedImages.length);

    filesToProcess.forEach(file => {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImages(prev => [...prev, e.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreatePost = async () => {
    if (selectedImages.length === 0 || !postCaption.trim() || !selectedEffect) return;
    
    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Find the selected effect
      const effect = state.effects.find(e => e.id === selectedEffect);
      if (!effect || !state.user) return;
      
      // Create new post
      const newPost = {
        id: Date.now().toString(),
        user: state.user,
        effect: effect,
        images: selectedImages,
        caption: postCaption,
        likesCount: 0,
        commentsCount: 0,
        isLiked: false,
        isBookmarked: false,
        createdAt: new Date().toISOString(),
        comments: [],
      };
      
      // Add post to state (you would normally send this to your backend)
      // For now, we'll just log it and show success
      console.log('Creating post:', newPost);
      
      // Add the post to the app state
      dispatch({ type: 'ADD_POST', payload: newPost });
      
      // Reset form and close modal
      setSelectedImages([]);
      setPostCaption('');
      setSelectedEffect('');
      setShowCreateModal(false);
      
      // Show success message (you could use a toast notification here)
      alert('Post created successfully!');
      
    } catch (error) {
      console.error('Error creating post:', error);
      alert('Failed to create post. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setSelectedImages([]);
    setPostCaption('');
    setSelectedEffect('');
    setShowCreateModal(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              Community
            </h1>
            <p className="text-gray-600 dark:text-gray-400">
              Share your creations and discover amazing work from other artists
            </p>
          </div>
          
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Create Post</span>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex space-x-1 bg-white dark:bg-gray-800 rounded-lg p-1 mb-8 border border-gray-200 dark:border-gray-700">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center space-x-2 px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 flex-1 justify-center ${
                  activeTab === tab.id
                    ? 'bg-purple-500 text-white shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Posts */}
        <div className="space-y-6">
          {filteredPosts.map((post, index) => (
            <motion.div
              key={post.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <PostCard post={post} />
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {filteredPosts.length === 0 && (
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              No posts yet
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {activeTab === 'following' 
                ? 'Follow some creators to see their posts here'
                : 'Be the first to share your amazing creations!'
              }
            </p>
            <button className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold transition-colors">
              {activeTab === 'following' ? 'Discover Creators' : 'Create Your First Post'}
            </button>
          </div>
        )}

        {/* Load More */}
      </div>

      {/* Create Post Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <>
            {/* Backdrop */}
            <div 
              className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
              onClick={resetCreateForm}
            />
            
            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
            >
              <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
                  <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                    <Camera className="h-6 w-6 mr-2 text-purple-500" />
                    Share Your Creation
                  </h2>
                  <button
                    onClick={resetCreateForm}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[calc(90vh-140px)] overflow-y-auto">
                  <div className="space-y-6">
                    {/* Image Upload */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Upload Your Images ({selectedImages.length}/5)
                      </label>
                      
                      {/* Selected Images */}
                      {selectedImages.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                          {selectedImages.map((image, index) => (
                            <div key={index} className="relative group">
                              <img
                                src={image}
                                alt={`Selected ${index + 1}`}
                                className="w-full h-24 object-cover rounded-lg"
                              />
                              <button
                                onClick={() => removeImage(index)}
                                className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Upload Area */}
                      {selectedImages.length < 5 && (
                        <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-8 text-center hover:border-purple-500 dark:hover:border-purple-400 transition-colors cursor-pointer">
                          <input
                            type="file"
                            accept="image/*"
                            multiple
                            onChange={handleImageUpload}
                            className="hidden"
                            id="image-upload"
                          />
                          <label htmlFor="image-upload" className="cursor-pointer">
                            <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                            <p className="text-gray-600 dark:text-gray-400 font-medium mb-1">
                              Click to upload your creations
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-500">
                              PNG, JPG, WebP up to 10MB (max 5 images)
                            </p>
                          </label>
                        </div>
                      )}
                    </div>

                    {/* Effect Selection */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Which Effect Did You Use?
                      </label>
                      <select
                        value={selectedEffect}
                        onChange={(e) => setSelectedEffect(e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      >
                        <option value="">Select an effect...</option>
                        {state.effects.map((effect) => (
                          <option key={effect.id} value={effect.id}>
                            {effect.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Caption */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                        Share Your Experience
                      </label>
                      <textarea
                        value={postCaption}
                        onChange={(e) => setPostCaption(e.target.value)}
                        placeholder="Tell the community about your creation process, what you learned, or any tips you'd like to share..."
                        rows={4}
                        maxLength={500}
                        className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                      />
                      <div className="flex justify-between items-center mt-2">
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          Share your creative process, tips, or inspiration
                        </p>
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {postCaption.length}/500
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                  <button
                    onClick={resetCreateForm}
                    className="px-6 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreatePost}
                    disabled={selectedImages.length === 0 || !postCaption.trim() || !selectedEffect || isSubmitting}
                    className="flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2 rounded-lg font-semibold transition-all duration-300"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Sharing...</span>
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4" />
                        <span>Share Creation</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Community;