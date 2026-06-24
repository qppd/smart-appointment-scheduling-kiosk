'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';

interface MobileBackButtonProps {
  fallbackHref?: string;
}

export function MobileBackButton({ fallbackHref = '/' }: MobileBackButtonProps) {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== 'undefined' && window.history.length > 1) {
      router.back();
    } else {
      router.push(fallbackHref);
    }
  };

  return (
    <button
      type="button"
      onClick={handleBack}
      aria-label="Go back"
      className="md:hidden inline-flex items-center justify-center h-10 w-10 rounded-lg text-gray-700 hover:bg-gray-100 active:bg-gray-200 transition-colors"
    >
      <ArrowLeft className="h-5 w-5" />
   </button>
  );
}
