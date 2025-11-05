import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/router';
import { useAuth } from '@/lib/hooks/use-auth';
import { useEffect } from 'react';

export default function Home() {
  const router = useRouter();
  const { user, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && user) {
      router.push('/dashboard');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 to-slate-800 flex flex-col items-center justify-center">
      <div className="text-center max-w-2xl mx-auto px-4">
        <h1 className="text-5xl font-bold text-white mb-4">MailAgent</h1>
        <p className="text-xl text-gray-300 mb-8">
          AI-powered email assistant with voice support, smart email management, and advanced analytics
        </p>

        <div className="flex gap-4 justify-center mb-12">
          <Link href="/auth/login">
            <Button size="lg" className="bg-blue-600 hover:bg-blue-700">
              Sign In
            </Button>
          </Link>
          <Link href="/auth/register">
            <Button size="lg" variant="outline">
              Create Account
            </Button>
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-16">
          <div className="bg-slate-800 p-6 rounded-lg">
            <h3 className="text-white font-bold mb-2">Smart Email</h3>
            <p className="text-gray-400">Connect multiple email accounts and manage them in one place</p>
          </div>
          <div className="bg-slate-800 p-6 rounded-lg">
            <h3 className="text-white font-bold mb-2">AI Assistant</h3>
            <p className="text-gray-400">Chat with an AI that understands your emails and suggests smart replies</p>
          </div>
          <div className="bg-slate-800 p-6 rounded-lg">
            <h3 className="text-white font-bold mb-2">Voice Support</h3>
            <p className="text-gray-400">Use voice commands to read and compose emails hands-free</p>
          </div>
        </div>
      </div>
    </div>
  );
}
