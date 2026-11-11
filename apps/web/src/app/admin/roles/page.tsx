"use client";

import React, { useState, useEffect, useCallback } from "react";
import { rolesApi } from "@/lib/api";
import {
  Shield,
  ShieldCheck,
  ShieldAlert,
  Plus,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  X,
  Users,
  Lock,
  Trash2,
  Edit2,
  Loader2,
  Check,
} from "lucide-react";

interface Permission {
  id: string;
  slug: string;
  name: string;
  module: string;
  description: string;
}

interface RoleDetail {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_system: boolean;
  created_at: string;
  permissions: Permission[];
  user_count: number;
}

export default function AdminRolesPage() {
  const [roles, setRoles] = useState<RoleDetail[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleDetail | null>(null);

  // Form state
  const [roleName, setRoleName] = useState("");
  const [roleDescription, setRoleDescription] = useState("");
  const [selectedPermIds, setSelectedPermIds] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchRolesAndPermissions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [rolesData, permsData] = await Promise.all([
        rolesApi.listRoles(),
        rolesApi.listPermissions(),
      ]);

      setRoles(rolesData as any || []);
      setPermissions(permsData as any || []);
    } catch (err: any) {
      setError(err.message || "Failed to load RBAC data.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRolesAndPermissions();
  }, [fetchRolesAndPermissions]);

  const openCreateModal = () => {
    setEditingRole(null);
    setRoleName("");
    setRoleDescription("");
    setSelectedPermIds([]);
    setShowModal(true);
  };

  const openEditModal = (role: RoleDetail) => {
    setEditingRole(role);
    setRoleName(role.name);
    setRoleDescription(role.description);
    setSelectedPermIds(role.permissions.map((p) => p.id));
    setShowModal(true);
  };

  const handleTogglePermission = (permId: string) => {
    if (editingRole?.slug === "super_admin") return; // Super admin immutable
    if (selectedPermIds.includes(permId)) {
      setSelectedPermIds(selectedPermIds.filter((id) => id !== permId));
    } else {
      setSelectedPermIds([...selectedPermIds, permId]);
    }
  };

  const handleToggleModuleAll = (modulePerms: Permission[]) => {
    if (editingRole?.slug === "super_admin") return;
    const modulePermIds = modulePerms.map((p) => p.id);
    const allSelected = modulePermIds.every((id) => selectedPermIds.includes(id));

    if (allSelected) {
      setSelectedPermIds(selectedPermIds.filter((id) => !modulePermIds.includes(id)));
    } else {
      const merged = Array.from(new Set([...selectedPermIds, ...modulePermIds]));
      setSelectedPermIds(merged);
    }
  };

  const handleSubmitRole = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setActionSuccess(null);

    try {
      if (editingRole) {
        await rolesApi.updateRole(editingRole.id, {
          name: roleName,
          description: roleDescription,
          permission_ids: selectedPermIds,
        });
        setActionSuccess(`Role '${roleName}' permissions updated successfully.`);
      } else {
        await rolesApi.createRole({
          name: roleName,
          description: roleDescription,
          permission_ids: selectedPermIds,
        });
        setActionSuccess(`Custom role '${roleName}' created successfully.`);
      }

      setShowModal(false);
      fetchRolesAndPermissions();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteRole = async (role: RoleDetail) => {
    if (role.is_system) return;
    if (!confirm(`Are you sure you want to delete the custom role '${role.name}'?`)) return;

    setError(null);
    setActionSuccess(null);
    try {
      await rolesApi.deleteRole(role.id);
      setActionSuccess(`Role '${role.name}' deleted successfully.`);
      fetchRolesAndPermissions();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Group permissions by module
  const permissionsByModule = permissions.reduce<Record<string, Permission[]>>((acc, perm) => {
    if (!acc[perm.module]) acc[perm.module] = [];
    acc[perm.module].push(perm);
    return acc;
  }, {});

  const systemRolesCount = roles.filter((r) => r.is_system).length;
  const customRolesCount = roles.filter((r) => !r.is_system).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-1 text-xs font-semibold text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
              Module W07
            </span>
            <span className="text-xs text-muted-foreground">PostgreSQL Persistence</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Roles & Permissions Architecture
          </h1>
          <p className="text-sm text-muted-foreground">
            Configure granular role-based access control (RBAC), enforce privilege segregation, and govern module boundaries.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchRolesAndPermissions()}
            disabled={loading}
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-medium text-foreground shadow-xs hover:bg-muted"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
          <button
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-emerald-800"
          >
            <Plus className="h-4 w-4" />
            Create Custom Role
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Total Roles Defined</p>
            <Shield className="h-4 w-4 text-emerald-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{roles.length}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">System Protected Roles</p>
            <Lock className="h-4 w-4 text-amber-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{systemRolesCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Custom Tailored Roles</p>
            <ShieldCheck className="h-4 w-4 text-sky-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{customRolesCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-muted-foreground">Governed Permissions</p>
            <ShieldAlert className="h-4 w-4 text-purple-600" />
          </div>
          <p className="mt-2 text-2xl font-bold text-foreground">{permissions.length}</p>
        </div>
      </div>

      {/* Action / Error Alerts */}
      {actionSuccess && (
        <div className="flex items-center justify-between rounded-lg bg-emerald-50 p-4 text-sm text-emerald-800 ring-1 ring-inset ring-emerald-600/20">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-700 hover:text-emerald-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div className="flex items-center justify-between rounded-lg bg-rose-50 p-4 text-sm text-rose-800 ring-1 ring-inset ring-rose-600/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className="text-rose-700 hover:text-rose-900">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Roles Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {roles.map((role) => (
          <div
            key={role.id}
            className="rounded-2xl border border-border bg-card p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-emerald-600/40 transition-colors"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-foreground text-lg">{role.name}</h3>
                    {role.is_system ? (
                      <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
                        <Lock className="h-3 w-3" /> System
                      </span>
                    ) : (
                      <span className="inline-flex items-center rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-800 ring-1 ring-inset ring-sky-600/20">
                        Custom
                      </span>
                    )}
                  </div>
                  <p className="font-mono text-xs text-muted-foreground mt-0.5">{role.slug}</p>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{role.user_count} Users</span>
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">{role.description}</p>

              {/* Permissions Preview Chips */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                  Granted Privileges ({role.permissions?.length || 0})
                </span>
                <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                  {role.permissions && role.permissions.length > 0 ? (
                    role.permissions.map((p) => (
                      <span
                        key={p.id}
                        className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 font-mono text-[10px] text-foreground"
                      >
                        {p.slug}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-muted-foreground italic">No permissions assigned.</span>
                  )}
                </div>
              </div>
            </div>

            {/* Role Actions */}
            <div className="flex items-center justify-between border-t border-border pt-3">
              <span className="text-[11px] text-muted-foreground">
                Defined: {new Date(role.created_at).toLocaleDateString()}
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => openEditModal(role)}
                  className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
                >
                  <Edit2 className="h-3.5 w-3.5" /> Configure
                </button>
                {!role.is_system && (
                  <button
                    onClick={() => handleDeleteRole(role)}
                    className="inline-flex items-center gap-1 rounded-md border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-medium text-rose-700 hover:bg-rose-100"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Delete
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Configure / Create Role Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-2xl rounded-2xl border border-border bg-card p-6 shadow-xl space-y-6 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-border pb-4 shrink-0">
              <div>
                <h3 className="font-bold text-foreground text-lg">
                  {editingRole ? `Configure Role: ${editingRole.name}` : "Create New Custom Role"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  Compose permissions across users, catalogue, procurement, quotations and administration.
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {editingRole?.slug === "super_admin" && (
              <div className="rounded-xl bg-amber-50 p-3 text-xs text-amber-800 ring-1 ring-inset ring-amber-600/20 shrink-0">
                <p className="font-semibold">Immutable System Role</p>
                <p>The Super Administrator role inherently possesses all current and future permissions.</p>
              </div>
            )}

            <form onSubmit={handleSubmitRole} className="space-y-4 overflow-y-auto pr-1 flex-1">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">Role Name *</label>
                  <input
                    type="text"
                    required
                    disabled={editingRole?.is_system}
                    value={roleName}
                    onChange={(e) => setRoleName(e.target.value)}
                    placeholder="e.g. Quality Assurance Auditor"
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Description *
                  </label>
                  <input
                    type="text"
                    required
                    value={roleDescription}
                    onChange={(e) => setRoleDescription(e.target.value)}
                    placeholder="Brief description of operational responsibilities..."
                    className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm text-foreground focus:border-emerald-600 focus:outline-hidden"
                  />
                </div>
              </div>

              {/* Permission Checklist Grouped by Module */}
              <div className="space-y-4 pt-2">
                <h4 className="text-xs font-semibold uppercase text-muted-foreground">
                  Module Permissions Checklist
                </h4>

                {Object.entries(permissionsByModule).map(([moduleName, modulePerms]) => {
                  const allSelected = modulePerms.every((p) => selectedPermIds.includes(p.id));

                  return (
                    <div
                      key={moduleName}
                      className="rounded-xl border border-border bg-muted/20 p-3.5 space-y-2.5"
                    >
                      <div className="flex items-center justify-between border-b border-border/60 pb-2">
                        <span className="font-semibold text-foreground text-sm">{moduleName} Module</span>
                        <button
                          type="button"
                          disabled={editingRole?.slug === "super_admin"}
                          onClick={() => handleToggleModuleAll(modulePerms)}
                          className="text-xs font-medium text-emerald-700 hover:text-emerald-900"
                        >
                          {allSelected ? "Deselect All" : "Select All"}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {modulePerms.map((perm) => {
                          const isChecked =
                            editingRole?.slug === "super_admin" || selectedPermIds.includes(perm.id);

                          return (
                            <label
                              key={perm.id}
                              className={`flex items-start gap-2.5 rounded-lg border p-2 cursor-pointer transition-colors ${
                                isChecked
                                  ? "border-emerald-500 bg-emerald-50/50 dark:bg-emerald-950/20"
                                  : "border-border bg-background hover:bg-muted/40"
                              }`}
                            >
                              <input
                                type="checkbox"
                                disabled={editingRole?.slug === "super_admin"}
                                checked={isChecked}
                                onChange={() => handleTogglePermission(perm.id)}
                                className="mt-0.5 rounded-sm border-border text-emerald-600 focus:ring-emerald-500"
                              />
                              <div className="text-xs">
                                <p className="font-medium text-foreground">{perm.name}</p>
                                <p className="font-mono text-[10px] text-muted-foreground">{perm.slug}</p>
                                <p className="text-[11px] text-muted-foreground mt-0.5">{perm.description}</p>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-border shrink-0">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-muted-foreground hover:bg-muted"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white shadow-xs hover:bg-emerald-800 disabled:opacity-50"
                >
                  {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                  {editingRole ? "Save Role Configuration" : "Create Role"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

