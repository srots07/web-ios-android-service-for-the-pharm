# Unified Platform

An enterprise-grade, polyglot monorepo unifying web, mobile (Android & iOS), a core asynchronous FastAPI backend, microservices, and a centralized event-driven PostgreSQL and RabbitMQ ecosystem.

---

## 🏛 Platform Architecture Overview

```
unified-platform/
│
├── apps/                                  # FRONTENDS + CORE BACKEND
│   ├── web/                               # Next.js 15 (App Router) + React 19 + TypeScript
│   ├── android/                           # Kotlin + Jetpack Compose + MVVM
│   ├── ios/                               # Swift + SwiftUI + MVVM
│   └── api/                               # Core Backend (FastAPI + SQLAlchemy Async + Outbox)
│
├── services/                              # INDEPENDENT MICROSERVICES
│   ├── report-service/                    # Async report rendering (PDF/Excel) & processing
│   ├── file-service/                      # S3/MinIO upload, validation, and malware scanning
│   ├── notification-service/              # FCM, APNs, in-app real-time alerts
│   └── integration-service/               # WhatsApp, OAuth2, OTP, Webhooks
│
├── packages/                              # SHARED CONTRACTS & PACKAGES
│   ├── api-contracts/                     # OpenAPI 3.1 & JSON Event Schemas
│   ├── typescript-client/                 # Typed API SDK for Web and Node
│   ├── typescript-types/                  # Shared Domain Interfaces
│   ├── validation-schemas/                # Client & Server Validation Rules
│   ├── design-tokens/                     # Cross-platform Design Tokens
│   └── shared-config/                     # Base ESLint, Prettier, and TypeScript configs
│
├── database/                              # CENTRAL POSTGRESQL ARCHITECTURE
│   ├── schemas/                           # Modular SQL schemas (core, workflow, reports, etc.)
│   ├── migrations/                        # One authoritative Alembic migration pipeline
│   ├── policies/                          # Multi-tenant Row-Level Security (RLS) policies
│   ├── seeds/                             # Development and staging seed data
│   ├── indexes/                           # High-concurrency performance tuning
│   └── backups/                           # Automated WAL archiving & snapshot routines
│
├── event-system/                          # EVENT-DRIVEN COMMUNICATION
│   ├── rabbitmq/                          # Exchanges, queues, bindings, and DLQs
│   ├── celery/                            # Distributed task scheduling & routing
│   ├── outbox/                            # Transactional Outbox pattern engine
│   ├── event_registry/                    # Central event catalog
│   └── schemas/                           # Event payload validation schemas
│
├── infrastructure/                        # DEVOPS & INFRASTRUCTURE AS CODE
│   ├── docker/                            # Multi-stage container definitions
│   ├── postgres/                          # Custom Postgres configs & extensions
│   ├── rabbitmq/                          # Cluster definitions & definition.json
│   ├── redis/                             # Cache policies & eviction configuration
│   ├── storage/                           # MinIO / S3 bucket provisioning
│   ├── nginx/                             # Reverse proxy & SSL termination
│   ├── monitoring/                        # Prometheus, Grafana, OpenTelemetry & Sentry
│   └── deployment/                        # Staging, production, and cloud deployment manifests
│
├── security/                              # CENTRAL SECURITY & THREAT MITIGATION
│   ├── threat-model/                      # STRIDE / Threat analysis documentation
│   ├── authentication/                    # OAuth2 / JWT / MFA specifications
│   ├── authorization/                     # RBAC & ABAC policy configurations
│   ├── encryption/                        # Encryption at rest & in transit guidelines
│   ├── api-security/                      # Rate limiting, CORS, DDoS mitigation
│   └── audit-logging/                     # Tamper-evident audit trail definitions
│
├── tests/                                 # PLATFORM-WIDE TEST SUITES
│   ├── unit/                              # Isolated component and logic tests
│   ├── integration/                       # Inter-service and database integration tests
│   ├── contract/                          # Consumer-driven contract tests (Pact / OpenAPI)
│   ├── end-to-end/                        # Cross-platform browser & mobile flow tests
│   └── performance/                       # Locust / k6 load simulation suites
│
└── docs/                                  # TECHNICAL SPECIFICATIONS & GUIDES
```

---

## 🚀 Quick Start

### 1. Prerequisites
- **Node.js**: v20+
- **pnpm**: v9+
- **Python**: v3.11+
- **Docker & Docker Compose**: v2.20+
- **JDK 17+** (for Android development)
- **Xcode 16+** (for iOS development, macOS only)

### 2. Environment Setup
Copy the template environment variables:
```bash
cp .env.example .env
```

### 3. Start Local Infrastructure
Run the containerized ecosystem (Postgres, Redis, RabbitMQ, MinIO, API, and Web):
```bash
docker compose up -d
```

Access the service dashboards:
- **Web App**: [http://localhost:3000](http://localhost:3000)
- **Core API Docs**: [http://localhost:8000/api/v1/docs](http://localhost:8000/api/v1/docs)
- **RabbitMQ Management**: [http://localhost:15672](http://localhost:15672) (User: `guest`, Pass: `guest`)
- **MinIO Console**: [http://localhost:9001](http://localhost:9001) (User: `minioadmin`, Pass: `minioadmin`)

### 4. Monorepo Scripts

Run dev servers with Turborepo:
```bash
pnpm dev
```

Build all packages and web app:
```bash
pnpm build
```

Run linting across workspaces:
```bash
pnpm lint
```

Run tests across workspaces:
```bash
pnpm test
```

---

## 🔄 Event-Driven & Transactional Outbox Pattern

To prevent dual-write anomalies across microservices, state mutations in the Core Backend write domain events directly to the `events.outbox` table in PostgreSQL within the same database transaction. The Outbox Publisher asynchronously dispatches these records to RabbitMQ exchanges, routing them to consumers in:
- `report-service`
- `file-service`
- `notification-service`
- `integration-service`

Dead-letter exchanges (DLX) and automated retries handle transient processing failures with full observability through OpenTelemetry and Sentry.

