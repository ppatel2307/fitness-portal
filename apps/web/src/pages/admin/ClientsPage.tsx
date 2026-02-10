/**
 * Admin Clients Management Page
 * CRUD operations for client accounts
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { api, getErrorMessage } from '@/lib/api';
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
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
  SkeletonTable,
} from '@/components/ui';
import type { ClientOverview, ApiResponse } from '@/types';
import {
  Plus,
  Edit,
  Key,
  UserX,
  UserCheck,
  Search,
  MoreVertical,
} from 'lucide-react';

const createClientSchema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(2, 'Name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  notes: z.string().optional(),
  goal: z.string().optional(),
  height: z.coerce.number().positive().optional().or(z.literal('')),
});

const editClientSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  notes: z.string().optional(),
  goal: z.string().optional(),
  height: z.coerce.number().positive().optional().or(z.literal('')),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

type CreateClientForm = z.infer<typeof createClientSchema>;
type EditClientForm = z.infer<typeof editClientSchema>;
type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export function ClientsPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [resetPasswordModalOpen, setResetPasswordModalOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<ClientOverview | null>(null);
  const [error, setError] = useState<string | null>(null);

  const createForm = useForm<CreateClientForm>({
    resolver: zodResolver(createClientSchema),
    defaultValues: {
      email: '',
      name: '',
      password: '',
      notes: '',
      goal: '',
      height: '',
    },
  });

  const editForm = useForm<EditClientForm>({
    resolver: zodResolver(editClientSchema),
  });

  const resetPasswordForm = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '' },
  });

  // Fetch clients
  const { data: clients, isLoading } = useQuery({
    queryKey: ['admin-clients-overview'],
    queryFn: async () => {
      const response = await api.get<ApiResponse<ClientOverview[]>>('/admin/clients-overview');
      return response.data.data;
    },
  });

  // Create client mutation
  const createMutation = useMutation({
    mutationFn: async (data: CreateClientForm) => {
      const response = await api.post('/users/clients', {
        ...data,
        height: data.height || undefined,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-clients-overview'] });
      setCreateModalOpen(false);
      createForm.reset();
      setError(null);
    },
    onError: (err) => {
      setError(getErrorMessage(err));
    },
  });

  // Update client mutation
  const updateMutation = useMutation({
    mutationFn: async (data: EditClientForm & { clientId: string }) => {
      const { clientId, ...updateData } = data;
      const response = await api.patch(`/users/clients/${clientId}`, {
        ...updateData,
        height: updateData.height || undefined,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-clients-overview'] });
      setEditModalOpen(false);
      setSelectedClient(null);
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ clientId, active }: { clientId: string; active: boolean }) => {
      const response = await api.patch(`/users/clients/${clientId}`, { active });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-clients-overview'] });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { clientId: string; newPassword: string }) => {
      const response = await api.post('/auth/admin/reset-password', data);
      return response.data;
    },
    onSuccess: () => {
      setResetPasswordModalOpen(false);
      setSelectedClient(null);
      resetPasswordForm.reset();
    },
  });

  const filteredClients = clients?.filter(
    (client) =>
      client.name.toLowerCase().includes(search.toLowerCase()) ||
      client.email.toLowerCase().includes(search.toLowerCase())
  );

  const handleEdit = (client: ClientOverview) => {
    setSelectedClient(client);
    editForm.reset({
      name: client.name,
      notes: '',
      goal: client.goal || '',
      height: '',
    });
    setEditModalOpen(true);
  };

  const handleResetPassword = (client: ClientOverview) => {
    setSelectedClient(client);
    resetPasswordForm.reset();
    setResetPasswordModalOpen(true);
  };

  const onCreateSubmit = (data: CreateClientForm) => {
    setError(null);
    createMutation.mutate(data);
  };

  const onEditSubmit = (data: EditClientForm) => {
    if (selectedClient) {
      updateMutation.mutate({ ...data, clientId: selectedClient.id });
    }
  };

  const onResetPasswordSubmit = (data: ResetPasswordForm) => {
    if (selectedClient) {
      resetPasswordMutation.mutate({
        clientId: selectedClient.id,
        newPassword: data.newPassword,
      });
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Clients"
        description="Manage your client accounts"
        actions={
          <Button onClick={() => setCreateModalOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Add Client
          </Button>
        }
      />

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Clients Table */}
      <Card padding="none">
        {isLoading ? (
          <SkeletonTable rows={5} />
        ) : !filteredClients || filteredClients.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title={search ? 'No matching clients' : 'No clients yet'}
              description={search ? 'Try a different search term' : 'Add your first client to get started'}
              action={
                !search
                  ? { label: 'Add Client', onClick: () => setCreateModalOpen(true) }
                  : undefined
              }
            />
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden md:table-cell">Goal</TableHead>
                <TableHead className="hidden md:table-cell">Last Check-in</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredClients.map((client) => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium text-text-primary">{client.name}</p>
                      <p className="text-xs text-text-muted">{client.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={client.active ? 'success' : 'error'}>
                      {client.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <span className="text-text-secondary truncate max-w-[200px] block">
                      {client.goal || '-'}
                    </span>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {client.lastCheckIn ? (
                      <div>
                        <p className="text-text-secondary">
                          {formatDate(client.lastCheckIn, 'short')}
                        </p>
                        {client.lastAdherence && (
                          <p className="text-xs text-text-muted">
                            Adherence: {client.lastAdherence}/10
                          </p>
                        )}
                      </div>
                    ) : (
                      <span className="text-text-muted">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEdit(client)}
                        title="Edit"
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleResetPassword(client)}
                        title="Reset Password"
                      >
                        <Key className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toggleActiveMutation.mutate({
                            clientId: client.id,
                            active: !client.active,
                          })
                        }
                        title={client.active ? 'Deactivate' : 'Activate'}
                      >
                        {client.active ? (
                          <UserX className="w-4 h-4 text-error" />
                        ) : (
                          <UserCheck className="w-4 h-4 text-success" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      {/* Create Client Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          createForm.reset();
          setError(null);
        }}
        title="Add New Client"
        size="lg"
      >
        <form onSubmit={createForm.handleSubmit(onCreateSubmit)} className="space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-error-muted text-error text-sm">
              {error}
            </div>
          )}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Full Name"
              error={createForm.formState.errors.name?.message}
              {...createForm.register('name')}
            />
            <Input
              label="Email"
              type="email"
              error={createForm.formState.errors.email?.message}
              {...createForm.register('email')}
            />
          </div>
          <Input
            label="Temporary Password"
            type="password"
            error={createForm.formState.errors.password?.message}
            {...createForm.register('password')}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Goal"
              placeholder="e.g., Build muscle"
              {...createForm.register('goal')}
            />
            <Input
              label="Height (cm)"
              type="number"
              {...createForm.register('height')}
            />
          </div>
          <Textarea
            label="Notes"
            placeholder="Any notes about this client..."
            {...createForm.register('notes')}
          />
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setCreateModalOpen(false);
                createForm.reset();
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Client
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Client Modal */}
      <Modal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          setSelectedClient(null);
        }}
        title={`Edit ${selectedClient?.name}`}
      >
        <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
          <Input
            label="Full Name"
            error={editForm.formState.errors.name?.message}
            {...editForm.register('name')}
          />
          <Input
            label="Goal"
            {...editForm.register('goal')}
          />
          <Input
            label="Height (cm)"
            type="number"
            {...editForm.register('height')}
          />
          <Textarea
            label="Notes"
            {...editForm.register('notes')}
          />
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setEditModalOpen(false);
                setSelectedClient(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={updateMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset Password Modal */}
      <Modal
        isOpen={resetPasswordModalOpen}
        onClose={() => {
          setResetPasswordModalOpen(false);
          setSelectedClient(null);
        }}
        title="Reset Password"
        description={`Set a new password for ${selectedClient?.name}`}
      >
        <form onSubmit={resetPasswordForm.handleSubmit(onResetPasswordSubmit)} className="space-y-4">
          <Input
            label="New Password"
            type="password"
            error={resetPasswordForm.formState.errors.newPassword?.message}
            {...resetPasswordForm.register('newPassword')}
          />
          <p className="text-xs text-text-muted">
            The client will be logged out of all devices and will need to use this new password.
          </p>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                setResetPasswordModalOpen(false);
                setSelectedClient(null);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" isLoading={resetPasswordMutation.isPending}>
              Reset Password
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
