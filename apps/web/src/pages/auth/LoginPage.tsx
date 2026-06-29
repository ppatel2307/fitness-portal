import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/api';

interface LoginFormData {
  email: string;
  password: string;
}

export function LoginPage() {
  const { login, googleLogin } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');

  const { register, handleSubmit, formState: { errors } } = useForm<LoginFormData>();

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      await login(data.email, data.password);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSuccess = async (credentialResponse: { credential?: string }) => {
    if (!credentialResponse.credential) return;
    setIsLoading(true);
    try {
      await googleLogin(credentialResponse.credential);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to landing */}
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent transition mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to home
        </Link>

        <div className="text-center mb-8">
          <Link to="/" className="inline-flex flex-col items-center group">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-accent rounded-2xl mb-4 shadow-glow group-hover:scale-105 transition">
              <svg className="w-8 h-8 text-accent-fg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
              </svg>
            </div>
            <h1 className="text-2xl font-extrabold tracking-wide"><span className="text-accent neon-text">VEGGI</span> <span className="text-white">CHIKN</span></h1>
          </Link>
          <p className="text-text-secondary mt-1">Become unrecognizable.</p>
        </div>

        <div className="bg-surface border border-border rounded-2xl p-8 shadow-xl">
          {/* Sign In / Sign Up toggle */}
          <div className="flex gap-1.5 bg-background-secondary p-1.5 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => setMode('signin')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition ${
                mode === 'signin' ? 'bg-accent text-accent-fg' : 'text-text-secondary hover:text-white'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`flex-1 py-2.5 rounded-lg text-sm font-bold uppercase tracking-wider transition ${
                mode === 'signup' ? 'bg-accent text-accent-fg' : 'text-text-secondary hover:text-white'
              }`}
            >
              Sign Up
            </button>
          </div>

          <h2 className="text-lg font-semibold text-white mb-1">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="text-sm text-text-secondary mb-6">
            {mode === 'signin'
              ? 'Sign in to continue your transformation.'
              : 'Sign up with Google in one tap — your account is created instantly.'}
          </p>

          <div className="mb-6 flex justify-center">
            <GoogleLogin
              onSuccess={handleGoogleSuccess}
              onError={() => toast.error('Google sign in failed')}
              theme="filled_black"
              size="large"
              text={mode === 'signin' ? 'signin_with' : 'signup_with'}
            />
          </div>

          {mode === 'signin' ? (
            <>
              <div className="relative mb-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-surface text-text-muted">or continue with email</span>
                </div>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Email address</label>
                  <input
                    type="email"
                    autoComplete="email"
                    className="w-full px-4 py-3 bg-background-secondary border border-border rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition"
                    placeholder="you@example.com"
                    {...register('email', { required: 'Email is required' })}
                  />
                  {errors.email && <p className="text-error text-xs mt-1">{errors.email.message}</p>}
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1.5">Password</label>
                  <input
                    type="password"
                    autoComplete="current-password"
                    className="w-full px-4 py-3 bg-background-secondary border border-border rounded-xl text-white placeholder-text-muted focus:outline-none focus:ring-2 focus:ring-accent focus:border-transparent transition"
                    placeholder="••••••••"
                    {...register('password', { required: 'Password is required' })}
                  />
                  {errors.password && <p className="text-error text-xs mt-1">{errors.password.message}</p>}
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-accent hover:bg-accent-hover disabled:opacity-50 disabled:cursor-not-allowed text-accent-fg font-bold uppercase tracking-wider rounded-xl transition shadow-glow-sm hover:shadow-glow focus:outline-none"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-accent-fg border-t-transparent rounded-full animate-spin" />
                      Signing in...
                    </span>
                  ) : 'Sign in'}
                </button>
              </form>
            </>
          ) : (
            <p className="text-center text-xs text-text-muted">
              Email/password accounts are set up by your coach. New members sign up with Google above.
            </p>
          )}

          <p className="text-center text-xs text-text-muted mt-6">
            By continuing, you agree to our Terms of Service and Privacy Policy.
          </p>
        </div>
      </div>
    </div>
  );
}
