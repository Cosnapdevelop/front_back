import React, { createContext, useContext, useReducer, useEffect } from 'react';
import { UserProfile, Effect, Post, Notification } from '../types';
import { mockEffects, mockPosts, createMockUser } from '../data/mockData';

interface AppState {
  user: UserProfile | null;
  theme: 'light' | 'dark';
  effects: Effect[];
  posts: Post[];
  searchQuery: string;
  selectedCategory: string;
  recentlyViewed: Effect[];
  notifications: Notification[];
  showNotifications: boolean;
}

type AppAction =
  | { type: 'SET_USER'; payload: UserProfile }
  | { type: 'TOGGLE_THEME' }
  | { type: 'TOGGLE_NOTIFICATIONS' }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: string }
  | { type: 'CLEAR_NOTIFICATIONS' }
  | { type: 'SET_SEARCH_QUERY'; payload: string }
  | { type: 'SET_CATEGORY'; payload: string }
  | { type: 'LIKE_EFFECT'; payload: string }
  | { type: 'BOOKMARK_EFFECT'; payload: string }
  | { type: 'VIEW_EFFECT'; payload: Effect }
  | { type: 'LIKE_POST'; payload: string }
  | { type: 'BOOKMARK_POST'; payload: string }
  | { type: 'ADD_COMMENT'; payload: { effectId: string; comment: Comment } }
  | { type: 'LIKE_COMMENT'; payload: { effectId: string; commentId: string } }
  | { type: 'FOLLOW_USER'; payload: string }
  | { type: 'ADD_POST'; payload: Post };

const initialState: AppState = {
  user: null,
  theme: 'light',
  effects: mockEffects,
  posts: mockPosts,
  searchQuery: '',
  selectedCategory: 'All',
  recentlyViewed: [],
  notifications: [],
  showNotifications: false,
};

const AppContext = createContext<{
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
}>({
  state: initialState,
  dispatch: () => null,
});

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return { ...state, user: action.payload };
    case 'TOGGLE_THEME':
      const newTheme = state.theme === 'light' ? 'dark' : 'light';
      localStorage.setItem('theme', newTheme);
      return { ...state, theme: newTheme };
    case 'TOGGLE_NOTIFICATIONS':
      return { ...state, showNotifications: !state.showNotifications };
    case 'ADD_NOTIFICATION':
      return { 
        ...state, 
        notifications: [action.payload, ...state.notifications].slice(0, 50) // Keep max 50 notifications
      };
    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(notification =>
          notification.id === action.payload
            ? { ...notification, read: true }
            : notification
        ),
      };
    case 'CLEAR_NOTIFICATIONS':
      return { ...state, notifications: [] };
    case 'SET_SEARCH_QUERY':
      return { ...state, searchQuery: action.payload };
    case 'SET_CATEGORY':
      return { ...state, selectedCategory: action.payload };
    case 'LIKE_EFFECT':
      // Add notification when someone likes an effect
      const likedEffect = state.effects.find(e => e.id === action.payload);
      const likeNotification: Notification = {
        id: Date.now().toString(),
        type: 'like',
        title: 'New Like!',
        message: `Someone liked your effect "${likedEffect?.name}"`,
        user: state.user!, // In real app, this would be the user who liked
        targetId: action.payload,
        createdAt: new Date().toISOString(),
        read: false,
        actionUrl: `/effect/${action.payload}`,
      };
      
      return {
        ...state,
        effects: state.effects.map(effect =>
          effect.id === action.payload
            ? {
                ...effect,
                isLiked: !effect.isLiked,
                likesCount: effect.isLiked ? effect.likesCount - 1 : effect.likesCount + 1
              }
            : effect
        ),
        notifications: likedEffect && !likedEffect.isLiked ? [likeNotification, ...state.notifications].slice(0, 50) : state.notifications,
      };
    case 'BOOKMARK_EFFECT':
      return {
        ...state,
        effects: state.effects.map(effect =>
          effect.id === action.payload
            ? { ...effect, isBookmarked: !effect.isBookmarked }
            : effect
        ),
      };
    case 'VIEW_EFFECT':
      const updatedRecentlyViewed = [
        action.payload,
        ...state.recentlyViewed.filter(effect => effect.id !== action.payload.id)
      ].slice(0, 10);
      return { ...state, recentlyViewed: updatedRecentlyViewed };
    case 'LIKE_POST':
      return {
        ...state,
        posts: state.posts.map(post =>
          post.id === action.payload
            ? {
                ...post,
                isLiked: !post.isLiked,
                likesCount: post.isLiked ? post.likesCount - 1 : post.likesCount + 1
              }
            : post
        ),
      };
    case 'BOOKMARK_POST':
      return {
        ...state,
        posts: state.posts.map(post =>
          post.id === action.payload
            ? { ...post, isBookmarked: !post.isBookmarked }
            : post
        ),
      };
    case 'ADD_COMMENT':
      return {
        ...state,
        effects: state.effects.map(effect =>
          effect.id === action.payload.effectId
            ? {
                ...effect,
                comments: effect.comments ? [action.payload.comment, ...effect.comments] : [action.payload.comment]
              }
            : effect
        ),
      };
    case 'LIKE_COMMENT':
      return {
        ...state,
        effects: state.effects.map(effect =>
          effect.id === action.payload.effectId
            ? {
                ...effect,
                comments: effect.comments?.map(comment =>
                  comment.id === action.payload.commentId
                    ? {
                        ...comment,
                        isLiked: !comment.isLiked,
                        likesCount: comment.isLiked ? comment.likesCount - 1 : comment.likesCount + 1
                      }
                    : comment
                ) || []
              }
            : effect
        ),
      };
    case 'FOLLOW_USER':
      // Find the author being followed
      const authorToFollow = state.effects.find(e => e.author.id === action.payload)?.author ||
                            state.posts.find(p => p.user.id === action.payload)?.user;
      
      // Add notification when someone follows a user
      const followNotification: Notification = {
        id: Date.now().toString(),
        type: 'follow',
        title: 'New Follower!',
        message: `${state.user?.username} started following you`,
        user: state.user!,
        targetId: action.payload,
        createdAt: new Date().toISOString(),
        read: false,
        actionUrl: `/profile`,
      };
      
      return {
        ...state,
        effects: state.effects.map(effect =>
          effect.author.id === action.payload
            ? {
                ...effect,
                author: {
                  ...effect.author,
                  isFollowing: !effect.author.isFollowing,
                  followersCount: effect.author.isFollowing 
                    ? effect.author.followersCount - 1 
                    : effect.author.followersCount + 1
                }
              }
            : effect
        ),
        posts: state.posts.map(post =>
          post.user.id === action.payload
            ? {
                ...post,
                user: {
                  ...post.user,
                  isFollowing: !post.user.isFollowing,
                  followersCount: post.user.isFollowing 
                    ? post.user.followersCount - 1 
                    : post.user.followersCount + 1
                }
              }
            : post
        ),
        notifications: authorToFollow && !authorToFollow.isFollowing ? [followNotification, ...state.notifications].slice(0, 50) : state.notifications,
      };
    case 'ADD_POST':
      return {
        ...state,
        posts: [action.payload, ...state.posts],
      };
    default:
      return state;
  }
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState);

  useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem('theme') as 'light' | 'dark' | null;
    if (savedTheme && savedTheme !== state.theme) {
      dispatch({ type: 'TOGGLE_THEME' });
    }

    // Load or create user
    const savedUser = localStorage.getItem('user');
    if (savedUser) {
      dispatch({ type: 'SET_USER', payload: JSON.parse(savedUser) });
    } else {
      const newUser = createMockUser();
      localStorage.setItem('user', JSON.stringify(newUser));
      dispatch({ type: 'SET_USER', payload: newUser });
    }

    // Apply theme to document
    document.documentElement.classList.toggle('dark', state.theme === 'dark');
  }, [state.theme]);

  return (
    <AppContext.Provider value={{ state, dispatch }}>
      {children}
    </AppContext.Provider>
  );
}

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};