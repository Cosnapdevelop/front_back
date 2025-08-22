import React, { useEffect, useRef, useState } from 'react';
import { API_BASE_URL } from '../config/api';
import { useToast } from '../context/ToastContext';
import Cropper from 'react-easy-crop';
import { motion } from 'framer-motion';
import { 
  Settings, 
  Heart, 
  Bookmark, 
  Clock, 
  Edit3, 
  Bell, 
  Shield,
  Palette,
  Download,
  Share,
  Trash2,
  AlertTriangle,
  Send
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import EffectCard from '../components/Cards/EffectCard';
import Avatar from '../components/Avatar';

const Profile = () => {
  const { state, dispatch } = useApp();
  const { push } = useToast();
  const [activeTab, setActiveTab] = useState<'history' | 'bookmarks' | 'posts' | 'settings'>('history');
  const usernameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const bioRef = useRef<HTMLTextAreaElement>(null);
  
  // Account deletion state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteStep, setDeleteStep] = useState<'confirm' | 'verify'>('confirm');
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleteVerificationCode, setDeleteVerificationCode] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  
  // Username availability checking
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameDebounceTimeout, setUsernameDebounceTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Loading states
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const tabs = [
    { id: 'history', label: 'Recent History', icon: Clock },
    { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
    { id: 'posts', label: 'My Posts', icon: Edit3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const bookmarkedEffects = state.effects.filter(effect => effect.isBookmarked);

  const API = API_BASE_URL;
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [sourceImg, setSourceImg] = useState<string | null>(null);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);
  // Edit Post Modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [editImages, setEditImages] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [dragFrom, setDragFrom] = useState<number | null>(null);

  const fetchMyPosts = async () => {
    setLoadingPosts(true);
    try {
      const res = await fetch(`${API}/api/community/my-posts?page=1&limit=20`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('cosnap_access_token') || ''}` }
      });
      const data = await res.json();
      if (data.success) setMyPosts(data.posts);
    } finally {
      setLoadingPosts(false);
    }
  };

  const updatePostImages = async (postId: string, newImages: string[], newCaption?: string) => {
    const res = await fetch(`${API}/api/community/posts/${postId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('cosnap_access_token') || ''}` },
      body: JSON.stringify({ images: newImages, caption: newCaption })
    });
    const data = await res.json();
    if (data.success) {
      setMyPosts(prev => prev.map(p => (p.id === postId ? { ...p, images: newImages, caption: newCaption ?? p.caption } : p)));
    } else {
      push('error', 'Update failed: ' + (data.error || ''));
    }
  };

  const openEditModal = (p: any) => {
    setEditingPostId(p.id);
    setEditCaption(p.caption || '');
    setEditImages([...(p.images || [])]);
    setEditOpen(true);
  };

  const handleUploadFiles = async (files: FileList | null) => {
    if (!files) return;
    setIsUploading(true);
    try {
      const list: string[] = [];
      for (const f of Array.from(files)) {
        const ext = (f.name.split('.').pop() || 'jpg').toLowerCase();
        const resp = await fetch(`${API}/api/effects/upload/presign`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('cosnap_access_token') || ''}` },
          body: JSON.stringify({ ext, dir: 'cosnap/community' })
        });
        const ps = await resp.json();
        if (ps.success) {
          if (ps.provider === 'aliyun-oss') {
            const form = new FormData();
            Object.entries(ps.form).forEach(([k, v]) => form.append(k, v as string));
            if (!form.has('key')) form.append('key', ps.form.key);
            form.append('file', f);
            await fetch(ps.uploadUrl, { method: 'POST', body: form });
          }
          list.push(ps.publicUrl as string);
        }
      }
      setEditImages(prev => [...prev, ...list]);
    } finally {
      setIsUploading(false);
    }
  };

  const onDragStartImg = (idx: number) => setDragFrom(idx);
  const onDropImg = (idx: number) => {
    if (dragFrom === null || dragFrom === idx) return;
    const arr = [...editImages];
    const temp = arr[dragFrom];
    arr[dragFrom] = arr[idx];
    arr[idx] = temp;
    setEditImages(arr);
    setDragFrom(null);
  };

  // Canvas 工具：中心裁剪为正方形并压缩到 512x512
  const centerCropAndCompress = (img: HTMLImageElement, size = 512, type = 'image/jpeg', quality = 0.9): string => {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    const minSide = Math.min(img.naturalWidth, img.naturalHeight);
    const sx = (img.naturalWidth - minSide) / 2;
    const sy = (img.naturalHeight - minSide) / 2;
    ctx.drawImage(img, sx, sy, minSide, minSide, 0, 0, size, size);
    return canvas.toDataURL(type, quality);
  };

  const openAvatarEditor = () => { setAvatarModalOpen(true); setAvatarPreview(null); };
  const onAvatarFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => {
      const src = reader.result as string;
      setSourceImg(src);
    };
    reader.readAsDataURL(file);
  };
  const onCropComplete = (_: any, areaPixels: any) => setCroppedAreaPixels(areaPixels);
  const generateCroppedPreview = async () => {
    if (!sourceImg || !croppedAreaPixels) return;
    const img = new Image();
    img.src = sourceImg;
    await new Promise(r=> img.onload = r as any);
    const canvas = document.createElement('canvas');
    canvas.width = 512; canvas.height = 512;
    const ctx = canvas.getContext('2d')!;
    const scaleX = img.naturalWidth / (img.width || 1);
    const scaleY = img.naturalHeight / (img.height || 1);
    const sx = croppedAreaPixels.x * scaleX;
    const sy = croppedAreaPixels.y * scaleY;
    const sw = croppedAreaPixels.width * scaleX;
    const sh = croppedAreaPixels.height * scaleY;
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, 512, 512);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.92);
    setAvatarPreview(dataUrl);
  };
  const saveAvatar = async () => {
    if (!avatarPreview) return;
    // dataURL -> Blob
    const resFetch = await fetch(avatarPreview);
    const blob = await resFetch.blob();
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
    // 预签名直传
    const resp = await fetch(`${API}/api/effects/upload/presign`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('cosnap_access_token') || ''}` },
      body: JSON.stringify({ ext: 'jpg', dir: 'cosnap/avatar' })
    });
    const ps = await resp.json();
    if (ps.success) {
      if (ps.provider === 'aliyun-oss') {
        const form = new FormData();
        Object.entries(ps.form).forEach(([k, v]) => form.append(k, v as string));
        if (!form.has('key')) form.append('key', ps.form.key);
        form.append('file', file);
        await fetch(ps.uploadUrl, { method: 'POST', body: form });
      }
      const avatarUrl = ps.publicUrl as string;
      const put = await fetch(`${API}/auth/me/avatar`, { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${localStorage.getItem('cosnap_access_token') || ''}` }, body: JSON.stringify({ avatar: avatarUrl }) });
      const data = await put.json();
      if (data.success) { localStorage.setItem('user', JSON.stringify(data.user)); dispatch({ type: 'SET_USER', payload: data.user }); setAvatarModalOpen(false); }
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteStep === 'confirm') {
      // Send verification code first
      try {
        const res = await fetch(`${API}/auth/send-code`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('cosnap_access_token') || ''}`
          },
          body: JSON.stringify({
            email: state.user?.email,
            scene: 'delete_account'
          })
        });
        const data = await res.json();
        if (data.success) {
          setCodeSent(true);
          setDeleteStep('verify');
          push('success', 'Verification code sent to your email');
        } else {
          push('error', data.error || 'Failed to send verification code');
        }
      } catch (error) {
        push('error', 'Failed to send verification code');
      }
    } else {
      // Actually delete the account
      setIsDeleting(true);
      try {
        const res = await fetch(`${API}/auth/me/account`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${localStorage.getItem('cosnap_access_token') || ''}`
          },
          body: JSON.stringify({
            password: deletePassword,
            confirmationText: deleteConfirmText,
            email: state.user?.email,
            code: deleteVerificationCode
          })
        });
        const data = await res.json();
        if (data.success) {
          push('success', 'Account deleted successfully');
          localStorage.clear();
          dispatch({ type: 'SET_USER', payload: null as any });
          window.location.href = '/';
        } else {
          push('error', data.error || 'Failed to delete account');
        }
      } catch (error) {
        push('error', 'Failed to delete account');
      } finally {
        setIsDeleting(false);
      }
    }
  };

  const resetDeleteModal = () => {
    setShowDeleteModal(false);
    setDeleteStep('confirm');
    setDeletePassword('');
    setDeleteConfirmText('');
    setDeleteVerificationCode('');
    setCodeSent(false);
    setIsDeleting(false);
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case 'history':
        return (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Recently Viewed Effects
            </h3>
            {state.recentlyViewed.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {state.recentlyViewed.map((effect) => (
                  <EffectCard key={effect.id} effect={effect} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No recent activity yet. Start exploring effects!
                </p>
              </div>
            )}
          </div>
        );

      case 'bookmarks':
        return (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Bookmarked Effects</h3>
            {bookmarkedEffects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {bookmarkedEffects.map((effect) => (
                  <EffectCard key={effect.id} effect={effect} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Bookmark className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">No bookmarked effects yet. Save your favorites!</p>
              </div>
            )}
          </div>
        );

      case 'posts':
        return (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">My Posts</h3>
              <button onClick={fetchMyPosts} className="px-3 py-1.5 text-sm rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300">Refresh</button>
            </div>
            {loadingPosts ? (
              <p className="text-gray-500">Loading...</p>
            ) : myPosts.length === 0 ? (
              <p className="text-gray-500">No posts yet.</p>
            ) : (
              <div className="space-y-4">
                {myPosts.map(p => (
                  <div key={p.id} className="p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-600 dark:text-gray-400">{new Date(p.createdAt).toLocaleString()}</div>
                      <div className="space-x-2">
                        <button
                          onClick={()=> openEditModal(p)}
                          className="px-3 py-1 text-sm rounded bg-blue-500 text-white hover:bg-blue-600">Edit</button>
                        <button
                          onClick={async ()=>{
                            if (!confirm('Delete this post?')) return;
                            const res = await fetch(`${API}/api/community/posts/${p.id}`, { method:'DELETE', headers:{ Authorization:`Bearer ${localStorage.getItem('cosnap_access_token')||''}` } });
                            const data = await res.json();
                            if (data.success) { fetchMyPosts(); } else { push('error','Failed: '+(data.error||'')); }
                          }}
                          className="px-3 py-1 text-sm rounded bg-red-500 text-white hover:bg-red-600">Delete</button>
                      </div>
                    </div>
                    <div className="mt-3 text-gray-900 dark:text-white">{p.caption}</div>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {(p.images||[]).map((src:string,idx:number)=> (
                        <div key={idx} className="relative group">
                          <img src={src} alt="" className="h-24 w-full object-cover rounded" loading="lazy" />
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-2 bg-black/40 rounded">
                            <button onClick={()=>{ const arr=[...p.images]; if(idx>0){ [arr[idx-1],arr[idx]]=[arr[idx],arr[idx-1]]; updatePostImages(p.id, arr);} }} className="px-2 py-1 text-xs bg-white/90 rounded">←</button>
                            <button onClick={()=>{ const arr=[...p.images]; arr.splice(idx,1); updatePostImages(p.id, arr); }} className="px-2 py-1 text-xs bg-red-500 text-white rounded">Delete</button>
                            <button onClick={()=>{ const arr=[...p.images]; if(idx<arr.length-1){ [arr[idx+1],arr[idx]]=[arr[idx],arr[idx+1]]; updatePostImages(p.id, arr);} }} className="px-2 py-1 text-xs bg-white/90 rounded">→</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      case 'settings':
        return (
          <div className="space-y-8">
            {/* Profile Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Edit3 className="h-5 w-5 mr-2" />
                Profile Information
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Username
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      defaultValue={state.user?.username}
                      ref={usernameRef}
                      onChange={(e) => {
                        const newUsername = e.target.value.trim();
                        if (usernameDebounceTimeout) {
                          clearTimeout(usernameDebounceTimeout);
                        }
                        
                        if (newUsername && newUsername !== state.user?.username) {
                          setCheckingUsername(true);
                          setUsernameAvailable(null);
                          
                          const timeout = setTimeout(async () => {
                            try {
                              const res = await fetch(`${API}/auth/check-availability?username=${encodeURIComponent(newUsername)}`);
                              const data = await res.json();
                              setUsernameAvailable(data.usernameAvailable);
                            } catch (error) {
                              console.error('Username availability check failed:', error);
                            } finally {
                              setCheckingUsername(false);
                            }
                          }, 500);
                          
                          setUsernameDebounceTimeout(timeout);
                        } else {
                          setUsernameAvailable(null);
                          setCheckingUsername(false);
                        }
                      }}
                      className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white transition-colors ${
                        usernameAvailable === false 
                          ? 'border-red-300 dark:border-red-600' 
                          : usernameAvailable === true 
                          ? 'border-green-300 dark:border-green-600'
                          : 'border-gray-300 dark:border-gray-600'
                      }`}
                    />
                    <div className="absolute right-3 top-1/2 transform -translate-y-1/2 flex items-center">
                      {checkingUsername && (
                        <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                      )}
                      {usernameAvailable === false && (
                        <div className="text-red-500 text-sm">✗</div>
                      )}
                      {usernameAvailable === true && (
                        <div className="text-green-500 text-sm">✓</div>
                      )}
                    </div>
                  </div>
                  {usernameAvailable === false && (
                    <p className="text-sm text-red-500 mt-1">This username is already taken</p>
                  )}
                  {usernameAvailable === true && (
                    <p className="text-sm text-green-500 mt-1">This username is available</p>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email
                  </label>
                  <input
                    type="email"
                    defaultValue={state.user?.email}
                    ref={emailRef}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Bio
                  </label>
                  <textarea
                    defaultValue={state.user?.bio}
                    ref={bioRef}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
                  />
                </div>
              </div>
            </div>

            {/* Appearance Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Palette className="h-5 w-5 mr-2" />
                Appearance
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Theme</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Choose your preferred color scheme
                    </p>
                  </div>
                  <button
                    onClick={() => dispatch({ type: 'TOGGLE_THEME' })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                      state.theme === 'dark' ? 'bg-purple-500' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                        state.theme === 'dark' ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>

            {/* Notification Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Bell className="h-5 w-5 mr-2" />
                Notifications
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Push Notifications</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Receive notifications about new effects and updates
                    </p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-purple-500 transition-colors duration-200">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 translate-x-6" />
                  </button>
                </div>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Email Updates</p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Get weekly summaries of trending effects
                    </p>
                  </div>
                  <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-300 transition-colors duration-200">
                    <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 translate-x-1" />
                  </button>
                </div>
              </div>
            </div>

            {/* Privacy Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                <Shield className="h-5 w-5 mr-2" />
                Privacy
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Profile Visibility
                  </label>
                  <select className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Danger Zone */}
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-6 border border-red-200 dark:border-red-800">
              <h3 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-4 flex items-center">
                <AlertTriangle className="h-5 w-5 mr-2" />
                Danger Zone
              </h3>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-red-900 dark:text-red-100">Delete Account</p>
                    <p className="text-sm text-red-700 dark:text-red-300">
                      Once you delete your account, there is no going back. Please be certain.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Delete Account</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end">
              <button
                onClick={async () => {
                  const payload = {
                    username: usernameRef.current?.value,
                    email: emailRef.current?.value,
                    bio: bioRef.current?.value,
                  };
                  try {
                    const res = await fetch(`${API}/auth/me`, {
                      method: 'PUT',
                      headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${localStorage.getItem('cosnap_access_token') || ''}`
                      },
                      body: JSON.stringify(payload)
                    });
                    const data = await res.json();
                    if (data.success) {
                      localStorage.setItem('user', JSON.stringify(data.user));
                      dispatch({ type: 'SET_USER', payload: data.user });
                      push('success','Saved');
                      // 立即刷新顶部展示
                      setActiveTab('settings');
                    } else if (res.status === 409) {
                      push('warning', data.error || '用户名或邮箱已被占用');
                    } else {
                      push('error','Failed: ' + (data.error || ''));
                    }
                  } catch (e) {
                    push('error','Failed to save');
                  }
                }}
                className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!state.user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
          {/* Cover Image */}
          <div className="h-32 sm:h-48 bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 relative">
            <div className="absolute inset-0 bg-black/20" />
          </div>
          
          {/* Profile Info */}
          <div className="relative px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-6 -mt-16 sm:-mt-20">
              <Avatar
                src={state.user.avatar}
                name={state.user.username}
                size="xl"
                className="mx-auto sm:mx-0"
              />
              
              <div className="flex-1 text-center sm:text-left mt-4 sm:mt-0 sm:pb-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  @{state.user.username}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {state.user.bio}
                </p>
                
                <div className="flex items-center justify-center sm:justify-start space-x-6 text-sm">
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {state.user.effectsCreated}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">Effects</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {state.user.totalLikes}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">Likes</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {bookmarkedEffects.length}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">Bookmarks</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 mt-4 sm:mt-0 justify-center sm:justify-end">
                <button className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors">
                  <Share className="h-4 w-4" />
                  <span>Share</span>
                </button>
                <button
                  onClick={() => setAvatarModalOpen(true)}
                  className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>Change Avatar</span>
                </button>
                <button 
                  onClick={() => setActiveTab('settings')}
                  className="flex items-center space-x-2 bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  <Edit3 className="h-4 w-4" />
                  <span>Edit Profile</span>
                </button>
              </div>
            </div>
          </div>
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
                <span className="hidden sm:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>

        {activeTab === 'posts' && myPosts.length === 0 && !loadingPosts && (
          <div className="mb-6"><button onClick={fetchMyPosts} className="px-3 py-1.5 text-sm rounded bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300">Load My Posts</button></div>
        )}

        {/* Tab Content */}
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {renderTabContent()}
        </motion.div>

        {/* Edit Post Modal */}
        {editOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={()=> setEditOpen(false)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-3xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Edit Post</h3>
                <button onClick={()=> setEditOpen(false)} className="px-3 py-1 text-sm rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">Close</button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-400 mb-2">Caption</label>
                  <input value={editCaption} onChange={e=> setEditCaption(e.target.value)} className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white" />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm text-gray-600 dark:text-gray-400">Images ({editImages.length})</label>
                    <label className="px-3 py-1 text-sm rounded bg-purple-500 text-white hover:bg-purple-600 cursor-pointer">
                      {isUploading ? 'Uploading...' : 'Add Images'}
                      <input type="file" accept="image/*" multiple onChange={(e)=> handleUploadFiles(e.target.files)} className="hidden" />
                    </label>
                  </div>
                  {editImages.length === 0 ? (
                    <div className="h-24 flex items-center justify-center text-gray-500 dark:text-gray-400 border border-dashed border-gray-300 dark:border-gray-600 rounded">No images yet</div>
                  ) : (
                    <div className="grid grid-cols-3 gap-3">
                      {editImages.map((src,idx)=> (
                        <div key={idx} className="relative group border border-gray-200 dark:border-gray-700 rounded overflow-hidden"
                          draggable onDragStart={()=> onDragStartImg(idx)} onDragOver={(e)=> e.preventDefault()} onDrop={()=> onDropImg(idx)}>
                          <img src={src} alt="" className="h-28 w-full object-cover" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-2">
                            <button onClick={()=> setEditImages(prev=> prev.filter((_,i)=> i!==idx))} className="px-2 py-1 text-xs rounded bg-red-500 text-white">Delete</button>
                            <span className="text-xs text-white">Drag to reorder</span>
                          </div>
                          <div className="absolute top-1 left-1 bg-white/90 rounded px-1 text-xs cursor-grab">⋮⋮</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex justify-end space-x-2">
                  <button onClick={()=> setEditOpen(false)} className="px-4 py-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
                  <button onClick={async ()=>{ if (editingPostId) { await updatePostImages(editingPostId, editImages, editCaption); setEditOpen(false); } }} className="px-4 py-2 rounded bg-purple-500 hover:bg-purple-600 text-white">Save</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Avatar Crop Modal */}
        {avatarModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={()=> setAvatarModalOpen(false)} />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Change Avatar</h3>
              <div className="space-y-4">
                <div className="flex flex-col space-y-3">
                  <div className="h-60 relative rounded-lg overflow-hidden bg-gray-100 dark:bg-gray-700">
                    {sourceImg ? (
                      <Cropper
                        image={sourceImg}
                        crop={crop}
                        zoom={zoom}
                        aspect={1}
                        onCropChange={setCrop}
                        onZoomChange={setZoom}
                        onCropComplete={onCropComplete}
                        cropShape="round"
                        showGrid={false}
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-500">Select an image</div>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="px-3 py-1 text-sm rounded bg-purple-500 text-white hover:bg-purple-600 cursor-pointer">
                      Select Image
                      <input type="file" accept="image/*" onChange={(e)=> onAvatarFile(e.target.files?.[0] as File)} className="hidden" />
                    </label>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs text-gray-600 dark:text-gray-400">Zoom</span>
                      <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e)=> setZoom(Number(e.target.value))} />
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="h-20 w-20 rounded-full overflow-hidden border border-gray-300 dark:border-gray-600">
                      {avatarPreview ? <img src={avatarPreview} className="h-full w-full object-cover" /> : <div className="h-full w-full flex items-center justify-center text-gray-500">Preview</div>}
                    </div>
                    <button onClick={generateCroppedPreview} className="px-3 py-1 text-sm rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">Generate Preview</button>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <button onClick={()=> setAvatarModalOpen(false)} className="px-4 py-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
                  <button disabled={!avatarPreview} onClick={saveAvatar} className="px-4 py-2 rounded bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-50">Save</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Account Deletion Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/50" onClick={resetDeleteModal} />
            <div className="relative bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 w-full max-w-md p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-red-600 dark:text-red-400 flex items-center">
                  <AlertTriangle className="h-6 w-6 mr-2" />
                  Delete Account
                </h3>
                <button onClick={resetDeleteModal} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                  ×
                </button>
              </div>

              {deleteStep === 'confirm' ? (
                <div className="space-y-4">
                  <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-lg border border-red-200 dark:border-red-800">
                    <p className="text-sm text-red-800 dark:text-red-200">
                      <strong>Warning:</strong> This action cannot be undone. This will permanently delete your account, 
                      remove all your data, and you will lose access to all your creations and settings.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Enter your password to confirm
                    </label>
                    <input
                      type="password"
                      value={deletePassword}
                      onChange={(e) => setDeletePassword(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="Enter your password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Type "DELETE MY ACCOUNT" to confirm
                    </label>
                    <input
                      type="text"
                      value={deleteConfirmText}
                      onChange={(e) => setDeleteConfirmText(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                      placeholder="DELETE MY ACCOUNT"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={resetDeleteModal}
                      className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={!deletePassword || deleteConfirmText !== 'DELETE MY ACCOUNT'}
                      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      <Send className="h-4 w-4" />
                      <span>Send Verification Code</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                    <p className="text-sm text-blue-800 dark:text-blue-200">
                      A verification code has been sent to your email address. Please enter it below to complete the account deletion.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Verification Code
                    </label>
                    <input
                      type="text"
                      value={deleteVerificationCode}
                      onChange={(e) => setDeleteVerificationCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-red-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-center font-mono text-lg"
                      placeholder="000000"
                      maxLength={6}
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      onClick={() => setDeleteStep('confirm')}
                      className="px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                      Back
                    </button>
                    <button
                      onClick={handleDeleteAccount}
                      disabled={deleteVerificationCode.length !== 6 || isDeleting}
                      className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                    >
                      {isDeleting ? (
                        <>
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          <span>Deleting...</span>
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4" />
                          <span>Delete Account</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;