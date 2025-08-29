import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Sparkles, TrendingUp, Clock, ChevronRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import EffectCard from '../components/Cards/EffectCard';
import { Link, useNavigate } from 'react-router-dom';
import { HomePageLayout } from '../components/SEO/SEOLayout';
import { FAQSection, homepageFAQs } from '../components/SEO/FAQSection';
import { SEOOptimizedImage } from '../components/SEO/SEOOptimizedImage';
import { useSEO } from '../hooks/useSEO';

const Home = () => {
  const { state } = useApp();
  const navigate = useNavigate();
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // SEO optimization for homepage
  useSEO({
    enableStructuredData: true,
    enableBreadcrumbs: false // Don't show breadcrumbs on homepage
  });
  
  const featuredEffects = state.effects.slice(0, 4);
  const trendingEffects = state.effects.filter(effect => effect.isTrending);
  const recentEffects = state.recentlyViewed.slice(0, 6);

  // Auto-scroll carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % featuredEffects.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [featuredEffects.length]);

  // Horizontal scroll functionality
  useEffect(() => {
    const container = document.getElementById('recent-items-container');
    const leftBtn = document.getElementById('scroll-left-btn');
    const rightBtn = document.getElementById('scroll-right-btn');
    
    if (!container || !leftBtn || !rightBtn) return;
    
    const scrollAmount = 300;
    
    // Update button visibility based on scroll position
    const updateButtons = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      
      // Show/hide left button
      if (scrollLeft <= 0) {
        leftBtn.classList.add('opacity-0', 'pointer-events-none');
      } else {
        leftBtn.classList.remove('opacity-0', 'pointer-events-none');
      }
      
      // Show/hide right button
      if (scrollLeft >= scrollWidth - clientWidth - 10) {
        rightBtn.classList.add('opacity-0', 'pointer-events-none');
      } else {
        rightBtn.classList.remove('opacity-0', 'pointer-events-none');
      }
    };
    
    // Scroll functions
    const scrollLeft = () => {
      container.scrollBy({ left: -scrollAmount, behavior: 'smooth' });
    };
    
    const scrollRight = () => {
      container.scrollBy({ left: scrollAmount, behavior: 'smooth' });
    };
    
    // Keyboard navigation
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement === container) {
        switch (e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            scrollLeft();
            break;
          case 'ArrowRight':
            e.preventDefault();
            scrollRight();
            break;
        }
      }
    };
    
    // Touch/swipe support
    let startX = 0;
    let scrollLeftStart = 0;
    let isScrolling = false;
    
    const handleTouchStart = (e: TouchEvent) => {
      startX = e.touches[0].clientX;
      scrollLeftStart = container.scrollLeft;
      isScrolling = true;
    };
    
    const handleTouchMove = (e: TouchEvent) => {
      if (!isScrolling) return;
      e.preventDefault();
      
      const currentX = e.touches[0].clientX;
      const diffX = startX - currentX;
      container.scrollLeft = scrollLeftStart + diffX;
    };
    
    const handleTouchEnd = () => {
      isScrolling = false;
    };
    
    // Event listeners
    leftBtn.addEventListener('click', scrollLeft);
    rightBtn.addEventListener('click', scrollRight);
    container.addEventListener('scroll', updateButtons);
    container.addEventListener('keydown', handleKeyDown);
    container.addEventListener('touchstart', handleTouchStart, { passive: false });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    
    // Initial button state
    updateButtons();
    
    // Cleanup
    return () => {
      leftBtn.removeEventListener('click', scrollLeft);
      rightBtn.removeEventListener('click', scrollRight);
      container.removeEventListener('scroll', updateButtons);
      container.removeEventListener('keydown', handleKeyDown);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [recentEffects.length]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* SEO优化的主标题 - 隐藏但对SEO可见 */}
      <h1 className="sr-only">Cosnap AI - 专业AI二次元修图平台 | 动漫风格转换和头像生成</h1>
      
      {/* Hero Carousel */}
      <section className="relative h-64 sm:h-80 lg:h-96 overflow-hidden">
        <div className="relative w-full h-full">
          {featuredEffects.map((effect, index) => (
            <motion.div
              key={effect.id}
              className={`absolute inset-0 transition-opacity duration-500 ${
                index === currentSlide ? 'opacity-100' : 'opacity-0'
              }`}
            >
              <div className="relative w-full h-full">
                <SEOOptimizedImage
                  src={effect.afterImage}
                  alt={`${effect.name} AI effect preview - Transform your photos with ${effect.category} effects`}
                  title={`${effect.name} - AI ${effect.category} Effect`}
                  className="w-full h-full object-cover"
                  priority={index === 0} // Prioritize first image for LCP
                  loading={index === 0 ? 'eager' : 'lazy'}
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
                <div className="absolute bottom-0 left-0 p-6 sm:p-8 lg:p-12 text-white max-w-2xl">
                  <motion.h2
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 }}
                    className="text-2xl sm:text-3xl lg:text-4xl font-bold mb-2"
                  >
                    {effect.name}
                  </motion.h2>
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4 }}
                    className="text-sm sm:text-base text-gray-200 mb-4 line-clamp-2"
                  >
                    {effect.description}
                  </motion.p>
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.6 }}
                  >
                    <Link
                      to={`/effect/${effect.id}`}
                      className="inline-flex items-center space-x-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
                    >
                      <Sparkles className="h-5 w-5" />
                      <span>Try Now</span>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Carousel Indicators */}
        <div className="absolute bottom-4 right-4 flex space-x-2">
          {featuredEffects.map((_, index) => (
            <button
              key={index}
              onClick={() => setCurrentSlide(index)}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                index === currentSlide ? 'bg-white w-6' : 'bg-white/50'
              }`}
            />
          ))}
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Recent History */}
        {recentEffects.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <Clock className="h-6 w-6 text-purple-500" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  最近浏览的AI特效
                </h2>
              </div>
              <Link
                to="/profile"
                className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm font-medium"
              >
                View All
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {recentEffects.map((effect) => (
                <EffectCard key={effect.id} effect={effect} />
              ))}
            </div>
          </section>
        )}

        {/* Trending Effects */}
        {trendingEffects.length > 0 && (
          <section className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-6 w-6 text-pink-500" />
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                  🔥 热门AI二次元特效
                </h2>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
                  <span className="text-sm text-gray-600 dark:text-gray-400">Hot right now</span>
                </div>
              </div>
              <Link
                to="/effects"
                className="text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 text-sm font-medium"
              >
                Explore All
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {trendingEffects.map((effect, index) => (
                <motion.div
                  key={effect.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="relative"
                >
                  <div className="absolute -top-2 -right-2 z-10 bg-gradient-to-r from-red-500 to-orange-500 text-white text-xs px-2 py-1 rounded-full font-medium animate-pulse">
                    TRENDING
                  </div>
                  <EffectCard effect={effect} />
                </motion.div>
              ))}
            </div>
          </section>
        )}

        {/* Featured Categories */}
        <section className="mb-12">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
            🎌 二次元特效专区
          </h3>
          <div className="flex flex-wrap gap-3">
            {['二次元头像', '动漫风格', 'Kawaii风格', '日系滤镜', 'Portrait', 'Artistic', 'Fantasy', 'Video', 'FaceSwap', 'Edit'].map((category, index) => {
              // 特殊的二次元分类样式
              const isAnimeCategory = index < 4;
              const animeGradients = [
                'from-pink-500 to-purple-500', // 二次元头像
                'from-blue-500 to-purple-500',  // 动漫风格  
                'from-pink-400 to-rose-500',    // Kawaii风格
                'from-orange-400 to-purple-500' // 日系滤镜
              ];
              
              return (
                <Link
                  key={category}
                  to={`/effects?category=${category}`}
                  className={`group flex items-center space-x-2 px-4 py-3 rounded-full shadow-sm hover:shadow-md transition-all duration-300 ${
                    isAnimeCategory 
                      ? 'bg-gradient-to-r ' + animeGradients[index] + ' text-white hover:shadow-lg transform hover:scale-105 border-2 border-white/20' 
                      : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-purple-300 dark:hover:border-purple-600'
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform ${
                    isAnimeCategory 
                      ? 'bg-white/20 backdrop-blur-sm' 
                      : 'bg-gradient-to-br from-purple-500 to-pink-500'
                  }`}>
                    <Sparkles className={`h-3 w-3 ${isAnimeCategory ? 'text-white' : 'text-white'}`} />
                  </div>
                  <span className={`text-sm font-medium transition-colors ${
                    isAnimeCategory 
                      ? 'text-white group-hover:text-white' 
                      : 'text-gray-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400'
                  }`}>
                    {category}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>

        {/* FAQ Section for SEO */}
        <section className="mb-12">
          <FAQSection 
            faqs={homepageFAQs}
            title="Frequently Asked Questions"
            className="bg-white dark:bg-gray-800 rounded-xl p-6"
          />
        </section>

        {/* CTA Section */}
        <motion.section
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="bg-gradient-to-br from-purple-500 via-pink-500 to-purple-600 rounded-2xl p-8 sm:p-12 text-center text-white relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=%2260%22 height=%2260%22 viewBox=%220 0 60 60%22 xmlns=%22http://www.w3.org/2000/svg%22%3E%3Cg fill=%22none%22 fill-rule=%22evenodd%22%3E%3Cg fill=%22%23ffffff%22 fill-opacity=%220.1%22%3E%3Ccircle cx=%2230%22 cy=%2230%22 r=%224%22/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-30" />
          <div className="relative">
            <h2 className="text-2xl sm:text-3xl font-bold mb-4">
              🎌 准备创造你的二次元作品吗？
            </h2>
            <p className="text-lg opacity-90 mb-6 max-w-2xl mx-auto">
              加入我们的创作者社区，使用专业AI技术将你的照片转换为精美的动漫风格，
              体验最先进的二次元修图特效。
            </p>
            <Link
              to="/effects"
              className="inline-flex items-center space-x-2 bg-white text-purple-600 hover:bg-gray-100 px-8 py-4 rounded-lg font-semibold transition-all duration-300 transform hover:scale-105"
              title="Explore all AI photo effects and filters"
            >
              <Sparkles className="h-5 w-5" />
              <span>开始二次元创作</span>
            </Link>
          </div>
        </motion.section>
      </div>
    </div>
  );
};

export default Home;