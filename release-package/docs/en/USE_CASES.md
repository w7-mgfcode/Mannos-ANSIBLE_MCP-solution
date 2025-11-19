# Use Cases

> Real-world examples and scenarios for the Ansible MCP Server

## Table of Contents

1. [Basic Use Cases](#basic-use-cases)
2. [Kubernetes Deployments](#kubernetes-deployments)
3. [Docker Infrastructure](#docker-infrastructure)
4. [Security & Hardening](#security--hardening)
5. [Database Management](#database-management)
6. [Monitoring Setup](#monitoring-setup)
7. [CI/CD Integration](#cicd-integration)
8. [Multi-Cloud Deployments](#multi-cloud-deployments)

---

## Basic Use Cases

### 1. Quick Nginx Setup

**Prompt**:
```
Install and configure nginx as a reverse proxy on Ubuntu servers
```

**Generated Playbook**:
```yaml
---
- name: Install and Configure Nginx Reverse Proxy
  hosts: "{{ target_hosts | default('webservers') }}"
  become: yes
  vars:
    nginx_upstream_servers:
      - "127.0.0.1:8080"
    nginx_server_name: "{{ server_name | default('example.com') }}"

  tasks:
    - name: Install nginx
      apt:
        name: nginx
        state: present
        update_cache: yes
      tags: [install]

    - name: Configure nginx reverse proxy
      template:
        src: reverse_proxy.conf.j2
        dest: /etc/nginx/sites-available/reverse_proxy
        mode: '0644'
      notify: reload nginx
      tags: [configure]

    - name: Enable site configuration
      file:
        src: /etc/nginx/sites-available/reverse_proxy
        dest: /etc/nginx/sites-enabled/reverse_proxy
        state: link
      notify: reload nginx
      tags: [configure]

    - name: Ensure nginx is running
      service:
        name: nginx
        state: started
        enabled: yes
      tags: [service]

  handlers:
    - name: reload nginx
      service:
        name: nginx
        state: reloaded
```

**Execution**:
```bash
# Generate
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{"tool": "generate_playbook", "arguments": {"prompt": "Install nginx as reverse proxy on Ubuntu"}}'

# Run with check mode
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{"tool": "run_playbook", "arguments": {"playbook_path": "/tmp/ansible-mcp/playbook_xxx.yml", "check_mode": true}}'
```

---

### 2. User Management

**Prompt**:
```
Create system users with SSH keys and sudo access for the development team
```

**API Call**:
```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Create system users with SSH keys and sudo access for development team",
      "context": {
        "target_hosts": "all",
        "environment": "development",
        "tags": ["users", "security", "ssh"]
      }
    }
  }'
```

**Use Case Details**:
- Creates standardized user accounts
- Configures SSH public key authentication
- Sets up sudo privileges with proper restrictions
- Applies consistent password policies

---

### 3. Package Updates

**Prompt**:
```
Update all packages and reboot if kernel was updated on production servers
```

**Generated Features**:
- Checks for available updates
- Applies security patches first
- Handles kernel updates with conditional reboot
- Waits for servers to come back online
- Validates services after reboot

---

## Kubernetes Deployments

### 1. Production Web Application

**Prompt**:
```
Deploy a scalable web application to Kubernetes with 3 replicas,
health checks, resource limits, and Ingress configuration for production
```

**API Call**:
```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Deploy scalable web app to Kubernetes with 3 replicas, health checks, resource limits, Ingress for production",
      "template": "kubernetes_deployment",
      "context": {
        "target_hosts": "k8s_master",
        "environment": "production",
        "tags": ["kubernetes", "deploy", "production"]
      }
    }
  }'
```

**Generated Features**:
- Deployment with 3 replicas
- Resource requests and limits
- Liveness and readiness probes
- ConfigMap for configuration
- Secret for sensitive data
- Service (ClusterIP/LoadBalancer)
- Ingress with TLS
- HorizontalPodAutoscaler

### 2. Database Cluster

**Prompt**:
```
Deploy PostgreSQL cluster on Kubernetes with persistent storage,
automated backups, and monitoring integration
```

**Generated Features**:
- StatefulSet for PostgreSQL
- PersistentVolumeClaims
- Automated backup CronJob
- PostgreSQL Exporter for Prometheus
- Network Policies for security

### 3. Microservices Architecture

**Prompt**:
```
Deploy microservices with service mesh (Istio), distributed tracing,
and centralized logging on Kubernetes
```

**Generated Features**:
- Multiple Deployments
- Istio VirtualService and DestinationRule
- Jaeger integration
- Fluentd/EFK stack configuration

---

## Docker Infrastructure

### 1. Docker Host Setup

**Prompt**:
```
Install Docker and Docker Compose on Ubuntu 22.04 with proper security
configuration and log rotation
```

**API Call**:
```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Install Docker and Docker Compose on Ubuntu 22.04 with security and log rotation",
      "template": "docker_setup"
    }
  }'
```

**Generated Features**:
- Docker CE installation from official repository
- Docker Compose v2 plugin
- User permissions (docker group)
- Daemon configuration:
  - Log rotation (max-size: 10m, max-file: 3)
  - Storage driver configuration
  - Live restore enabled
- UFW rules for Docker
- System resource limits

### 2. Container Registry

**Prompt**:
```
Set up a private Docker registry with authentication, TLS, and
garbage collection on the infrastructure
```

**Generated Features**:
- Registry container deployment
- Nginx reverse proxy with SSL
- htpasswd authentication
- Automated garbage collection
- S3/MinIO storage backend option

### 3. Docker Swarm Cluster

**Prompt**:
```
Initialize Docker Swarm cluster with 3 managers and 5 workers,
encrypted overlay networks, and Traefik load balancer
```

**Generated Features**:
- Swarm initialization
- Manager/Worker join tokens
- Overlay networks with encryption
- Traefik deployment as global service
- Portainer for management UI

---

## Security & Hardening

### 1. System Hardening

**Prompt**:
```
Apply CIS benchmark security hardening to Ubuntu servers including
SSH hardening, firewall, and audit logging
```

**API Call**:
```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Apply CIS security hardening to Ubuntu: SSH hardening, firewall, audit logging",
      "template": "system_hardening",
      "context": {
        "environment": "production",
        "tags": ["security", "hardening", "compliance"]
      }
    }
  }'
```

**Generated Features**:
- SSH hardening:
  - Disable root login
  - Key-only authentication
  - Strong ciphers and MACs
  - Login grace time limits
- UFW/iptables configuration
- Fail2ban installation and configuration
- Auditd rules
- Kernel parameter hardening (sysctl)
- File permission corrections
- Unnecessary service disabling

### 2. SSL/TLS Certificate Management

**Prompt**:
```
Set up automatic SSL certificate management with Let's Encrypt and
auto-renewal for web servers
```

**Generated Features**:
- Certbot installation
- ACME challenge handling
- Certificate generation
- Auto-renewal cron job
- Nginx/Apache integration

### 3. Secrets Management

**Prompt**:
```
Configure HashiCorp Vault for secrets management with AppRole authentication
and automatic secret rotation
```

**Generated Features**:
- Vault installation/configuration
- AppRole setup
- KV secrets engine
- Secret rotation policies
- Integration with applications

---

## Database Management

### 1. PostgreSQL Setup

**Prompt**:
```
Install PostgreSQL 15 with replication, automated backups to S3,
and monitoring with pg_stat_statements
```

**API Call**:
```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Install PostgreSQL 15 with replication, S3 backups, pg_stat_statements monitoring",
      "context": {
        "target_hosts": "database_servers",
        "environment": "production"
      }
    }
  }'
```

**Generated Features**:
- PostgreSQL 15 installation
- Primary/Replica configuration
- Streaming replication
- pgBackRest for backups
- S3 backup destination
- pg_stat_statements extension
- PostgreSQL Exporter for Prometheus

### 2. MySQL/MariaDB Cluster

**Prompt**:
```
Deploy MariaDB Galera cluster with 3 nodes, ProxySQL load balancing,
and automated failover
```

**Generated Features**:
- Galera cluster setup
- wsrep configuration
- ProxySQL deployment
- Read/write split
- Monitoring integration

### 3. Redis Cluster

**Prompt**:
```
Set up Redis Sentinel cluster with 3 nodes for high availability caching
```

**Generated Features**:
- Redis installation
- Sentinel configuration
- Master/Slave replication
- Automatic failover
- Persistence configuration

---

## Monitoring Setup

### 1. Full Observability Stack

**Prompt**:
```
Deploy complete monitoring stack with Prometheus, Grafana, AlertManager,
and Loki for log aggregation
```

**API Call**:
```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Deploy monitoring: Prometheus, Grafana, AlertManager, Loki for logs",
      "context": {
        "target_hosts": "monitoring_servers",
        "environment": "production",
        "tags": ["monitoring", "observability"]
      }
    }
  }'
```

**Generated Features**:
- Prometheus server
- Node Exporter on all hosts
- Grafana with dashboards
- AlertManager with routes
- Loki + Promtail
- Pre-configured dashboards
- Slack/Email alerting

### 2. Application Performance Monitoring

**Prompt**:
```
Set up distributed tracing with Jaeger and application metrics
collection for microservices
```

**Generated Features**:
- Jaeger all-in-one/production
- OpenTelemetry collectors
- Service mesh integration
- Trace sampling configuration

### 3. Log Management

**Prompt**:
```
Deploy ELK stack (Elasticsearch, Logstash, Kibana) for centralized
log management with Filebeat agents
```

**Generated Features**:
- Elasticsearch cluster
- Logstash pipelines
- Kibana dashboards
- Filebeat on all hosts
- Index lifecycle management

---

## CI/CD Integration

### 1. Jenkins Pipeline

**Prompt**:
```
Install Jenkins with recommended plugins, configure GitHub integration,
and set up a sample declarative pipeline
```

**API Call**:
```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Install Jenkins with plugins, GitHub integration, sample declarative pipeline",
      "context": {
        "target_hosts": "cicd_servers",
        "tags": ["jenkins", "cicd", "automation"]
      }
    }
  }'
```

**Generated Features**:
- Jenkins LTS installation
- Plugin installation (Git, Pipeline, Docker, etc.)
- GitHub webhook configuration
- Credentials management
- Sample Jenkinsfile

### 2. GitLab CI/CD

**Prompt**:
```
Set up GitLab Runner with Docker executor for CI/CD pipelines,
cache configuration, and artifact storage
```

**Generated Features**:
- GitLab Runner installation
- Docker executor configuration
- Shared cache (S3/MinIO)
- Artifact storage
- Runner registration

### 3. ArgoCD GitOps

**Prompt**:
```
Deploy ArgoCD for GitOps-based Kubernetes deployments with
RBAC and SSO integration
```

**Generated Features**:
- ArgoCD installation
- Application CRDs
- RBAC configuration
- OIDC/LDAP integration
- Notification configuration

---

## Multi-Cloud Deployments

### 1. AWS Infrastructure

**Prompt**:
```
Provision AWS infrastructure with VPC, EC2 instances, RDS database,
and S3 bucket using Ansible
```

**API Call**:
```bash
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Provision AWS: VPC, EC2, RDS, S3 bucket",
      "context": {
        "environment": "production",
        "tags": ["aws", "cloud", "infrastructure"]
      }
    }
  }'
```

**Generated Features**:
- VPC with public/private subnets
- Security groups
- EC2 instances with tags
- RDS PostgreSQL/MySQL
- S3 bucket with policies
- IAM roles

### 2. Azure Infrastructure

**Prompt**:
```
Deploy Azure resources including Resource Group, Virtual Network,
Virtual Machines, and Azure SQL Database
```

**Generated Features**:
- Resource group
- Virtual network + subnets
- Network security groups
- Virtual machines
- Azure SQL
- Storage accounts

### 3. Hybrid Cloud

**Prompt**:
```
Set up VPN connectivity between on-premises data center and AWS VPC
with failover to Azure
```

**Generated Features**:
- VPN gateway configuration
- BGP routing
- Failover configuration
- Network ACLs
- Monitoring

---

## Advanced Scenarios

### Disaster Recovery

**Prompt**:
```
Implement disaster recovery automation with database failover,
DNS switching, and application state recovery
```

### Blue-Green Deployment

**Prompt**:
```
Set up blue-green deployment infrastructure with traffic switching
and automatic rollback capability
```

### Compliance Automation

**Prompt**:
```
Implement SOC2 compliance automation with regular audits,
evidence collection, and remediation playbooks
```

---

## Best Practices

### 1. Use Context for Better Results

```bash
# Always provide context for production workloads
curl -X POST http://localhost:3000/execute \
  -H "Content-Type: application/json" \
  -d '{
    "tool": "generate_playbook",
    "arguments": {
      "prompt": "Deploy Redis cluster",
      "context": {
        "target_hosts": "redis_servers",
        "environment": "production",
        "tags": ["redis", "cache", "ha"]
      }
    }
  }'
```

### 2. Validate Before Execution

```bash
# Always validate generated playbooks
playbook_path=$(generate_playbook ...)

# Validate
curl -X POST http://localhost:3000/execute \
  -d '{"tool": "validate_playbook", "arguments": {"playbook_path": "'$playbook_path'", "strict": true}}'

# Lint
curl -X POST http://localhost:3000/execute \
  -d '{"tool": "lint_playbook", "arguments": {"playbook_path": "'$playbook_path'"}}'

# Dry run
curl -X POST http://localhost:3000/execute \
  -d '{"tool": "run_playbook", "arguments": {"playbook_path": "'$playbook_path'", "check_mode": true}}'
```

### 3. Use Refinement for Complex Tasks

```bash
# If first generation isn't perfect, refine it
curl -X POST http://localhost:3000/execute \
  -d '{
    "tool": "refine_playbook",
    "arguments": {
      "playbook_path": "'$playbook_path'",
      "feedback": "Add error handling, make idempotent, add rollback capability"
    }
  }'
```

---

**Next**: [API Reference](API_REFERENCE.md) | [Configuration](CONFIGURATION.md) | [Troubleshooting](TROUBLESHOOTING.md)
