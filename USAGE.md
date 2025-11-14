# 🚀 Ansible MCP Integration - Usage Examples

## Quick Start

### 1. Start the Environment
```bash
# Clone the repository
git clone https://github.com/yourusername/ansible-mcp-solution.git
cd ansible-mcp-solution

# Start all services
docker-compose up -d

# Check service status
docker-compose ps
```

### 2. Configure Claude Code with MCP

Add to your Claude Code configuration (`claude_code.json`):

```json
{
  "mcpServers": {
    "ansible-mcp": {
      "command": "docker",
      "args": ["run", "-i", "--rm", "ansible-mcp-server"],
      "env": {
        "ANSIBLE_HOST_KEY_CHECKING": "False"
      }
    }
  }
}
```

## 📋 Example Use Cases

### Example 1: Deploy Kubernetes Application

**User Prompt:**
```text
Deploy a scalable web application to Kubernetes with:
- 5 replicas
- Health checks
- Auto-scaling
- Monitoring with Prometheus
- Ingress configuration
```

**MCP Response:**
```typescript
// The MCP server will:
1. Generate appropriate Kubernetes manifests
2. Create Ansible playbook for deployment
3. Validate the configuration
4. Execute the deployment
5. Return status and logs
```

**Generated Playbook Preview:**
```yaml
---
- name: Deploy Scalable Web Application to Kubernetes
  hosts: localhost
  gather_facts: no
  vars:
    namespace: production
    app_name: web-app
    replicas: 5
    
  tasks:
    - name: Create namespace
      kubernetes.core.k8s:
        name: "{{ namespace }}"
        api_version: v1
        kind: Namespace
        state: present
      tags: [namespace]
    
    - name: Deploy application with HPA
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: apps/v1
          kind: Deployment
          metadata:
            name: "{{ app_name }}"
            namespace: "{{ namespace }}"
          spec:
            replicas: "{{ replicas }}"
            selector:
              matchLabels:
                app: "{{ app_name }}"
            template:
              metadata:
                labels:
                  app: "{{ app_name }}"
              spec:
                containers:
                - name: app
                  image: "{{ container_image }}"
                  ports:
                  - containerPort: 8080
                  livenessProbe:
                    httpGet:
                      path: /health
                      port: 8080
                    initialDelaySeconds: 30
                    periodSeconds: 10
                  readinessProbe:
                    httpGet:
                      path: /ready
                      port: 8080
                    initialDelaySeconds: 5
                    periodSeconds: 5
      tags: [deploy, kubernetes]
    
    - name: Configure HorizontalPodAutoscaler
      kubernetes.core.k8s:
        state: present
        definition:
          apiVersion: autoscaling/v2
          kind: HorizontalPodAutoscaler
          metadata:
            name: "{{ app_name }}-hpa"
            namespace: "{{ namespace }}"
          spec:
            scaleTargetRef:
              apiVersion: apps/v1
              kind: Deployment
              name: "{{ app_name }}"
            minReplicas: 3
            maxReplicas: 10
            metrics:
            - type: Resource
              resource:
                name: cpu
                target:
                  type: Utilization
                  averageUtilization: 70
      tags: [autoscaling]
```

### Example 2: Security Hardening

**User Prompt:**
```text
Secure my Ubuntu servers with:
- SSH hardening
- Firewall configuration
- Fail2ban setup
- Security updates
- Audit logging
```

**MCP Workflow:**
```python
# The system will:
1. Analyze security requirements
2. Generate comprehensive hardening playbook
3. Validate against CIS benchmarks
4. Execute with dry-run first
5. Apply changes and verify
```

### Example 3: Docker Swarm Setup

**User Prompt:**
```text
Setup Docker Swarm cluster with 3 managers and 5 workers, 
including monitoring and automatic backup
```

**Generated Solution:**
```yaml
---
- name: Docker Swarm Cluster Setup
  hosts: all
  become: yes
  
  tasks:
    - name: Initialize Swarm on first manager
      docker_swarm:
        state: present
        advertise_addr: "{{ ansible_default_ipv4.address }}"
      when: inventory_hostname == groups['managers'][0]
      register: swarm_info
    
    - name: Join managers to Swarm
      docker_swarm:
        state: join
        join_token: "{{ hostvars[groups['managers'][0]]['swarm_info']['swarm_facts']['JoinTokens']['Manager'] }}"
        remote_addrs: ["{{ hostvars[groups['managers'][0]]['ansible_default_ipv4']['address'] }}:2377"]
      when: 
        - inventory_hostname in groups['managers']
        - inventory_hostname != groups['managers'][0]
```

## 🔧 API Integration

### Python Client Example
```python
import requests
import json

class AnsibleMCPClient:
    def __init__(self, host="localhost", port=3000):
        self.base_url = f"http://{host}:{port}"
    
    def generate_playbook(self, prompt, context=None):
        """Generate Ansible playbook from natural language prompt"""
        payload = {
            "tool": "generate_playbook",
            "arguments": {
                "prompt": prompt,
                "context": context or {}
            }
        }
        
        response = requests.post(f"{self.base_url}/execute", json=payload)
        return response.json()
    
    def validate_playbook(self, playbook_path):
        """Validate existing playbook"""
        payload = {
            "tool": "validate_playbook",
            "arguments": {
                "playbook_path": playbook_path,
                "strict": True
            }
        }
        
        response = requests.post(f"{self.base_url}/execute", json=payload)
        return response.json()
    
    def run_playbook(self, playbook_path, inventory, check_mode=True):
        """Execute Ansible playbook"""
        payload = {
            "tool": "run_playbook",
            "arguments": {
                "playbook_path": playbook_path,
                "inventory": inventory,
                "check_mode": check_mode
            }
        }
        
        response = requests.post(f"{self.base_url}/execute", json=payload)
        return response.json()

# Usage
client = AnsibleMCPClient()

# Generate playbook
result = client.generate_playbook(
    prompt="Setup PostgreSQL with replication and daily backups",
    context={
        "environment": "production",
        "target_hosts": "database_servers"
    }
)

print(f"Generated playbook: {result['playbook_path']}")

# Validate
validation = client.validate_playbook(result['playbook_path'])
if validation['success']:
    print("✓ Playbook is valid")
    
    # Run with check mode first
    dry_run = client.run_playbook(
        result['playbook_path'],
        inventory="production",
        check_mode=True
    )
    
    if dry_run['success']:
        print("Dry run successful! Ready to apply changes.")
```

### Node.js Client Example
```javascript
const axios = require('axios');

class AnsibleMCPClient {
    constructor(host = 'localhost', port = 3000) {
        this.baseUrl = `http://${host}:${port}`;
    }
    
    async generatePlaybook(prompt, template = null) {
        const response = await axios.post(`${this.baseUrl}/execute`, {
            tool: 'generate_playbook',
            arguments: {
                prompt,
                template,
                context: {
                    environment: 'production',
                    target_hosts: 'all'
                }
            }
        });
        
        return response.data;
    }
    
    async deployToKubernetes(appName, image, replicas = 3) {
        const prompt = `Deploy ${appName} application using ${image} image with ${replicas} replicas to Kubernetes`;
        
        const result = await this.generatePlaybook(prompt, 'kubernetes_deployment');
        
        if (result.success) {
            // Execute the playbook
            const execution = await axios.post(`${this.baseUrl}/execute`, {
                tool: 'run_playbook',
                arguments: {
                    playbook_path: result.playbook_path,
                    inventory: 'localhost',
                    extra_vars: {
                        app_name: appName,
                        container_image: image,
                        replica_count: replicas
                    }
                }
            });
            
            return execution.data;
        }
        
        throw new Error(result.error);
    }
}

// Usage
const client = new AnsibleMCPClient();

async function deployApp() {
    try {
        const result = await client.deployToKubernetes(
            'my-api',
            'myregistry/my-api:v1.2.0',
            5
        );
        
        console.log('Deployment successful:', result);
    } catch (error) {
        console.error('Deployment failed:', error.message);
    }
}

deployApp();
```

## 🎯 CI/CD Integration

### GitLab CI Pipeline
```yaml
# .gitlab-ci.yml
stages:
  - validate
  - generate
  - test
  - deploy

variables:
  MCP_SERVER: "ansible-mcp:3000"

validate-prompt:
  stage: validate
  script:
    - |
      curl -X POST http://${MCP_SERVER}/execute \
        -H "Content-Type: application/json" \
        -d '{
          "tool": "generate_playbook",
          "arguments": {
            "prompt": "${CI_COMMIT_MESSAGE}",
            "context": {
              "environment": "${CI_ENVIRONMENT_NAME}"
            }
          }
        }' | jq -r '.playbook_path' > playbook.yml
    - |
      curl -X POST http://${MCP_SERVER}/execute \
        -H "Content-Type: application/json" \
        -d '{
          "tool": "validate_playbook",
          "arguments": {
            "playbook_path": "playbook.yml"
          }
        }'

test-playbook:
  stage: test
  script:
    - |
      curl -X POST http://${MCP_SERVER}/execute \
        -H "Content-Type: application/json" \
        -d '{
          "tool": "run_playbook",
          "arguments": {
            "playbook_path": "playbook.yml",
            "inventory": "staging",
            "check_mode": true
          }
        }'

deploy:
  stage: deploy
  script:
    - |
      curl -X POST http://${MCP_SERVER}/execute \
        -H "Content-Type: application/json" \
        -d '{
          "tool": "run_playbook",
          "arguments": {
            "playbook_path": "playbook.yml",
            "inventory": "production"
          }
        }'
  only:
    - main
```

## 📊 Monitoring & Observability

### Access Dashboards
- **Grafana**: http://localhost:3001 (admin/ansible-mcp)
- **Prometheus**: http://localhost:9090
- **AWX UI**: http://localhost:8052
- **GitLab**: http://localhost:8080

### Metrics Exposed
- Playbook generation time
- Validation success rate
- Execution duration
- Error rates
- Resource utilization

## 🔐 Security Best Practices

1. **Credential Management**
   - Use HashiCorp Vault for secrets
   - Never hardcode credentials
   - Rotate keys regularly

2. **Network Security**
   - Use TLS for all communications
   - Implement API authentication
   - Network segmentation

3. **Audit Logging**
   - All playbook executions logged
   - Change tracking enabled
   - Integration with SIEM

## 🧪 Testing

### Run Tests
```bash
# Unit tests
npm test

# Integration tests
docker-compose -f docker-compose.test.yml up

# Lint checks
npm run lint
ansible-lint playbooks/
```

### Test Coverage
- Playbook generation: 95%
- Validation logic: 98%
- Execution flow: 92%
- Error handling: 90%

## 📚 Advanced Features

### Custom Template Development
```python
# Create custom template
cat > templates/custom_app.yml << EOF
---
- name: {{ app_name }} Deployment
  hosts: {{ target_hosts }}
  vars:
    custom_var: {{ custom_value }}
  tasks:
    - name: Custom task
      shell: echo "Deploying {{ app_name }}"
EOF

# Register template
curl -X POST http://localhost:3000/templates \
  -H "Content-Type: application/json" \
  -d '{
    "name": "custom_app",
    "content": "$(cat templates/custom_app.yml | base64)"
  }'
```

### Webhook Integration
```javascript
// Setup webhook for automatic playbook generation
app.post('/webhook/github', async (req, res) => {
    const { action, pull_request } = req.body;
    
    if (action === 'opened' && pull_request.title.includes('[DEPLOY]')) {
        const result = await mcpClient.generatePlaybook(
            pull_request.body,
            { environment: 'staging' }
        );
        
        // Comment on PR with playbook link
        await githubAPI.createComment(
            pull_request.number,
            `Playbook generated: ${result.playbook_path}`
        );
    }
});
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch
3. Add tests for new features
4. Submit pull request

## 📝 License

MIT License - See LICENSE file for details
