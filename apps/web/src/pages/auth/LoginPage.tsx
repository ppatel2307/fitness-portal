/**
 * Login page
 * Authentication for clients and admins
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useAuth } from '@/contexts/AuthContext';
import { getErrorMessage } from '@/lib/api';
import { Button, Input, Card } from '@/components/ui';
import { Eye, EyeOff } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  rememberMe: z.boolean().optional(),
});

type LoginForm = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setError(null);
      await login(data.email, data.password, data.rememberMe);
    } catch (err) {
      setError(getErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-text-primary">FitPortal</h1>
          <p className="text-text-secondary mt-2">Sign in to your account</p>
        </div>

        <Card className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <div className="p-3 rounded-lg bg-error-muted text-error text-sm">
                {error}
              </div>
            )}

            <Input
              label="Email"
              type="email"
              placeholder="you@example.com"
              error={errors.email?.message}
              {...register('email')}
            />

            <div className="relative">
              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                error={errors.password?.message}
                {...register('password')}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-[34px] text-text-muted hover:text-text-secondary"
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="rememberMe"
                className="w-4 h-4 rounded border-border bg-surface text-accent focus:ring-accent"
                {...register('rememberMe')}
              />
              <label
                htmlFor="rememberMe"
                className="ml-2 text-sm text-text-secondary"
              >
                Remember me
              </label>
            </div>

            <Button
              type="submit"
              className="w-full"
              isLoading={isSubmitting}
            >
              Sign in
            </Button>
          </form>
        </Card>

        {/* Demo credentials hint */}
        <div className="mt-6 p-4 bg-surface rounded-lg border border-border">
          <p className="text-xs text-text-muted mb-2">Demo credentials:</p>
          <div className="space-y-1 text-xs text-text-secondary">
            <p>
              <span className="text-text-muted">Admin:</span> admin@fitportal.com / Admin123!
            </p>
            <p>
              <span className="text-text-muted">Client:</span> john@example.com / Client123!
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
