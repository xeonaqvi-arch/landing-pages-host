import React, { useState } from 'react';
import { LayoutTemplate, Mail, Lock, User as UserIcon, AlertCircle } from 'lucide-react';
import { Button } from './ui/Button';
import { loginWithEmail, registerWithEmail, loginWithGoogle, loginAnonymously } from '../services/firebase';

interface AuthPageProps {
  onSuccess: () => void;
}

export const AuthPage: React.FC<AuthPageProps> = ({ onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (isLogin) {
        await loginWithEmail(email, password);
      } else {
        if (!name.trim()) throw new Error("Name is required.");
        await registerWithEmail(name, email, password);
      }
      onSuccess();
    } catch (err: any) {
      // Improve user-facing error messages
      let msg = err.message;
      
      // Handle standard Firebase Auth errors
      if (err.code === 'auth/invalid-credential' || err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        msg = "Incorrect email or password. If you don't have an account, please Sign Up.";
      } else if (err.code === 'auth/email-already-in-use') {
        msg = "Email is already in use. Please Sign In instead.";
      } else if (err.code === 'auth/weak-password') {
        msg = "Password should be at least 6 characters.";
      } else if (err.code === 'auth/invalid-email') {
        msg = "Please enter a valid email address.";
      }
      
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await loginWithGoogle();
      onSuccess();
    } catch (err: any) {
      // If service handles fallback, we shouldn't get here for config errors
      setError("Google sign in failed.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setError(null);
    setIsLoading(true);
    try {
      await loginAnonymously();
      onSuccess();
    } catch (err: any) {
      setError("Guest login failed.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100">
        
        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center">
          <div className="inline-flex items-center justify-center p-3 bg-indigo-600 rounded-xl shadow-lg mb-4">
            <LayoutTemplate className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Landing Page AI</h1>
          <p className="text-gray-500 text-sm">Create high-converting pages in seconds.</p>
        </div>

        {/* Auth Tabs */}
        <div className="flex border-b border-gray-100 px-8">
          <button
            onClick={() => { setIsLogin(true); setError(null); }}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              isLogin ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Sign In
          </button>
          <button
            onClick={() => { setIsLogin(false); setError(null); }}
            className={`flex-1 py-3 text-sm font-medium border-b-2 transition-colors ${
              !isLogin ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
          >
            Create Account
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mx-8 mt-6 p-3 bg-red-50 border border-red-100 rounded-lg flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1">{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-8 pt-6 space-y-4">
          {!isLogin && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-500 uppercase">Full Name</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <UserIcon className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  required={!isLogin}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-sm"
                  placeholder="John Doe"
                />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase">Email Address</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Mail className="w-4 h-4" />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-sm"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-gray-500 uppercase">Password</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Lock className="w-4 h-4" />
              </div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 outline-none transition-all text-sm"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
          </div>

          <Button 
            type="submit" 
            className="w-full mt-4" 
            isLoading={isLoading}
          >
            {isLogin ? 'Sign In' : 'Create Account'}
          </Button>

          <div className="relative py-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-gray-200"></div>
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-gray-400">Or continue with</span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
             <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="flex items-center justify-center px-4 py-2 border border-gray-200 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-200 disabled:opacity-50 transition-all"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.84z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                />
              </svg>
              Google
            </button>
            <button
              type="button"
              onClick={handleGuestLogin}
              disabled={isLoading}
              className="flex items-center justify-center px-4 py-2 border border-gray-200 rounded-lg shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-gray-200 disabled:opacity-50 transition-all"
            >
              Guest
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}