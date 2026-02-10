/**
 * Admin Dashboard Page
 * Overview of all clients and activity
 */

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '@/lib/api';
import { formatDate, formatTime } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Badge,
  Button,
  SkeletonCard,
  EmptyState,
} from '@/components/ui';
import type { AdminDashboardStats, ApiResponse } from '@/types';
import {
  Users,
  Dumbbell,
  ClipboardCheck,
  Activity,
  ChevronRight,
  Plus,
} from 'lucide-react';

export function AdminDashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<AdminDashboardStats>>('/admin/dashboard');
      return response.data.data;
    },
  });

  if (isLoading) {
    return (
      <div className="p-4 md:p-6 space-y-6">
        <PageHeader title="Dashboard" description="Overview of your training business" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Dashboard"
        description="Overview of your training business"
        actions={
          <Link to="/admin/clients">
            <Button leftIcon={<Plus className="w-4 h-4" />}>
              New Client
            </Button>
          </Link>
        }
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          icon={<Users className="w-5 h-5" />}
          label="Total Clients"
          value={stats?.totalClients || 0}
          iconBg="bg-accent-muted"
          iconColor="text-accent"
        />
        <StatCard
          icon={<Dumbbell className="w-5 h-5" />}
          label="Workouts This Week"
          value={stats?.workoutsThisWeek || 0}
          iconBg="bg-success-muted"
          iconColor="text-success"
        />
        <StatCard
          icon={<ClipboardCheck className="w-5 h-5" />}
          label="Pending Check-ins"
          value={stats?.pendingCheckIns || 0}
          iconBg="bg-warning-muted"
          iconColor="text-warning"
        />
        <StatCard
          icon={<Activity className="w-5 h-5" />}
          label="Completions Today"
          value={
            stats?.latestCompletions?.filter(
              (c) =>
                new Date(c.completedAt).toDateString() === new Date().toDateString()
            ).length || 0
          }
          iconBg="bg-accent-muted"
          iconColor="text-accent"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Workout Completions */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Workout Completions</CardTitle>
            <Link to="/admin/clients">
              <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!stats?.latestCompletions || stats.latestCompletions.length === 0 ? (
              <EmptyState
                title="No completions yet"
                description="Client workout completions will appear here"
              />
            ) : (
              <div className="space-y-3">
                {stats.latestCompletions.slice(0, 5).map((completion) => (
                  <div
                    key={completion.id}
                    className="flex items-center justify-between p-3 bg-background-secondary rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-success-muted flex items-center justify-center">
                        <Dumbbell className="w-4 h-4 text-success" />
                      </div>
                      <div>
                        <p className="font-medium text-text-primary text-sm">
                          {completion.clientName}
                        </p>
                        <p className="text-xs text-text-muted">
                          Completed workout
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-text-secondary">
                        {formatDate(completion.completedAt, 'relative')}
                      </p>
                      <p className="text-xs text-text-muted">
                        {formatTime(completion.completedAt)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Check-ins */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Check-ins</CardTitle>
            <Link to="/admin/check-ins">
              <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
                View all
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            {!stats?.recentCheckIns || stats.recentCheckIns.length === 0 ? (
              <EmptyState
                title="No check-ins yet"
                description="Client check-ins will appear here"
              />
            ) : (
              <div className="space-y-3">
                {stats.recentCheckIns.map((checkIn) => (
                  <div
                    key={checkIn.id}
                    className="flex items-center justify-between p-3 bg-background-secondary rounded-lg"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-accent-muted flex items-center justify-center">
                        <ClipboardCheck className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium text-text-primary text-sm">
                          {checkIn.client?.name}
                        </p>
                        <div className="flex gap-2 text-xs text-text-muted">
                          <span>Energy: {checkIn.energy}/10</span>
                          <span>•</span>
                          <span>Adherence: {checkIn.adherence}/10</span>
                        </div>
                      </div>
                    </div>
                    <Badge
                      variant={
                        checkIn.adherence >= 8
                          ? 'success'
                          : checkIn.adherence >= 5
                          ? 'warning'
                          : 'error'
                      }
                      size="sm"
                    >
                      {checkIn.adherence >= 8
                        ? 'Great'
                        : checkIn.adherence >= 5
                        ? 'OK'
                        : 'Needs attention'}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Link to="/admin/clients">
              <QuickActionButton
                icon={<Users className="w-5 h-5" />}
                label="Manage Clients"
              />
            </Link>
            <Link to="/admin/workouts">
              <QuickActionButton
                icon={<Dumbbell className="w-5 h-5" />}
                label="Workout Plans"
              />
            </Link>
            <Link to="/admin/announcements">
              <QuickActionButton
                icon={<Activity className="w-5 h-5" />}
                label="Announcements"
              />
            </Link>
            <Link to="/admin/resources">
              <QuickActionButton
                icon={<ClipboardCheck className="w-5 h-5" />}
                label="Resources"
              />
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  iconBg,
  iconColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center`}>
            <span className={iconColor}>{icon}</span>
          </div>
          <div>
            <p className="text-2xl font-bold text-text-primary">{value}</p>
            <p className="text-xs text-text-muted">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function QuickActionButton({
  icon,
  label,
}: {
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2 p-4 bg-surface hover:bg-surface-hover rounded-lg transition-colors cursor-pointer">
      <div className="text-text-secondary">{icon}</div>
      <span className="text-sm font-medium text-text-primary">{label}</span>
    </div>
  );
}
