import React from 'react';

export default function LoadingSpinner({ size = 'md', message }: { size?: 'sm' | 'md' | 'lg'; message?: string }) {
  const sizeClasses = { sm: 'h-6 w-6', md: 'h-10 w-10', lg: 'h-16 w-16' };
  return (
    <div className="flex flex-col items-center justify-center py-12">
      <div className={`${sizeClasses[size]} animate-spin rounded-full border-4 border-gray-200 border-t-teal-600`} />
      {message && <p className="mt-3 text-gray-500 text-sm">{message}</p>}
    </div>
  );
}
