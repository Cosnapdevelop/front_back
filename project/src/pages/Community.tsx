import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, TrendingUp, Clock, Users, X, Upload, Image as ImageIcon, Send, Camera, Trash2, Move, Eye, GripVertical, ZoomIn } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { useAuth } from '../context/AuthContext';
import PostCard from '../components/Cards/PostCard';
import { API_BASE_URL } from '../config/api';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '../context/ToastContext';

const Community = () => {
  const { state, dispatch } = useApp();
  const { push } = useToast();
  const { isAuthenticated } = useAuth();
  const [activeTab, setActiveTab] = useState<'trending' | 'recent' | 'following'>('trending');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedImages, setSelectedImages] = useState<string[]>([]);
  const [selectedEffect, setSelectedEffect] = useState<string>('');
  const [postCaption, setPostCaption] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

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

  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const limit = 10;
  const { data, isLoading } = useQuery({
    queryKey: ['posts', { page, limit }],
    queryFn: async () => {
      const res = await fetch(`${API_BASE_URL}/api/community/posts?page=${page}&limit=${limit}`);
      return res.json();
    }
  });
  const remotePosts = data?.posts || [];
  const filteredPosts = remotePosts.length > 0 ? remotePosts : getFilteredPosts();

  const presign = async (ext: string) => {
    const res = await fetch(`${API_BASE_URL}/api/effects/upload/presign`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('cosnap_access_token') || ''}`
      },
      body: JSON.stringify({ ext, dir: 'cosnap/community' })
    });
    return res.json();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const maxImages = 5;
    const filesToProcess = files.slice(0, maxImages - selectedImages.length);

    for (const file of filesToProcess) {
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
      const presignResp = await presign(ext);
      if (presignResp.success && presignResp.provider === 'aliyun-oss') {
        const formData = new FormData();
        // 注意：OSS 表单键值必须先附加 policy 相关字段，再附加 file
        Object.entries(presignResp.form).forEach(([k, v]) => formData.append(k, v as string));
        if (!formData.has('key')) formData.append('key', presignResp.form.key);
        formData.append('file', file);
        const resp = await fetch(presignResp.uploadUrl, { method: 'POST', body: formData });
        if (!resp.ok) {
          console.error('OSS upload failed', await resp.text());
          push('error','图片直传失败，请稍后重试');
          continue;
        }
        setSelectedImages(prev => [...prev, presignResp.publicUrl]);
      } else if (presignResp.success && presignResp.provider === 'mock') {
        setSelectedImages(prev => [...prev, presignResp.publicUrl]);
      }
    }
  };

  const removeImage = (index: number) => {
    setSelectedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreatePost = async () => {
    if (selectedImages.length === 0 || !postCaption.trim() || !selectedEffect) return;
    
    setIsSubmitting(true);
    
    try {
      if (!isAuthenticated) { push('warning','请先登录'); setIsSubmitting(false); return; }
      const effect = state.effects.find(e => e.id === selectedEffect);
      if (!effect || !state.user) { setIsSubmitting(false); return; }

      const res = await fetch(`${API_BASE_URL}/api/community/posts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('cosnap_access_token') || ''}`
        },
        body: JSON.stringify({ images: selectedImages, caption: postCaption, effectId: effect.id })
      });
      const data = await res.json();
      if (data.success) {
        queryClient.setQueryData<any>(['posts', { page, limit }], (old) => ({
          success: true,
          posts: [
            { ...data.post, user: state.user, comments: [], commentsCount: 0, likesCount: 0, images: data.post.images || selectedImages, __highlight: true },
            ...(old?.posts || [])
          ]
        }));
        // 滚动至顶部并闪烁高亮
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
          const cards = document.querySelectorAll('[data-post-card]');
          if (cards && cards[0]) {
            (cards[0] as HTMLElement).classList.add('ring-2','ring-purple-400');
            setTimeout(()=> (cards[0] as HTMLElement).classList.remove('ring-2','ring-purple-400'), 1200);
          }
        }, 400);
      }
      
      // Reset form and close modal
      setSelectedImages([]);
      setPostCaption('');
      setSelectedEffect('');
      setShowCreateModal(false);
      
      // Show success message
      push('success','发布成功！');
      
    } catch (error) {
      console.error('Error creating post:', error);
      push('error','发布失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetCreateForm = () => {
    setSelectedImages([]);
    setPostCaption('');
    setSelectedEffect('');
    setPreviewImage(null);
    setDraggedIndex(null);
    setShowCreateModal(false);
  };

  // 图片拖拽排序功能实现
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index.toString());
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    // 重新排列图片数组
    const newImages = [...selectedImages];
    const draggedImage = newImages[draggedIndex];
    
    // 移除被拖拽的图片
    newImages.splice(draggedIndex, 1);
    // 插入到新位置
    newImages.splice(dropIndex, 0, draggedImage);
    
    setSelectedImages(newImages);
    setDraggedIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
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
            onClick={() => {
              if (!isAuthenticated) {
                push('warning','请先登录');
                return;
              }
              setShowCreateModal(true);
            }}
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
        {data?.meta?.hasNext && (
          <div className="flex justify-center mt-6">
            <button
              onClick={() => setPage((p) => p + 1)}
              className="px-6 py-2 rounded-lg border border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
            >加载更多</button>
          </div>
        )}
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
                      
                      {/* Selected Images with Enhanced UX */}
                      {selectedImages.length > 0 && (
                        <div className="space-y-3 mb-4">
                          {/* Images Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                            {selectedImages.map((image, index) => (
                              <div 
                                key={index} 
                                className={`relative group cursor-move border-2 border-transparent rounded-lg transition-all duration-200 ${
                                  draggedIndex === index ? 'opacity-50 border-purple-400' : 'hover:border-purple-300'
                                }`}
                                draggable
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, index)}
                                onDragEnd={handleDragEnd}
                              >
                                {/* Image */}
                                <img
                                  src={image}
                                  alt={`Selected ${index + 1}`}
                                  className="w-full h-24 object-cover rounded-lg"
                                />
                                
                                {/* Overlay Controls */}
                                <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-40 rounded-lg transition-all duration-200 flex items-center justify-center space-x-2">
                                  {/* Preview Button */}
                                  <button
                                    onClick={() => setPreviewImage(image)}
                                    className="p-1.5 bg-white bg-opacity-90 text-gray-800 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                                    title="预览大图"
                                  >
                                    <ZoomIn className="h-3 w-3" />
                                  </button>
                                  
                                  {/* Drag Handle */}
                                  <div className="p-1.5 bg-white bg-opacity-90 text-gray-800 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200">
                                    <GripVertical className="h-3 w-3" />
                                  </div>
                                  
                                  {/* Delete Button */}
                                  <button
                                    onClick={() => removeImage(index)}
                                    className="p-1.5 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-all duration-200 hover:scale-110"
                                    title="删除图片"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                                
                                {/* Image Order Indicator */}
                                <div className="absolute top-2 left-2 bg-purple-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                                  {index + 1}
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Drag & Drop Instructions */}
                          <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                            🔄 拖拽图片调整顺序 • 🔍 点击预览大图 • 🗑️ 点击删除图片
                          </p>
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
                              PNG, JPG, WebP up to 20MB (max 5 images)
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

                {/* Enhanced Mobile-Friendly Footer */}
                <div className="sticky bottom-0 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700">
                  {/* Safe Area for Mobile */}
                  <div className="p-4 pb-safe">
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
                      {/* Cancel Button */}
                      <button
                        onClick={resetCreateForm}
                        className="flex items-center justify-center px-6 py-3 sm:py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 font-medium transition-colors border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700/50"
                      >
                        <X className="h-4 w-4 mr-2" />
                        <span>取消</span>
                      </button>
                      
                      {/* Publish Button */}
                      <button
                        onClick={handleCreatePost}
                        disabled={selectedImages.length === 0 || !postCaption.trim() || !selectedEffect || isSubmitting}
                        className="flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-3 sm:py-2 rounded-lg font-semibold transition-all duration-300 min-h-[44px] sm:min-h-[40px]"
                      >
                        {isSubmitting ? (
                          <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>发布中...</span>
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4" />
                            <span>发布作品</span>
                          </>
                        )}
                      </button>
                    </div>
                    
                    {/* Validation Status */}
                    {selectedImages.length === 0 || !postCaption.trim() || !selectedEffect ? (
                      <div className="mt-3 text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {selectedImages.length === 0 ? '📷 请上传至少1张图片' : 
                           !selectedEffect ? '🎨 请选择使用的特效' : 
                           !postCaption.trim() ? '✍️ 请填写作品描述' : ''}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4"
            onClick={() => setPreviewImage(null)}
          >
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="relative max-w-4xl max-h-full"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close Button */}
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
              >
                <X className="h-5 w-5" />
              </button>
              
              {/* Preview Image */}
              <img
                src={previewImage}
                alt="预览大图"
                className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
              />
              
              {/* Image Info */}
              <div className="absolute bottom-4 left-4 bg-black bg-opacity-50 text-white px-3 py-2 rounded-lg">
                <p className="text-sm">点击图片外区域关闭预览</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Community;