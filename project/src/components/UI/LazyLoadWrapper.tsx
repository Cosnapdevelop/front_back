import React, { Suspense } from 'react';
import { LoadingState } from './LoadingState';

interface LazyLoadWrapperProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<any>;
  fallbackMessage?: string;
}

export const LazyLoadWrapper: React.FC<LazyLoadWrapperProps> = ({
  children,
  fallback: Fallback,
  fallbackMessage = 'Loading...',
}) => {
  const defaultFallback = <LoadingState fullScreen message={fallbackMessage} />;
  
  return (
    <Suspense fallback={Fallback ? <Fallback /> : defaultFallback}>
      {children}
    </Suspense>
  );
};

export default LazyLoadWrapper;