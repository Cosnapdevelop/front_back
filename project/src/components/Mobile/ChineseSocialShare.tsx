import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Share2, 
  MessageCircle, 
  Users, 
  Link2, 
  Copy, 
  QrCode,
  X,
  CheckCircle
} from 'lucide-react';

interface ShareData {
  title: string;
  description: string;
  imageUrl: string;
  url: string;
}

interface ChineseSocialShareProps {
  shareData: ShareData;
  isOpen: boolean;
  onClose: () => void;
}

interface SocialPlatform {
  id: string;
  name: string;
  icon: string;
  color: string;
  gradient: string;
  shareUrl: (data: ShareData) => string;
}

const ChineseSocialShare: React.FC<ChineseSocialShareProps> = ({
  shareData,
  isOpen,
  onClose
}) => {
  const [copied, setCopied] = useState(false);
  const [showQR, setShowQR] = useState(false);

  const socialPlatforms: SocialPlatform[] = [
    {
      id: 'wechat',
      name: '微信好友',
      icon: '💬',
      color: '#1aad19',
      gradient: 'from-green-500 to-green-600',
      shareUrl: () => `weixin://dl/moments` // WeChat sharing requires native app integration
    },
    {
      id: 'wechat-timeline',
      name: '朋友圈',
      icon: '🌟',
      color: '#1aad19',
      gradient: 'from-green-400 to-green-500',
      shareUrl: () => `weixin://dl/moments`
    },
    {
      id: 'qq',
      name: 'QQ',
      icon: '🐧',
      color: '#1296db',
      gradient: 'from-blue-500 to-blue-600',
      shareUrl: (data) => `mqqapi://share/to_fri?file_type=news&src_type=web&version=1&generalpastboard=1&file_data=${encodeURIComponent(JSON.stringify({
        app_name: 'Cosnap',
        descrip: data.description,
        title: data.title,
        url: data.url,
        previewimageUrl: data.imageUrl
      }))}`
    },
    {
      id: 'qq-zone',
      name: 'QQ空间',
      icon: '🏡',
      color: '#ffc337',
      gradient: 'from-yellow-400 to-yellow-500',
      shareUrl: (data) => `https://sns.qzone.qq.com/cgi-bin/qzshare/cgi_qzshare_onekey?url=${encodeURIComponent(data.url)}&title=${encodeURIComponent(data.title)}&desc=${encodeURIComponent(data.description)}&pics=${encodeURIComponent(data.imageUrl)}&site=Cosnap`
    },
    {
      id: 'weibo',
      name: '微博',
      icon: '🔥',
      color: '#e6162d',
      gradient: 'from-red-500 to-red-600',
      shareUrl: (data) => `https://service.weibo.com/share/share.php?url=${encodeURIComponent(data.url)}&title=${encodeURIComponent(`${data.title} ${data.description}`)}&pic=${encodeURIComponent(data.imageUrl)}&appkey=Cosnap`
    },
    {
      id: 'xiaohongshu',
      name: '小红书',
      icon: '📕',
      color: '#ff2442',
      gradient: 'from-red-400 to-pink-500',
      shareUrl: (data) => `xhsdiscover://item/create?title=${encodeURIComponent(data.title)}&content=${encodeURIComponent(data.description)}&image=${encodeURIComponent(data.imageUrl)}`
    },
    {
      id: 'douyin',
      name: '抖音',
      icon: '🎵',
      color: '#ff0050',
      gradient: 'from-pink-500 to-red-500',
      shareUrl: (data) => `snssdk1128://aweme/open_share?title=${encodeURIComponent(data.title)}&desc=${encodeURIComponent(data.description)}&url=${encodeURIComponent(data.url)}`
    },
    {
      id: 'bilibili',
      name: 'B站',
      icon: '📺',
      color: '#00a1d6',
      gradient: 'from-blue-400 to-cyan-500',
      shareUrl: (data) => `bilibili://share?title=${encodeURIComponent(data.title)}&content=${encodeURIComponent(data.description)}&url=${encodeURIComponent(data.url)}`
    }
  ];

  const handlePlatformShare = async (platform: SocialPlatform) => {
    // Add haptic feedback
    document.body.classList.add('haptic-light');
    setTimeout(() => document.body.classList.remove('haptic-light'), 100);

    try {
      // Try native app sharing first
      const shareUrl = platform.shareUrl(shareData);
      
      if (platform.id === 'wechat' || platform.id === 'wechat-timeline') {
        // For WeChat, show QR code or use Web Share API
        if (navigator.share) {
          await navigator.share({
            title: shareData.title,
            text: shareData.description,
            url: shareData.url
          });
        } else {
          setShowQR(true);
        }
      } else if (shareUrl.startsWith('http')) {
        // Web-based sharing
        window.open(shareUrl, '_blank', 'width=600,height=400');
      } else {
        // App-based sharing
        window.location.href = shareUrl;
      }
    } catch (error) {
      console.error('Share failed:', error);
      // Fallback to copy link
      handleCopyLink();
    }
    
    onClose();
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareData.url);
      setCopied(true);
      
      // Add haptic feedback
      document.body.classList.add('haptic-medium');
      setTimeout(() => document.body.classList.remove('haptic-medium'), 150);
      
      setTimeout(() => {
        setCopied(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Copy failed:', error);
    }
  };

  const handleQRShare = () => {
    setShowQR(true);
  };

  const generateQRCode = (text: string) => {
    // In a real app, you would use a QR code library like qrcode
    // For now, return a placeholder
    return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50"
            onClick={onClose}
          />
          
          {/* Share Panel */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed bottom-0 left-0 right-0 bg-white dark:bg-obsidian-900 rounded-t-3xl z-50 pb-safe"
            style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
          >
            {/* Handle */}
            <div className="w-12 h-1 bg-pearl-300 dark:bg-obsidian-600 rounded-full mx-auto mt-3 mb-6"></div>
            
            {/* Header */}
            <div className="px-6 mb-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-obsidian-900 dark:text-pearl-100">
                  分享到
                </h3>
                <button
                  onClick={onClose}
                  className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-pearl-100 dark:hover:bg-obsidian-800 transition-colors"
                >
                  <X className="h-5 w-5 text-obsidian-600 dark:text-pearl-400" />
                </button>
              </div>
              
              {/* Preview */}
              <div className="mt-4 p-3 bg-pearl-50 dark:bg-obsidian-800 rounded-xl">
                <div className="flex items-start space-x-3">
                  <img
                    src={shareData.imageUrl}
                    alt={shareData.title}
                    className="w-12 h-12 rounded-lg object-cover"
                  />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium text-obsidian-900 dark:text-pearl-100 truncate">
                      {shareData.title}
                    </h4>
                    <p className="text-sm text-obsidian-600 dark:text-pearl-400 line-clamp-2">
                      {shareData.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Social Platforms Grid */}
            <div className="px-6 mb-6">
              <div className="grid grid-cols-4 gap-4">
                {socialPlatforms.map((platform) => (
                  <motion.button
                    key={platform.id}
                    onClick={() => handlePlatformShare(platform)}
                    whileTap={{ scale: 0.95 }}
                    className="flex flex-col items-center space-y-2 p-3 rounded-xl hover:bg-pearl-100 dark:hover:bg-obsidian-800 transition-colors touch-feedback"
                  >
                    <div 
                      className={`w-12 h-12 rounded-xl flex items-center justify-center text-white bg-gradient-to-r ${platform.gradient}`}
                    >
                      <span className="text-xl">{platform.icon}</span>
                    </div>
                    <span className="text-xs font-medium text-obsidian-700 dark:text-pearl-300 text-center">
                      {platform.name}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="px-6 space-y-3">
              <button
                onClick={handleCopyLink}
                className="w-full flex items-center justify-center space-x-3 py-3 px-4 bg-pearl-100 dark:bg-obsidian-800 rounded-xl hover:bg-pearl-200 dark:hover:bg-obsidian-700 transition-colors touch-feedback"
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-5 w-5 text-mint-600" />
                    <span className="font-medium text-mint-600">已复制链接</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5 text-obsidian-600 dark:text-pearl-400" />
                    <span className="font-medium text-obsidian-900 dark:text-pearl-100">复制链接</span>
                  </>
                )}
              </button>
              
              <button
                onClick={handleQRShare}
                className="w-full flex items-center justify-center space-x-3 py-3 px-4 bg-pearl-100 dark:bg-obsidian-800 rounded-xl hover:bg-pearl-200 dark:hover:bg-obsidian-700 transition-colors touch-feedback"
              >
                <QrCode className="h-5 w-5 text-obsidian-600 dark:text-pearl-400" />
                <span className="font-medium text-obsidian-900 dark:text-pearl-100">生成二维码</span>
              </button>
            </div>
            
            <div className="h-6"></div>
          </motion.div>
          
          {/* QR Code Modal */}
          <AnimatePresence>
            {showQR && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="fixed inset-0 flex items-center justify-center bg-black/70 z-60 p-6"
                onClick={() => setShowQR(false)}
              >
                <motion.div
                  onClick={(e) => e.stopPropagation()}
                  className="bg-white dark:bg-obsidian-900 rounded-2xl p-6 max-w-sm w-full"
                >
                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-obsidian-900 dark:text-pearl-100 mb-4">
                      扫描二维码分享
                    </h3>
                    
                    <div className="bg-white p-4 rounded-xl inline-block shadow-lg">
                      <img
                        src={generateQRCode(shareData.url)}
                        alt="分享二维码"
                        className="w-48 h-48"
                      />
                    </div>
                    
                    <p className="text-sm text-obsidian-600 dark:text-pearl-400 mt-4 mb-6">
                      使用微信或其他应用扫描二维码
                    </p>
                    
                    <button
                      onClick={() => setShowQR(false)}
                      className="w-full py-3 px-6 bg-gradient-to-r from-mint-500 to-cosmic-500 text-white rounded-xl font-medium hover:shadow-lg transition-all duration-200 touch-feedback"
                    >
                      关闭
                    </button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      )}
    </AnimatePresence>
  );
};

export default ChineseSocialShare;