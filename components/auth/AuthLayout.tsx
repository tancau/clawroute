import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

export function AuthLayout({ children }: AuthLayoutProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface-base px-4">
      <div className="w-full max-w-md space-y-6">
        {/* Brand */}
        <div className="text-center">
          <h1 className="text-3xl font-bold gradient-text mb-2">HopLLM</h1>
          <p className="text-sm text-neutral-7">Smart Router Config Generator</p>
        </div>

        {children}

        {/* Back to home */}
        <div className="text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm text-neutral-7 hover:text-neutral-10 transition-colors duration-fast"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to home
          </Link>
        </div>
      </div>
    </div>
  );
}
