/**
 * Admin Clients Page
 * Single admin surface for client accounts: create, edit, activate,
 * reset password, assign manager, accountability tier, and charge ledger.
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import { api, getErrorMessage } from '@/lib/api';
import { formatUsd } from '@/lib/payment';
import { PageHeader } from '@/components/layout/PageHeader';
import {
  Button,
  Input,
  Textarea,
  Select,
  Modal,
  Badge,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  EmptyState,
  ErrorState,
  SkeletonTable,
} from '@/components/ui';
import type { ApiResponse } from '@/types';
import { Plus, Key, Pencil, Search, Users } from 'lucide-react';

interface ClientRow {
  id: string;
  name: string;
  email: string;
  active: boolean;
  createdAt: string;
  avatarUrl?: string;
  clientProfile?: { goal?: string | null; height?: number | null; weight?: number | null; notes?: string | null } | null;
  onboarding?: { completed: boolean } | null;
  workoutPlans?: { id: string; title: string }[];
  assignedManager?: { manager: { id: string; name: string } } | null;
  accountabilitySubscription?: { tier: string; active: boolean } | null;
  missedWorkoutCharges?: { amount: number }[];
}

interface Manager {
  id: string;
  name: string;
  email: string;
}

const createClientSchema = z.object({
  email: z.string().email('Invalid email'),
  name: z.string().min(2, 'Name is required'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  goal: z.string().optional(),
  height: z.coerce.number().positive().optional().or(z.literal('')),
  notes: z.string().optional(),
});

const editClientSchema = z.object({
  name: z.string().min(2, 'Name is required'),
  goal: z.string().optional(),
  height: z.coerce.number().positive().optional().or(z.literal('')),
  weight: z.coerce.number().positive().optional().or(z.literal('')),
  notes: z.string().optional(),
});

const resetPasswordSchema = z.object({
  newPassword: z.string().min(8, 'Password must be at least 8 characters'),
});

type CreateClientForm = z.infer<typeof createClientSchema>;
type EditClientForm = z.infer<typeof editClientSchema>;
type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export default function AdminUsersPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<ClientRow | null>(null);
  const [resettingPassword, setResettingPassword] = useState<ClientRow | null>(null);

  const clientsQuery = useQuery({
    queryKey: ['admin-clients'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<ClientRow[]>>('/admin/users?role=USER');
      return res.data.data ?? [];
    },
  });

  const managersQuery = useQuery({
    queryKey: ['admin-managers'],
    queryFn: async () => {
      const res = await api.get<ApiResponse<Manager[]>>('/admin/managers');
      return res.data.data ?? [];
    },
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['admin-clients'] });

  const createForm = useForm<CreateClientForm>({
    resolver: zodResolver(createClientSchema),
    defaultValues: { email: '', name: '', password: '', goal: '', height: '', notes: '' },
  });

  const editForm = useForm<EditClientForm>({ resolver: zodResolver(editClientSchema) });
  const resetForm = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { newPassword: '' },
  });

  const createMutation = useMutation({
    mutationFn: async (data: CreateClientForm) => {
      await api.post('/admin/users', {
        email: data.email,
        name: data.name,
        password: data.password,
        goal: data.goal || undefined,
        height: data.height === '' ? undefined : data.height,
        notes: data.notes || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Client created');
      refresh();
      setCreateOpen(false);
      createForm.reset();
    },
    onError: err => toast.error(getErrorMessage(err)),
  });

  const editMutation = useMutation({
    mutationFn: async (data: EditClientForm & { clientId: string }) => {
      const { clientId, ...rest } = data;
      await api.patch(`/admin/users/${clientId}`, {
        name: rest.name,
        goal: rest.goal || undefined,
        height: rest.height === '' ? undefined : rest.height,
        weight: rest.weight === '' ? undefined : rest.weight,
        notes: rest.notes || undefined,
      });
    },
    onSuccess: () => {
      toast.success('Client updated');
      refresh();
      setEditing(null);
    },
    onError: err => toast.error(getErrorMessage(err)),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ clientId, active }: { clientId: string; active: boolean }) => {
      await api.patch(`/admin/users/${clientId}`, { active });
    },
    onSuccess: (_data, vars) => {
      toast.success(vars.active ? 'Client activated' : 'Client deactivated');
      refresh();
    },
    onError: err => toast.error(getErrorMessage(err)),
  });

  const resetPasswordMutation = useMutation({
    mutationFn: async (data: { clientId: string; newPassword: string }) => {
      await api.post('/auth/admin/reset-password', data);
    },
    onSuccess: () => {
      toast.success('Password reset');
      setResettingPassword(null);
      resetForm.reset();
    },
    onError: err => toast.error(getErrorMessage(err)),
  });

  const assignManagerMutation = useMutation({
    mutationFn: async ({ clientId, managerId }: { clientId: string; managerId: string }) => {
      await api.post(`/admin/users/${clientId}/assign-manager`, { managerId });
    },
    onSuccess: () => {
      toast.success('Manager assigned');
      refresh();
    },
    onError: err => toast.error(getErrorMessage(err)),
  });

  const setTierMutation = useMutation({
    mutationFn: async ({ clientId, tier }: { clientId: string; tier: 'free' | 'accountability' }) => {
      await api.patch(`/admin/users/${clientId}/tier`, { tier });
    },
    onSuccess: (_data, vars) => {
      toast.success(`Tier set to ${vars.tier}`);
      refresh();
    },
    onError: err => toast.error(getErrorMessage(err)),
  });

  const addChargeMutation = useMutation({
    mutationFn: async (clientId: string) => {
      await api.post(`/admin/users/${clientId}/charge`, {});
    },
    onSuccess: () => {
      toast.success('$10 missed-workout charge added');
      refresh();
    },
    onError: err => toast.error(getErrorMessage(err)),
  });

  const markPaidMutation = useMutation({
    mutationFn: async (clientId: string) => {
      await api.post(`/admin/users/${clientId}/charges/mark-paid`);
    },
    onSuccess: () => {
      toast.success('Balance cleared');
      refresh();
    },
    onError: err => toast.error(getErrorMessage(err)),
  });

  const clients = clientsQuery.data ?? [];
  const managers = managersQuery.data ?? [];

  const filtered = clients.filter(
    c =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  const balanceOf = (c: ClientRow) =>
    (c.missedWorkoutCharges ?? []).reduce((sum, charge) => sum + charge.amount, 0);

  const openEdit = (client: ClientRow) => {
    setEditing(client);
    editForm.reset({
      name: client.name,
      goal: client.clientProfile?.goal ?? '',
      height: client.clientProfile?.height ?? '',
      weight: client.clientProfile?.weight ?? '',
      notes: client.clientProfile?.notes ?? '',
    });
  };

  const openResetPassword = (client: ClientRow) => {
    setResettingPassword(client);
    resetForm.reset();
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        title="Clients"
        description="Create accounts, manage profiles, tiers, and accountability charges"
        actions={
          <Button onClick={() => setCreateOpen(true)} leftIcon={<Plus className="w-4 h-4" />}>
            Add Client
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <Input
          placeholder="Search clients..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="pl-10"
          aria-label="Search clients"
        />
      </div>

      {clientsQuery.isLoading ? (
        <SkeletonTable rows={5} />
      ) : clientsQuery.isError ? (
        <ErrorState
          title="Couldn't load clients"
          message={getErrorMessage(clientsQuery.error)}
          onRetry={() => clientsQuery.refetch()}
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Users className="w-6 h-6 text-text-muted" />}
          title={search ? 'No clients match your search' : 'No clients yet'}
          description={search ? 'Try a different name or email.' : 'Create your first client account to get started.'}
          action={search ? undefined : { label: 'Add Client', onClick: () => setCreateOpen(true) }}
        />
      ) : (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Client</TableHead>
                <TableHead>Onboarding</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Manager</TableHead>
                <TableHead>Accountability</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(client => (
                <TableRow key={client.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {client.avatarUrl ? (
                        <img
                          src={client.avatarUrl}
                          alt=""
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-surface-hover border border-border rounded-full flex items-center justify-center">
                          <span className="text-xs font-medium text-text-primary">
                            {client.name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                      )}
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">{client.name}</p>
                        <p className="text-xs text-text-muted truncate">{client.email}</p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={client.onboarding?.completed ? 'success' : 'warning'}>
                      {client.onboarding?.completed ? 'Complete' : 'Pending'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {client.workoutPlans && client.workoutPlans.length > 0 ? (
                      <span className="text-sm">{client.workoutPlans[0].title}</span>
                    ) : (
                      <span className="text-sm text-text-muted">None</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Select
                      aria-label={`Manager for ${client.name}`}
                      options={[{ value: '', label: 'No manager' }, ...managers.map(m => ({ value: m.id, label: m.name }))]}
                      value={client.assignedManager?.manager.id ?? ''}
                      onChange={e =>
                        e.target.value &&
                        assignManagerMutation.mutate({ clientId: client.id, managerId: e.target.value })
                      }
                      disabled={assignManagerMutation.isPending}
                      className="text-xs py-1.5"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col gap-1.5 items-start">
                      <Select
                        aria-label={`Tier for ${client.name}`}
                        options={[
                          { value: 'free', label: 'Free' },
                          { value: 'accountability', label: 'Accountability' },
                        ]}
                        value={client.accountabilitySubscription?.tier === 'accountability' ? 'accountability' : 'free'}
                        onChange={e =>
                          setTierMutation.mutate({
                            clientId: client.id,
                            tier: e.target.value as 'free' | 'accountability',
                          })
                        }
                        className="text-xs py-1.5"
                      />
                      <span className={`text-xs font-semibold ${balanceOf(client) > 0 ? 'text-error' : 'text-text-muted'}`}>
                        Balance: {formatUsd(balanceOf(client))}
                      </span>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            if (confirm(`Add a $10 missed-workout charge for ${client.name}?`)) {
                              addChargeMutation.mutate(client.id);
                            }
                          }}
                          className="text-error text-xs"
                        >
                          +$10
                        </Button>
                        {balanceOf(client) > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => markPaidMutation.mutate(client.id)}
                            className="text-accent text-xs"
                          >
                            Clear
                          </Button>
                        )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant={client.active ? 'success' : 'error'}>
                      {client.active ? 'Active' : 'Inactive'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openEdit(client)}
                        aria-label={`Edit ${client.name}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openResetPassword(client)}
                        aria-label={`Reset password for ${client.name}`}
                      >
                        <Key className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          toggleActiveMutation.mutate({ clientId: client.id, active: !client.active })
                        }
                        className={client.active ? 'text-error text-xs' : 'text-success text-xs'}
                      >
                        {client.active ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Create client */}
      <Modal
        isOpen={createOpen}
        onClose={() => {
          setCreateOpen(false);
          createForm.reset();
        }}
        title="Add Client"
        description="Create an account for a new client. They can also self-serve via Google sign-in."
        size="lg"
      >
        <form onSubmit={createForm.handleSubmit(data => createMutation.mutate(data))} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Name"
              placeholder="Jane Doe"
              error={createForm.formState.errors.name?.message}
              {...createForm.register('name')}
            />
            <Input
              label="Email"
              type="email"
              placeholder="jane@example.com"
              error={createForm.formState.errors.email?.message}
              {...createForm.register('email')}
            />
          </div>
          <Input
            label="Temporary password"
            type="password"
            placeholder="At least 8 characters"
            error={createForm.formState.errors.password?.message}
            {...createForm.register('password')}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input label="Goal (optional)" placeholder="e.g. Lose 10 lbs" {...createForm.register('goal')} />
            <Input
              label="Height cm (optional)"
              type="number"
              step="0.1"
              error={createForm.formState.errors.height?.message}
              {...createForm.register('height')}
            />
          </div>
          <Textarea label="Notes (optional)" rows={2} {...createForm.register('notes')} />
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={createMutation.isPending}>
              Create Client
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit client */}
      <Modal
        isOpen={!!editing}
        onClose={() => setEditing(null)}
        title={editing ? `Edit ${editing.name}` : 'Edit Client'}
        size="lg"
      >
        <form
          onSubmit={editForm.handleSubmit(data => editing && editMutation.mutate({ ...data, clientId: editing.id }))}
          className="space-y-4"
        >
          <Input
            label="Name"
            error={editForm.formState.errors.name?.message}
            {...editForm.register('name')}
          />
          <Input label="Goal" placeholder="e.g. Build muscle" {...editForm.register('goal')} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Height (cm)"
              type="number"
              step="0.1"
              error={editForm.formState.errors.height?.message}
              {...editForm.register('height')}
            />
            <Input
              label="Weight (kg)"
              type="number"
              step="0.1"
              error={editForm.formState.errors.weight?.message}
              {...editForm.register('weight')}
            />
          </div>
          <Textarea label="Notes" rows={3} {...editForm.register('notes')} />
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button type="submit" isLoading={editMutation.isPending}>
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      {/* Reset password */}
      <Modal
        isOpen={!!resettingPassword}
        onClose={() => setResettingPassword(null)}
        title={resettingPassword ? `Reset password — ${resettingPassword.name}` : 'Reset Password'}
        description="The client will use this password on their next sign-in."
      >
        <form
          onSubmit={resetForm.handleSubmit(
            data =>
              resettingPassword &&
              resetPasswordMutation.mutate({ clientId: resettingPassword.id, newPassword: data.newPassword })
          )}
          className="space-y-4"
        >
          <Input
            label="New password"
            type="password"
            placeholder="At least 8 characters"
            error={resetForm.formState.errors.newPassword?.message}
            {...resetForm.register('newPassword')}
          />
          <div className="flex gap-2 justify-end pt-2">
            <Button type="button" variant="secondary" onClick={() => setResettingPassword(null)}>
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
