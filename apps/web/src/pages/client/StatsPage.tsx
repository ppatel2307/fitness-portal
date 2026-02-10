/**
 * Client Statistics Page
 * Weight tracking, progress charts, completion rates
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
} from 'recharts';
import { api } from '@/lib/api';
import { getToday, formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  Button,
  Input,
  Modal,
  Textarea,
  EmptyState,
  Badge,
} from '@/components/ui';
import { ImagePlaceholder } from '@/components/ui/ImagePlaceholder';
import type { WeightLog, ClientStats, ApiResponse } from '@/types';
import { Scale, TrendingUp, TrendingDown, Plus, Activity, Camera } from 'lucide-react';

const weightLogSchema = z.object({
  weight: z.coerce.number().positive('Weight must be positive'),
  note: z.string().optional(),
});

type WeightLogForm = z.infer<typeof weightLogSchema>;

export function StatsPage() {
  const queryClient = useQueryClient();
  const [addWeightOpen, setAddWeightOpen] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<WeightLogForm>({
    resolver: zodResolver(weightLogSchema),
  });

  // Fetch stats
  const { data: stats, isLoading } = useQuery({
    queryKey: ['my-stats'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<ClientStats>>('/progress/stats');
      return response.data.data;
    },
  });

  // Fetch weight logs
  const { data: weightLogs } = useQuery({
    queryKey: ['weight-logs'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<WeightLog[]>>('/progress/weight');
      return response.data.data;
    },
  });

  // Add weight log mutation
  const addWeightMutation = useMutation({
    mutationFn: async (data: WeightLogForm) => {
      const response = await api.post('/progress/weight', {
        ...data,
        date: getToday(),
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['weight-logs'] });
      queryClient.invalidateQueries({ queryKey: ['my-stats'] });
      setAddWeightOpen(false);
      reset();
    },
  });

  const onSubmit = (data: WeightLogForm) => {
    addWeightMutation.mutate(data);
  };

  // Calculate weight change
  const weightTrend = stats?.weightTrend || [];
  const latestWeight = weightTrend[weightTrend.length - 1];
  const weekAgoWeight = weightTrend[Math.max(0, weightTrend.length - 7)];
  const monthAgoWeight = weightTrend[0];

  const weekChange = latestWeight && weekAgoWeight
    ? (latestWeight.weight - weekAgoWeight.weight).toFixed(1)
    : null;
  const monthChange = latestWeight && monthAgoWeight
    ? (latestWeight.weight - monthAgoWeight.weight).toFixed(1)
    : null;

  // Format data for charts
  const weightChartData = weightTrend.map((log) => ({
    date: formatDate(log.date, 'short').replace(/,.*/, ''),
    weight: log.weight,
  }));

  const nutritionChartData = (stats?.nutritionTrend || []).map((item) => ({
    date: formatDate(item.date, 'short').replace(/,.*/, ''),
    calories: item._sum.calories || 0,
    protein: item._sum.protein || 0,
  }));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Statistics"
        description="Track your progress over time"
        actions={
          <Button onClick={() => setAddWeightOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Log Weight
          </Button>
        }
      />

      {/* Weight Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Scale className="w-4 h-4 text-accent" />
              <span className="text-sm text-text-secondary">Current Weight</span>
            </div>
            <p className="text-3xl font-bold text-text-primary">
              {latestWeight?.weight.toFixed(1) || '--'}
              <span className="text-lg text-text-muted ml-1">kg</span>
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-accent" />
              <span className="text-sm text-text-secondary">7-Day Change</span>
            </div>
            <div className="flex items-center gap-2">
              {weekChange !== null && (
                <>
                  {parseFloat(weekChange) < 0 ? (
                    <TrendingDown className="w-5 h-5 text-success" />
                  ) : parseFloat(weekChange) > 0 ? (
                    <TrendingUp className="w-5 h-5 text-warning" />
                  ) : null}
                  <p className={`text-3xl font-bold ${
                    parseFloat(weekChange) < 0 ? 'text-success' : 
                    parseFloat(weekChange) > 0 ? 'text-warning' : 'text-text-primary'
                  }`}>
                    {parseFloat(weekChange) > 0 ? '+' : ''}{weekChange}
                    <span className="text-lg text-text-muted ml-1">kg</span>
                  </p>
                </>
              )}
              {weekChange === null && <p className="text-3xl font-bold text-text-muted">--</p>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-4 h-4 text-accent" />
              <span className="text-sm text-text-secondary">30-Day Change</span>
            </div>
            <div className="flex items-center gap-2">
              {monthChange !== null && (
                <>
                  {parseFloat(monthChange) < 0 ? (
                    <TrendingDown className="w-5 h-5 text-success" />
                  ) : parseFloat(monthChange) > 0 ? (
                    <TrendingUp className="w-5 h-5 text-warning" />
                  ) : null}
                  <p className={`text-3xl font-bold ${
                    parseFloat(monthChange) < 0 ? 'text-success' : 
                    parseFloat(monthChange) > 0 ? 'text-warning' : 'text-text-primary'
                  }`}>
                    {parseFloat(monthChange) > 0 ? '+' : ''}{monthChange}
                    <span className="text-lg text-text-muted ml-1">kg</span>
                  </p>
                </>
              )}
              {monthChange === null && <p className="text-3xl font-bold text-text-muted">--</p>}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weight Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Weight Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {weightChartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={weightChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2c3642" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                    domain={['dataMin - 1', 'dataMax + 1']}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a2028',
                      border: '1px solid #2c3642',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#f1f5f9' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="weight"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title="No weight data"
              description="Start logging your weight to see trends"
              action={{
                label: 'Log Weight',
                onClick: () => setAddWeightOpen(true),
              }}
            />
          )}
        </CardContent>
      </Card>

      {/* Nutrition Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Nutrition Trend (Last 30 Days)</CardTitle>
        </CardHeader>
        <CardContent>
          {nutritionChartData.length > 0 ? (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={nutritionChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2c3642" />
                  <XAxis
                    dataKey="date"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="left"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                  />
                  <YAxis
                    yAxisId="right"
                    orientation="right"
                    stroke="#64748b"
                    fontSize={12}
                    tickLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1a2028',
                      border: '1px solid #2c3642',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#f1f5f9' }}
                  />
                  <Bar
                    yAxisId="left"
                    dataKey="calories"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    name="Calories"
                  />
                  <Bar
                    yAxisId="right"
                    dataKey="protein"
                    fill="#22c55e"
                    radius={[4, 4, 0, 0]}
                    name="Protein (g)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <EmptyState
              title="No nutrition data"
              description="Log your meals to see nutrition trends"
            />
          )}
        </CardContent>
      </Card>

      {/* Weekly Workout Stats */}
      <Card>
        <CardHeader>
          <CardTitle>This Week's Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-accent-muted flex items-center justify-center">
              <span className="text-2xl font-bold text-accent">
                {stats?.weeklyWorkoutsCompleted || 0}
              </span>
            </div>
            <div>
              <p className="text-lg font-semibold text-text-primary">
                Workouts Completed
              </p>
              <p className="text-sm text-text-secondary">This week</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Progress Photos Placeholder */}
      <Card>
        <CardHeader>
          <CardTitle>Progress Photos</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="text-center">
                <ImagePlaceholder type="progress" className="mb-2" />
                <p className="text-xs text-text-muted">Week {i + 1}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-muted mt-4 text-center">
            Progress photo upload coming soon
          </p>
        </CardContent>
      </Card>

      {/* Add Weight Modal */}
      <Modal
        isOpen={addWeightOpen}
        onClose={() => {
          setAddWeightOpen(false);
          reset();
        }}
        title="Log Weight"
        description={`Record your weight for ${formatDate(getToday(), 'long')}`}
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Weight (kg)"
            type="number"
            step="0.1"
            placeholder="e.g., 75.5"
            error={errors.weight?.message}
            {...register('weight')}
          />
          <Textarea
            label="Notes (optional)"
            placeholder="Any notes about this weigh-in..."
            {...register('note')}
          />
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => {
                setAddWeightOpen(false);
                reset();
              }}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1"
              isLoading={addWeightMutation.isPending}
            >
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
