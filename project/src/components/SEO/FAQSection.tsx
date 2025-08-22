import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { StructuredData, generateFAQSchema } from './StructuredData';

interface FAQItem {
  question: string;
  answer: string;
  keywords?: string[];
}

interface FAQSectionProps {
  faqs: FAQItem[];
  title?: string;
  className?: string;
  collapsible?: boolean;
}

export const FAQSection: React.FC<FAQSectionProps> = ({
  faqs,
  title = "Frequently Asked Questions",
  className = '',
  collapsible = true
}) => {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set([0])); // First item open by default

  const toggleItem = (index: number) => {
    if (!collapsible) return;
    
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  // Generate FAQ structured data
  const faqSchema = generateFAQSchema(faqs);

  return (
    <section className={`faq-section ${className}`} aria-labelledby="faq-title">
      <StructuredData data={faqSchema} type="faq" />
      
      <h2 id="faq-title" className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
        {title}
      </h2>
      
      <div className="space-y-4">
        {faqs.map((faq, index) => {
          const isOpen = !collapsible || openItems.has(index);
          
          return (
            <div
              key={index}
              className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden"
            >
              <button
                className={`w-full px-6 py-4 text-left flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors ${
                  !collapsible ? 'cursor-default' : ''
                }`}
                onClick={() => toggleItem(index)}
                aria-expanded={isOpen}
                aria-controls={`faq-answer-${index}`}
                disabled={!collapsible}
              >
                <h3 className="text-lg font-medium text-gray-900 dark:text-white pr-4">
                  {faq.question}
                </h3>
                {collapsible && (
                  <span className="flex-shrink-0 text-gray-500">
                    {isOpen ? (
                      <ChevronUp className="w-5 h-5" />
                    ) : (
                      <ChevronDown className="w-5 h-5" />
                    )}
                  </span>
                )}
              </button>
              
              <div
                id={`faq-answer-${index}`}
                className={`overflow-hidden transition-all duration-300 ${
                  isOpen ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
                aria-hidden={!isOpen}
              >
                <div className="px-6 pb-4 text-gray-700 dark:text-gray-300 leading-relaxed">
                  {faq.answer}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};

// Predefined FAQ content for different sections
export const homepageFAQs: FAQItem[] = [
  {
    question: "What is Cosnap AI and how does it work?",
    answer: "Cosnap AI is a free online photo editor that uses artificial intelligence to enhance and transform your photos. Our AI models analyze your images and apply professional-quality effects automatically, including portrait enhancement, artistic filters, background removal, and style transfers. Simply upload your photo, choose an effect, and get professional results in seconds.",
    keywords: ["AI photo editor", "how it works", "image processing", "photo enhancement"]
  },
  {
    question: "Is Cosnap AI completely free to use?",
    answer: "Yes! Cosnap AI offers free access to all our core AI effects and features. You can process unlimited photos without any subscription fees or hidden costs. No signup is required for basic features, though creating an account allows you to save your work and access additional community features.",
    keywords: ["free", "pricing", "no subscription", "unlimited photos"]
  },
  {
    question: "What image formats does Cosnap AI support?",
    answer: "Cosnap AI supports all major image formats including JPG, JPEG, PNG, WebP, and GIF files. You can upload images up to 30MB in size. For best results, we recommend using high-resolution images with good lighting.",
    keywords: ["supported formats", "file size", "JPG", "PNG", "image requirements"]
  },
  {
    question: "How long does it take to process photos with AI effects?",
    answer: "Most AI effects are processed within 5-15 seconds, depending on the complexity of the effect and your image size. Portrait enhancements typically take 5-10 seconds, while artistic style transfers may take 10-15 seconds. Processing is done in real-time with progress indicators.",
    keywords: ["processing time", "speed", "real-time", "AI effects"]
  },
  {
    question: "Can I use Cosnap AI on mobile devices?",
    answer: "Absolutely! Cosnap AI is fully optimized for mobile devices and works seamlessly on smartphones and tablets. Our responsive design ensures you get the full functionality whether you're using iOS, Android, or desktop browsers.",
    keywords: ["mobile", "smartphone", "tablet", "iOS", "Android", "responsive"]
  },
  {
    question: "Is my photo data safe and private with Cosnap AI?",
    answer: "Yes, we take privacy seriously. Your uploaded photos are processed securely and are automatically deleted from our servers after processing. We don't store, share, or use your images for any purpose other than applying the requested effects. All processing happens on secure servers with encryption.",
    keywords: ["privacy", "security", "data protection", "photo safety"]
  }
];

export const effectsFAQs: FAQItem[] = [
  {
    question: "How do I choose the right AI effect for my photo?",
    answer: "Different effects work best for different types of photos. Portrait effects are ideal for selfies and people photos, artistic filters work great with landscapes and creative shots, and background effects are perfect when you want to change or remove backgrounds. Each effect shows a preview to help you decide.",
    keywords: ["choosing effects", "portrait effects", "artistic filters", "background effects"]
  },
  {
    question: "Can I adjust the intensity of AI effects?",
    answer: "Yes! Most effects come with adjustable parameters that let you control the intensity and style. You can fine-tune settings like strength, style variation, and specific color adjustments to get exactly the look you want.",
    keywords: ["adjust effects", "intensity", "parameters", "customization"]
  },
  {
    question: "What's the difference between portrait and artistic effects?",
    answer: "Portrait effects are specifically designed to enhance photos of people, focusing on skin smoothing, eye enhancement, and natural beauty improvements. Artistic effects transform any photo into different art styles like paintings, sketches, or abstract art, regardless of the subject matter.",
    keywords: ["portrait vs artistic", "people photos", "art styles", "effect categories"]
  }
];

export const communityFAQs: FAQItem[] = [
  {
    question: "How do I share my AI-enhanced photos in the community?",
    answer: "After processing your photo with any AI effect, you'll see a 'Share to Community' button. You can add a title, description, and tags to help others discover your work. All shared photos are public and can be liked and commented on by other users.",
    keywords: ["sharing photos", "community features", "public gallery"]
  },
  {
    question: "Can I follow other artists and see their latest work?",
    answer: "Yes! You can follow your favorite artists in the community to see their latest AI-enhanced photos in your personalized feed. You can also discover new artists through trending posts and category browsing.",
    keywords: ["following artists", "personalized feed", "trending posts"]
  }
];

// Hook to get relevant FAQs based on current page
export const useFAQsForPage = (page: string): FAQItem[] => {
  switch (page) {
    case '/':
    case '/home':
      return homepageFAQs;
    case '/effects':
      return effectsFAQs;
    case '/community':
      return communityFAQs;
    default:
      return homepageFAQs.slice(0, 3); // Show 3 most common FAQs
  }
};

export default FAQSection;