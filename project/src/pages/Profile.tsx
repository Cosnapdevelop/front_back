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
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Bookmarked Effects
            </h3>
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
                          onClick={async ()=>{
                            const caption = prompt('Edit caption', p.caption) ?? p.caption;
                            const images = p.images; // 可扩展更换图片弹窗
                            const res = await fetch(`${API}/api/community/posts/${p.id}`, {
                              method:'PUT', headers:{'Content-Type':'application/json', Authorization:`Bearer ${localStorage.getItem('cosnap_access_token')||''}`}, body: JSON.stringify({ caption, images })
                            });
                            const data = await res.json();
                            if (data.success) { alert('Updated'); fetchMyPosts(); } else { alert('Failed: '+(data.error||'')); }
                          }}
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
                        <img key={idx} src={src} alt="" className="h-24 w-full object-cover rounded" loading="lazy" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
            {bookmarkedEffects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {bookmarkedEffects.map((effect) => (
                  <EffectCard key={effect.id} effect={effect} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Bookmark className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No bookmarked effects yet. Save your favorites!
                </p>
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
      case 'posts':
        return (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">My Posts</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">暂时展示列表入口（可在后续版本中完善编辑/删除界面）。</p>
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
                src={state.user.avatar}
                alt={state.user.username}
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-gray-800 object-cover mx-auto sm:mx-0"
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
      </div>
    </div>
  );
};

export default Profile;