/**
 * Client Settings Page
 * Profile settings and password change
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, getErrorMessage } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Select,
  Badge,
} from '@/components/ui';
import type { User, ApiResponse } from '@/types';
import { User as UserIcon, Lock, Check, AlertCircle } from 'lucide-react';

const profileSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  height: z.coerce.number().positive().optional().or(z.literal('')),
  goal: z.string().optional(),
  timezone: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  confirmPassword: z.string(),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ProfileForm = z.infer<typeof profileSchema>;
type PasswordForm = z.infer<typeof passwordSchema>;

const timezones = [
  { value: 'America/New_York', label: 'Eastern Time (ET)' },
  { value: 'America/Chicago', label: 'Central Time (CT)' },
  { value: 'America/Denver', label: 'Mountain Time (MT)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (PT)' },
  { value: 'Europe/London', label: 'London (GMT)' },
  { value: 'Europe/Paris', label: 'Paris (CET)' },
  { value: 'Asia/Tokyo', label: 'Tokyo (JST)' },
  { value: 'Australia/Sydney', label: 'Sydney (AEDT)' },
  { value: 'UTC', label: 'UTC' },
];

export function SettingsPage() {
  const { user, updateUser } = useAuth();
  const queryClient = useQueryClient();
  const [profileSuccess, setProfileSuccess] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  const profileForm = useForm<ProfileForm>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || '',
      height: user?.clientProfile?.height || '',
      goal: user?.clientProfile?.goal || '',
      timezone: user?.clientProfile?.timezone || 'UTC',
    },
  });

  const passwordForm = useForm<PasswordForm>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: '',
      newPassword: '',
      confirmPassword: '',
    },
  });

  // Update profile mutation
  const profileMutation = useMutation({
    mutationFn: async (data: ProfileForm) => {
      const response = await api.patch<ApiResponse<User>>('/users/profile', {
        ...data,
        height: data.height || undefined,
      });
      return response.data.data;
    },
    onSuccess: (data) => {
      if (data) {
        updateUser(data);
      }
      setProfileSuccess(true);
      setTimeout(() => setProfileSuccess(false), 3000);
    },
  });

  // Change password mutation
  const passwordMutation = useMutation({
    mutationFn: async (data: PasswordForm) => {
      const response = await api.post('/auth/change-password', {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      return response.data;
    },
    onSuccess: () => {
      setPasswordSuccess(true);
      setPasswordError(null);
      passwordForm.reset();
      setTimeout(() => setPasswordSuccess(false), 3000);
    },
    onError: (error) => {
      setPasswordError(getErrorMessage(error));
    },
  });

  const onProfileSubmit = (data: ProfileForm) => {
    profileMutation.mutate(data);
  };

  const onPasswordSubmit = (data: PasswordForm) => {
    setPasswordError(null);
    passwordMutation.mutate(data);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Settings"
        description="Manage your profile and preferences"
      />

      {/* Profile Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-accent" />
            <CardTitle>Profile Information</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
            {profileSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success-muted text-success text-sm">
                <Check className="w-4 h-4" />
                Profile updated successfully
              </div>
            )}

            <Input
              label="Full Name"
              error={profileForm.formState.errors.name?.message}
              {...profileForm.register('name')}
            />

            <Input
              label="Email"
              type="email"
              value={user?.email || ''}
              disabled
              hint="Contact your trainer to change your email"
            />

            <Input
              label="Height (cm)"
              type="number"
              placeholder="e.g., 175"
              error={profileForm.formState.errors.height?.message}
              {...profileForm.register('height')}
            />

            <Input
              label="Goal"
              placeholder="e.g., Build muscle, lose fat"
              error={profileForm.formState.errors.goal?.message}
              {...profileForm.register('goal')}
            />

            <Select
              label="Timezone"
              options={timezones}
              error={profileForm.formState.errors.timezone?.message}
              {...profileForm.register('timezone')}
            />

            <Button
              type="submit"
              isLoading={profileMutation.isPending}
            >
              Save Changes
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Password Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Lock className="w-5 h-5 text-accent" />
            <CardTitle>Change Password</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
            {passwordSuccess && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-success-muted text-success text-sm">
                <Check className="w-4 h-4" />
                Password changed successfully
              </div>
            )}

            {passwordError && (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-error-muted text-error text-sm">
                <AlertCircle className="w-4 h-4" />
                {passwordError}
              </div>
            )}

            <Input
              label="Current Password"
              type="password"
              error={passwordForm.formState.errors.currentPassword?.message}
              {...passwordForm.register('currentPassword')}
            />

            <Input
              label="New Password"
              type="password"
              error={passwordForm.formState.errors.newPassword?.message}
              {...passwordForm.register('newPassword')}
            />

            <Input
              label="Confirm New Password"
              type="password"
              error={passwordForm.formState.errors.confirmPassword?.message}
              {...passwordForm.register('confirmPassword')}
            />

            <div className="text-xs text-text-muted space-y-1">
              <p>Password requirements:</p>
              <ul className="list-disc list-inside">
                <li>At least 8 characters</li>
                <li>At least one uppercase letter</li>
                <li>At least one lowercase letter</li>
                <li>At least one number</li>
              </ul>
            </div>

            <Button
              type="submit"
              isLoading={passwordMutation.isPending}
            >
              Change Password
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Account Info */}
      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-text-secondary">Account Type</span>
              <Badge variant="info">{user?.role}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Account Status</span>
              <Badge variant={user?.active ? 'success' : 'error'}>
                {user?.active ? 'Active' : 'Inactive'}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-text-secondary">Member Since</span>
              <span className="text-text-primary">
                {user?.createdAt
                  ? new Date(user.createdAt).toLocaleDateString()
                  : '--'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
