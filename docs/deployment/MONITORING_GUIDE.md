# MONITORING & OBSERVABILITY GUIDE
## Health Checks, Metrics & Log Aggregation

This guide describes operational monitoring procedures for maintaining uptime and performance for PRIME by Activist.

---

### 1. Health & Readiness Probes

The application provides standardized HTTP endpoints for external monitoring services (such as UptimeRobot, Datadog, Prometheus, or AWS Route53):

| Endpoint | Probe Type | Downstream Dependencies Verified | Expected Response |
| :--- | :--- | :--- | :--- |
| `GET /api/v1/health` | Liveness | Basic process execution, uptime | `HTTP 200` `{"status":"healthy"}` |
| `GET /api/v1/health/ready` | Readiness | PostgreSQL database connectivity | `HTTP 200` `{"status":"ready", "checks":{"database":"connected"}}` |
| `GET /api/health` | Web Liveness | Next.js Node process & event loop | `HTTP 200` `{"status":"healthy"}` |

> [!IMPORTANT]
> If PostgreSQL connectivity is severed, `/api/v1/health/ready` immediately fails closed with **HTTP 503 Service Unavailable**.

---

### 2. Log Ingestion & Monitoring

1. **Structured Nginx Access Logs:**
   - Logged at `/var/log/nginx/access.log`.
   - Records `$request_time`, `$upstream_connect_time`, and `$upstream_response_time` to identify latency bottlenecks.
2. **Container Logs:**
   - Collected using the Docker JSON logging driver.
   - Run `docker compose -f infrastructure/deployment/docker-compose.production.yml logs -f --tail=100 api` to inspect live application failures.
3. **Data Scrubbing Policy:**
   - Passwords, access tokens, refresh tokens, and credit card numbers are strictly barred from application loggers.

---

### 3. Recommended Operational Alert Thresholds

| Metric | Warning Threshold | Critical Threshold | Action Required |
| :--- | :--- | :--- | :--- |
| **API Error Rate (5xx)** | $> 0.5\%$ | $> 2.0\%$ | Inspect error logs; evaluate rollback |
| **P95 Latency** | $> 800\text{ ms}$ | $> 2000\text{ ms}$ | Inspect database query performance & connection pool |
| **Readiness Probe Failure**| 1 failure | 3 consecutive failures | Alert on-call engineer; restart database or API |
| **Host CPU Utilization** | $> 75\%$ for 10 min | $> 90\%$ for 5 min | Scale server compute or increase Uvicorn worker count |
| **Host Memory Usage** | $> 80\%$ | $> 90\%$ | Check memory leaks in Node or Python processes |
| **Disk Storage Usage** | $> 80\%$ | $> 90\%$ | Run `backup.sh` cleanup and prune old Docker images |

