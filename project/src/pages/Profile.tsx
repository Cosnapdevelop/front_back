import React, { useEffect, useRef, useState } from 'react';
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
  Share
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import EffectCard from '../components/Cards/EffectCard';

const Profile = () => {
  const { state, dispatch } = useApp();
  const [activeTab, setActiveTab] = useState<'history' | 'bookmarks' | 'posts' | 'settings'>('history');
  const usernameRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const bioRef = useRef<HTMLTextAreaElement>(null);

  const tabs = [
    { id: 'history', label: 'Recent History', icon: Clock },
    { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
    { id: 'posts', label: 'My Posts', icon: Edit3 },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const bookmarkedEffects = state.effects.filter(effect => effect.isBookmarked);

  const API = (import.meta.env.VITE_API_BASE_URL as string) || 'https://cosnap-back.onrender.com';
  const [myPosts, setMyPosts] = useState<any[]>([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [avatarModalOpen, setAvatarModalOpen] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
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
      alert('Update failed: ' + (data.error || ''));
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
      const img = new Image();
      img.onload = () => {
        const dataUrl = centerCropAndCompress(img, 512, 'image/jpeg', 0.92);
        setAvatarPreview(dataUrl);
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
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
                            if (data.success) { fetchMyPosts(); } else { alert('Failed: '+(data.error||'')); }
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
                  <input
                    type="text"
                    defaultValue={state.user?.username}
                    ref={usernameRef}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
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
                    const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'https://cosnap-back.onrender.com'}/auth/me`, {
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
                      alert('Saved');
                      // 立即刷新顶部展示
                      setActiveTab('settings');
                    } else alert('Failed: ' + (data.error || ''));
                  } catch (e) {
                    alert('Failed to save');
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
              <img
                src={state.user.avatar || `${import.meta.env.VITE_API_BASE_URL || 'https://cosnap-back.onrender.com'}/assets/placeholder-user.png`}
                alt={state.user.username}
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-gray-800 object-cover mx-auto sm:mx-0"
                onError={(e)=>{(e.currentTarget as HTMLImageElement).src=`${import.meta.env.VITE_API_BASE_URL || 'https://cosnap-back.onrender.com'}/assets/placeholder-user.png`;}}
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
                  onClick={async ()=>{
                    const input = document.createElement('input');
                    input.type='file'; input.accept='image/*';
                    input.onchange = async ()=>{
                      const file = input.files && input.files[0];
                      if (!file) return;
                      const ext = (file.name.split('.').pop()||'jpg').toLowerCase();
                      const resp = await fetch(`${API}/api/effects/upload/presign`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('cosnap_access_token')||''}` }, body: JSON.stringify({ ext, dir:'cosnap/avatar' }) });
                      const ps = await resp.json();
                      if (ps.success) {
                        if (ps.provider==='aliyun-oss'){
                          const form = new FormData(); Object.entries(ps.form).forEach(([k,v])=> form.append(k, v as string)); if(!form.has('key')) form.append('key', ps.form.key); form.append('file', file); await fetch(ps.uploadUrl, { method:'POST', body: form });
                        }
                        const avatarUrl = ps.publicUrl;
                        const res = await fetch(`${API}/auth/me/avatar`, { method:'PUT', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('cosnap_access_token')||''}` }, body: JSON.stringify({ avatar: avatarUrl }) });
                        const data = await res.json();
                        if (data.success){ localStorage.setItem('user', JSON.stringify(data.user)); dispatch({ type:'SET_USER', payload: data.user }); }
                      }
                    };
                    input.click();
                  }}
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
                <div className="flex items-center space-x-4">
                  <div className="h-24 w-24 rounded-full overflow-hidden border border-gray-300 dark:border-gray-600">
                    {avatarPreview ? (
                      <img src={avatarPreview} className="h-full w-full object-cover" />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center text-gray-500">Preview</div>
                    )}
                  </div>
                  <label className="px-3 py-1 text-sm rounded bg-purple-500 text-white hover:bg-purple-600 cursor-pointer">
                    Select Image
                    <input type="file" accept="image/*" onChange={(e)=> onAvatarFile(e.target.files?.[0] as File)} className="hidden" />
                  </label>
                </div>
                <div className="flex justify-end space-x-2">
                  <button onClick={()=> setAvatarModalOpen(false)} className="px-4 py-2 rounded bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">Cancel</button>
                  <button disabled={!avatarPreview} onClick={saveAvatar} className="px-4 py-2 rounded bg-purple-500 hover:bg-purple-600 text-white disabled:opacity-50">Save</button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;