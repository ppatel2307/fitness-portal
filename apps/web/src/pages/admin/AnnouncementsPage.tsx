/**
 * Admin Announcements Page
 * Create and manage announcements for clients
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { formatDate } from '@/lib/utils';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Card,
  CardContent,
  Button,
  Input,
  Textarea,
  Modal,
  Badge,
  EmptyState,
} from '@/components/ui';
import type { Announcement, User, ApiResponse } from '@/types';
import { Plus, Trash2, Bell, Users } from 'lucide-react';

const announcementSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  body: z.string().min(1, 'Body is required'),
  audienceType: z.enum(['ALL', 'SPECIFIC']),
});

type AnnouncementForm = z.infer<typeof announcementSchema>;

export function AnnouncementsPage() {
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const form = useForm<AnnouncementForm>({
    resolver: zodResolver(announcementSchema),
    defaultValues: {
      title: '',
      body: '',
      audienceType: 'ALL',
    },
  });

  // Fetch announcements
  const { data: announcements, isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<Announcement[]>>('/content/announcements');
      return response.data.data;
    },
  });

  // Create announcement mutation
  const createMutation = useMutation({
    mutationFn: async (data: AnnouncementForm) => {
      const response = await api.post('/content/announcements', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
      setCreateModalOpen(false);
      form.reset();
    },
  });

  // Delete announcement mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/content/announcements/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  const onSubmit = (data: AnnouncementForm) => {
    createMutation.mutate(data);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Announcements"
        description="Broadcast messages to your clients"
        actions={
          <Button onClick={() => setCreateModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
            New Announcement
          </Button>
        }
      />

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-4">
                <div className="h-4 bg-surface rounded w-1/3 mb-2" />
                <div className="h-3 bg-surface rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !announcements || announcements.length === 0 ? (
        <EmptyState
          title="No announcements"
          description="Create your first announcement to share with clients"
          action={{
            label: 'New Announcement',
            onClick: () => setCreateModalOpen(true),
          }}
          icon={<Bell className="w-6 h-6 text-text-muted" />}
        />
      ) : (
        <div className="space-y-4">
          {announcements.map((announcement) => (
            <Card key={announcement.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-text-primary">
                        {announcement.title}
                      </h3>
                      <Badge
                        variant={announcement.audienceType === 'ALL' ? 'info' : 'default'}
                      >
                        {announcement.audienceType === 'ALL' ? 'All Clients' : 'Selected'}
                      </Badge>
                    </div>
                    <p className="text-text-secondary text-sm">{announcement.body}</p>
                    <p className="text-xs text-text-muted mt-2">
                      Posted {formatDate(announcement.createdAt, 'relative')}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Delete this announcement?')) {
                        deleteMutation.mutate(announcement.id);
                      }
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-error" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          form.reset();
        }}
        title="New Announcement"
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Title"
            error={form.formState.errors.title?.message}
            {...form.register('title')}
          />
          <Textarea
            label="Message"
            rows={4}
            error={form.formState.errors.body?.message}
            {...form.register('body')}
          />
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCreateModalOpen(false);
                form.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Post Announcement
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
