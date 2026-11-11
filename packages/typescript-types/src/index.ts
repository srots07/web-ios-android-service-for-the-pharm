export interface HealthStatus {
  status: "healthy" | "unhealthy" | "degraded";
  service: string;
  version?: string;
}

export interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: "admin" | "member" | "viewer";
  organizationId: string;
  createdAt: string;
}

export interface Organization {
  id: string;
  name: string;
  slug: string;
  tier: "free" | "pro" | "enterprise";
  createdAt: string;
}

export interface DashboardSummary {
  users_count: number;
  organizations_count: number;
  active_workflows: number;
  pending_tasks: number;
}

