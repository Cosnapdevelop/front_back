import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Lock, 
  UserPlus, 
  Settings,
  Heart,
  Bookmark,
  Clock,
  Shield,
  AlertCircle
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { User } from '../types';
import EffectCard from '../components/Cards/EffectCard';

const UserProfile = () => {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUser = async () => {
      setLoading(true);
      setError(null);
      
      try {
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Find user from effects or posts
        let foundUser = state.effects.find(e => e.author.id === userId)?.author ||
                       state.posts.find(p => p.user.id === userId)?.user;
        
        if (!foundUser) {
          // Create mock user data for demonstration
          const mockUsers = [
            {
              id: '1',
              username: 'ai_artist_pro',
              avatar: 'https://images.pexels.com/photos/1264210/pexels-photo-1264210.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
              bio: 'Professional AI artist specializing in portrait enhancement',
              followersCount: 15420,
              followingCount: 892,
              isFollowing: false,
              isPrivate: false,
            },
            {
              id: '2',
              username: 'creative_soul',
              avatar: 'https://images.pexels.com/photos/1858175/pexels-photo-1858175.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
              bio: 'Digital artist and ComfyUI enthusiast',
              followersCount: 8760,
              followingCount: 445,
              isFollowing: true,
              isPrivate: true,
            },
            {
              id: '3',
              username: 'tech_wizard',
              avatar: 'https://images.pexels.com/photos/1040880/pexels-photo-1040880.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&fit=crop',
              bio: 'AI workflow developer and researcher',
              followersCount: 22100,
              followingCount: 156,
              isFollowing: false,
              isPrivate: false,
            },
          ];
          
          foundUser = mockUsers.find(u => u.id === userId);
        }
        
        if (!foundUser) {
          setError('User not found');
        } else {
          setUser(foundUser);
        }
      } catch (err) {
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchUser();
    }
  }, [userId, state.effects, state.posts]);

  const handleFollow = () => {
    if (user) {
      dispatch({ type: 'FOLLOW_USER', payload: user.id });
      setUser(prev => prev ? {
        ...prev,
        isFollowing: !prev.isFollowing,
        followersCount: prev.isFollowing ? prev.followersCount - 1 : prev.followersCount + 1
      } : null);
    }
  };

  const isCurrentUser = state.user?.id === userId;
  const userEffects = state.effects.filter(effect => effect.author.id === userId);
  const canViewContent = !user?.isPrivate || user?.isFollowing || isCurrentUser;

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <button
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors mb-8"
          >
            <ArrowLeft className="h-5 w-5" />
            <span>Back</span>
          </button>
          
          <div className="text-center py-16">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              {error === 'User not found' ? 'User Not Found' : 'Error Loading Profile'}
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              {error === 'User not found' 
                ? 'This user does not exist or may have been removed.'
                : 'Something went wrong while loading this profile. Please try again.'
              }
            </p>
            <button
              onClick={() => navigate('/')}
              className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Go Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center space-x-2 text-gray-600 dark:text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors mb-8"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>Back</span>
        </button>

        {/* Profile Header */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-8">
          {/* Cover Image */}
          <div className="h-32 sm:h-48 bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 relative">
            <div className="absolute inset-0 bg-black/20" />
            {user.isPrivate && !canViewContent && (
              <div className="absolute top-4 right-4 flex items-center space-x-2 bg-black/50 text-white px-3 py-1.5 rounded-lg text-sm">
                <Lock className="h-4 w-4" />
                <span>Private Account</span>
              </div>
            )}
          </div>
          
          {/* Profile Info */}
          <div className="relative px-6 pb-6">
            <div className="flex flex-col sm:flex-row sm:items-end sm:space-x-6 -mt-16 sm:-mt-20">
              <img
                src={user.avatar}
                alt={user.username}
                className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-4 border-white dark:border-gray-800 object-cover mx-auto sm:mx-0"
              />
              
              <div className="flex-1 text-center sm:text-left mt-4 sm:mt-0 sm:pb-4">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
                  @{user.username}
                </h1>
                <p className="text-gray-600 dark:text-gray-400 mb-4">
                  {canViewContent ? user.bio : 'This account is private'}
                </p>
                
                <div className="flex items-center justify-center sm:justify-start space-x-6 text-sm">
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {canViewContent ? userEffects.length : '•'}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">Effects</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {canViewContent ? user.followersCount : '•'}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">Followers</p>
                  </div>
                  <div className="text-center">
                    <p className="font-semibold text-gray-900 dark:text-white">
                      {canViewContent ? user.followingCount : '•'}
                    </p>
                    <p className="text-gray-600 dark:text-gray-400">Following</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center space-x-3 mt-4 sm:mt-0 justify-center sm:justify-end">
                {!isCurrentUser && (
                  <button
                    onClick={handleFollow}
                    className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors ${
                      user.isFollowing
                        ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                        : 'bg-purple-500 hover:bg-purple-600 text-white'
                    }`}
                  >
                    <UserPlus className="h-4 w-4" />
                    <span>{user.isFollowing ? 'Following' : 'Follow'}</span>
                  </button>
                )}
                {isCurrentUser && (
                  <button
                    onClick={() => navigate('/profile')}
                    className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600 px-4 py-2 rounded-lg transition-colors"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Edit Profile</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {canViewContent ? (
          <div>
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
              Effects by @{user.username}
            </h3>
            {userEffects.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {userEffects.map((effect) => (
                  <EffectCard key={effect.id} effect={effect} />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Heart className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600 dark:text-gray-400">
                  No effects created yet
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
            <div className="w-24 h-24 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="h-12 w-12 text-gray-400" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
              This Account is Private
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6 max-w-md mx-auto">
              Follow @{user.username} to see their effects and activity. When they approve your request, you'll be able to see their content here.
            </p>
            {!user.isFollowing && (
              <button
                onClick={handleFollow}
                className="bg-purple-500 hover:bg-purple-600 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Send Follow Request
              </button>
            )}
            {user.isFollowing && (
              <div className="flex items-center justify-center space-x-2 text-purple-600 dark:text-purple-400">
                <Clock className="h-5 w-5" />
                <span className="font-medium">Follow Request Sent</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default UserProfile;