/**
 * Admin Resources Page
 * Manage content library (PDFs, videos, links)
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api } from '@/lib/api';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Card,
  CardContent,
  Button,
  Input,
  Textarea,
  Select,
  Modal,
  Badge,
  EmptyState,
} from '@/components/ui';
import type { Resource, ApiResponse } from '@/types';
import { Plus, Trash2, ExternalLink, FolderOpen, FileText, Video, Brain } from 'lucide-react';

const resourceSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  url: z.string().url('Invalid URL'),
  category: z.enum(['NUTRITION', 'FORM', 'MINDSET', 'OTHER']),
});

type ResourceForm = z.infer<typeof resourceSchema>;

const categoryOptions = [
  { value: 'NUTRITION', label: 'Nutrition' },
  { value: 'FORM', label: 'Form & Technique' },
  { value: 'MINDSET', label: 'Mindset' },
  { value: 'OTHER', label: 'Other' },
];

const categoryIcons: Record<string, React.ReactNode> = {
  NUTRITION: <FileText className="w-4 h-4" />,
  FORM: <Video className="w-4 h-4" />,
  MINDSET: <Brain className="w-4 h-4" />,
  OTHER: <FolderOpen className="w-4 h-4" />,
};

const categoryColors: Record<string, string> = {
  NUTRITION: 'success',
  FORM: 'info',
  MINDSET: 'warning',
  OTHER: 'default',
};

export function ResourcesPage() {
  const queryClient = useQueryClient();
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [filter, setFilter] = useState<string>('');

  const form = useForm<ResourceForm>({
    resolver: zodResolver(resourceSchema),
    defaultValues: {
      title: '',
      description: '',
      url: '',
      category: 'OTHER',
    },
  });

  // Fetch resources
  const { data: resources, isLoading } = useQuery({
    queryKey: ['resources', filter],
    queryFn: async () => {
      const params = filter ? { category: filter } : {};
      const response = await api.get<ApiResponse<Resource[]>>('/content/resources', { params });
      return response.data.data;
    },
  });

  // Create resource mutation
  const createMutation = useMutation({
    mutationFn: async (data: ResourceForm) => {
      const response = await api.post('/content/resources', data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
      setCreateModalOpen(false);
      form.reset();
    },
  });

  // Delete resource mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/content/resources/${id}`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['resources'] });
    },
  });

  const onSubmit = (data: ResourceForm) => {
    createMutation.mutate(data);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Resources"
        description="Content library for your clients"
        actions={
          <Button onClick={() => setCreateModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Add Resource
          </Button>
        }
      />

      {/* Filter */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === '' ? 'primary' : 'secondary'}
          size="sm"
          onClick={() => setFilter('')}
        >
          All
        </Button>
        {categoryOptions.map((cat) => (
          <Button
            key={cat.value}
            variant={filter === cat.value ? 'primary' : 'secondary'}
            size="sm"
            onClick={() => setFilter(cat.value)}
          >
            {cat.label}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-4">
                <div className="h-4 bg-surface rounded w-1/3 mb-2" />
                <div className="h-3 bg-surface rounded w-2/3" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : !resources || resources.length === 0 ? (
        <EmptyState
          title="No resources"
          description="Add guides, videos, and links for your clients"
          action={{
            label: 'Add Resource',
            onClick: () => setCreateModalOpen(true),
          }}
          icon={<FolderOpen className="w-6 h-6 text-text-muted" />}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {resources.map((resource) => (
            <Card key={resource.id}>
              <CardContent className="pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={categoryColors[resource.category] as any}>
                        <span className="flex items-center gap-1">
                          {categoryIcons[resource.category]}
                          {resource.category.toLowerCase()}
                        </span>
                      </Badge>
                    </div>
                    <h3 className="font-semibold text-text-primary mb-1">
                      {resource.title}
                    </h3>
                    {resource.description && (
                      <p className="text-sm text-text-secondary mb-2 line-clamp-2">
                        {resource.description}
                      </p>
                    )}
                    <a
                      href={resource.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-sm text-accent hover:underline"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View resource
                    </a>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Delete this resource?')) {
                        deleteMutation.mutate(resource.id);
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
        title="Add Resource"
      >
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Title"
            error={form.formState.errors.title?.message}
            {...form.register('title')}
          />
          <Textarea
            label="Description"
            rows={2}
            {...form.register('description')}
          />
          <Input
            label="URL"
            placeholder="https://..."
            error={form.formState.errors.url?.message}
            {...form.register('url')}
          />
          <Select
            label="Category"
            options={categoryOptions}
            {...form.register('category')}
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
              Add Resource
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
