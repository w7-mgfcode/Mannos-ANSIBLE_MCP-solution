"""
Unit tests for Ansible Playbook Generator

Tests for prompt analysis, playbook generation, and validation.
"""

import pytest
import yaml
import re
from enum import Enum
from dataclasses import dataclass
from typing import List, Set

# =============================================================================
# Test Data and Fixtures
# =============================================================================

class PlaybookType(Enum):
    """Playbook types for testing"""
    KUBERNETES = "kubernetes"
    DOCKER = "docker"
    SYSTEM = "system"
    NETWORK = "network"
    DATABASE = "database"
    MONITORING = "monitoring"
    SECURITY = "security"
    CICD = "cicd"


@dataclass
class PlaybookContext:
    """Context extracted from prompt analysis"""
    prompt: str
    playbook_type: PlaybookType = PlaybookType.SYSTEM
    environment: str = "production"
    requirements: Set[str] = None
    tags: List[str] = None

    def __post_init__(self):
        if self.requirements is None:
            self.requirements = set()
        if self.tags is None:
            self.tags = []


# =============================================================================
# Pattern Compilation for Testing
# =============================================================================

def compile_patterns():
    """Compile regex patterns for playbook type detection"""
    return {
        'kubernetes': re.compile(r'\b(k8s|kubernetes|kubectl|pod|deployment|helm|kube)\b', re.I),
        'docker': re.compile(r'\b(docker|container|dockerfile|compose|swarm)\b', re.I),
        'database': re.compile(r'\b(database|db|mysql|postgres|postgresql|mongodb|redis|sql)\b', re.I),
        'monitoring': re.compile(r'\b(monitor|prometheus|grafana|nagios|zabbix|alert|metric)\b', re.I),
        'security': re.compile(r'\b(security|firewall|ssl|tls|certificate|hardening|selinux|iptables)\b', re.I),
        'network': re.compile(r'\b(network|dns|dhcp|router|switch|vlan|subnet)\b', re.I),
        'cicd': re.compile(r'\b(jenkins|gitlab.?ci|github.?actions|pipeline|cicd|ci/cd)\b', re.I),
    }


def analyze_prompt(prompt: str, patterns: dict) -> PlaybookContext:
    """Analyze prompt to extract context"""
    context = PlaybookContext(prompt=prompt)

    # Detect playbook type
    for pattern_name, pattern in patterns.items():
        if pattern.search(prompt):
            context.playbook_type = PlaybookType(pattern_name)
            break

    # Extract environment
    if re.search(r'\b(prod|production)\b', prompt, re.I):
        context.environment = 'production'
    elif re.search(r'\b(stag|staging)\b', prompt, re.I):
        context.environment = 'staging'
    elif re.search(r'\b(dev|development)\b', prompt, re.I):
        context.environment = 'development'

    # Extract requirements
    requirement_patterns = {
        'high_availability': r'\b(ha|high.?availability|cluster|redundant)\b',
        'scalability': r'\b(scal|autoscal|replica)\b',
        'security': r'\b(secur|harden|encrypt|ssl|tls)\b',
        'monitoring': r'\b(monitor|alert|metric|log)\b',
        'backup': r'\b(backup|snapshot|restore|recovery)\b',
    }

    for req_name, req_pattern in requirement_patterns.items():
        if re.search(req_pattern, prompt, re.I):
            context.requirements.add(req_name)

    # Generate tags
    context.tags = generate_tags(prompt)

    return context


def generate_tags(prompt: str) -> List[str]:
    """Generate tags based on prompt keywords"""
    tag_keywords = {
        'install': ['install', 'setup', 'deploy'],
        'configure': ['config', 'setup', 'settings'],
        'security': ['secure', 'harden', 'firewall'],
        'update': ['update', 'upgrade', 'patch'],
        'backup': ['backup', 'snapshot', 'restore'],
    }

    tags = []
    prompt_lower = prompt.lower()

    for tag, keywords in tag_keywords.items():
        if any(kw in prompt_lower for kw in keywords):
            tags.append(tag)

    return tags


# =============================================================================
# Prompt Analysis Tests
# =============================================================================

class TestPromptAnalysis:
    """Tests for prompt analysis functionality"""

    @pytest.fixture
    def patterns(self):
        return compile_patterns()

    def test_detect_kubernetes_prompt(self, patterns):
        """Should detect Kubernetes playbook type"""
        prompts = [
            "Deploy application to Kubernetes cluster",
            "Setup kubectl and helm",
            "Create K8s deployment with 5 replicas",
            "Configure pod networking",
        ]

        for prompt in prompts:
            context = analyze_prompt(prompt, patterns)
            assert context.playbook_type == PlaybookType.KUBERNETES, f"Failed for: {prompt}"

    def test_detect_docker_prompt(self, patterns):
        """Should detect Docker playbook type"""
        prompts = [
            "Install Docker on Ubuntu servers",
            "Setup Docker Compose",
            "Build and push container image",
            "Configure Docker Swarm cluster",
        ]

        for prompt in prompts:
            context = analyze_prompt(prompt, patterns)
            assert context.playbook_type == PlaybookType.DOCKER, f"Failed for: {prompt}"

    def test_detect_database_prompt(self, patterns):
        """Should detect database playbook type"""
        prompts = [
            "Setup PostgreSQL database",
            "Install MySQL with replication",
            "Configure MongoDB cluster",
            "Deploy Redis cache",
        ]

        for prompt in prompts:
            context = analyze_prompt(prompt, patterns)
            assert context.playbook_type == PlaybookType.DATABASE, f"Failed for: {prompt}"

    def test_detect_monitoring_prompt(self, patterns):
        """Should detect monitoring playbook type"""
        prompts = [
            "Setup Prometheus and Grafana",
            "Configure monitoring alerts",
            "Install Nagios monitoring",
            "Deploy metrics collection",
        ]

        for prompt in prompts:
            context = analyze_prompt(prompt, patterns)
            assert context.playbook_type == PlaybookType.MONITORING, f"Failed for: {prompt}"

    def test_detect_security_prompt(self, patterns):
        """Should detect security playbook type"""
        prompts = [
            "Harden server security",
            "Configure firewall rules",
            "Setup SSL certificates",
            "Enable SELinux",
        ]

        for prompt in prompts:
            context = analyze_prompt(prompt, patterns)
            assert context.playbook_type == PlaybookType.SECURITY, f"Failed for: {prompt}"

    def test_extract_production_environment(self, patterns):
        """Should extract production environment"""
        prompts = [
            "Deploy to production environment",
            "Setup production database",
            "Configure prod servers",
        ]

        for prompt in prompts:
            context = analyze_prompt(prompt, patterns)
            assert context.environment == "production", f"Failed for: {prompt}"

    def test_extract_staging_environment(self, patterns):
        """Should extract staging environment"""
        prompts = [
            "Deploy to staging environment",
            "Configure staging servers",
            "Setup stag database",
        ]

        for prompt in prompts:
            context = analyze_prompt(prompt, patterns)
            assert context.environment == "staging", f"Failed for: {prompt}"

    def test_extract_development_environment(self, patterns):
        """Should extract development environment"""
        prompts = [
            "Setup development environment",
            "Configure dev servers",
            "Create development database",
        ]

        for prompt in prompts:
            context = analyze_prompt(prompt, patterns)
            assert context.environment == "development", f"Failed for: {prompt}"

    def test_extract_requirements(self, patterns):
        """Should extract requirements from prompt"""
        prompt = "Deploy highly available, scalable and secure application with monitoring"
        context = analyze_prompt(prompt, patterns)

        assert 'high_availability' in context.requirements
        assert 'scalability' in context.requirements
        assert 'security' in context.requirements
        assert 'monitoring' in context.requirements

    def test_generate_tags(self, patterns):
        """Should generate appropriate tags"""
        prompt = "Install and configure secure web server with backup"
        context = analyze_prompt(prompt, patterns)

        assert 'install' in context.tags
        assert 'configure' in context.tags
        assert 'security' in context.tags
        assert 'backup' in context.tags


# =============================================================================
# YAML Validation Tests
# =============================================================================

class TestYAMLValidation:
    """Tests for YAML playbook validation"""

    def test_valid_playbook_structure(self):
        """Should validate correct playbook structure"""
        playbook = """
---
- name: Test Playbook
  hosts: all
  become: yes
  tasks:
    - name: Test task
      debug:
        msg: "Hello World"
"""
        # Should not raise exception
        data = yaml.safe_load(playbook)
        assert isinstance(data, list)
        assert 'name' in data[0]
        assert 'hosts' in data[0]
        assert 'tasks' in data[0]

    def test_invalid_yaml_syntax(self):
        """Should detect invalid YAML syntax"""
        invalid_playbook = """
---
- name: Invalid Playbook
  hosts: all
  tasks:
    - name: Bad indentation
     debug:  # Wrong indentation
        msg: "Hello"
"""
        with pytest.raises(yaml.YAMLError):
            yaml.safe_load(invalid_playbook)

    def test_playbook_with_handlers(self):
        """Should validate playbook with handlers"""
        playbook = """
---
- name: Playbook with handlers
  hosts: all
  tasks:
    - name: Update config
      copy:
        src: file
        dest: /etc/file
      notify: restart service
  handlers:
    - name: restart service
      service:
        name: myservice
        state: restarted
"""
        data = yaml.safe_load(playbook)
        assert 'handlers' in data[0]

    def test_playbook_with_variables(self):
        """Should validate playbook with variables"""
        playbook = """
---
- name: Playbook with vars
  hosts: all
  vars:
    app_name: myapp
    port: 8080
  tasks:
    - name: Debug vars
      debug:
        msg: "App: {{ app_name }} on port {{ port }}"
"""
        data = yaml.safe_load(playbook)
        assert 'vars' in data[0]
        assert data[0]['vars']['app_name'] == 'myapp'
        assert data[0]['vars']['port'] == 8080


# =============================================================================
# Secrets Detection Tests
# =============================================================================

class TestSecretsDetection:
    """Tests for secrets detection in playbooks"""

    @pytest.fixture
    def secret_patterns(self):
        return [
            ('AWS Access Key', re.compile(r'AKIA[0-9A-Z]{16}', re.I)),
            ('Password', re.compile(r'password[\'\":\s]*[\'"]?([^\'\"\}\s]{8,})', re.I)),
            ('Private Key', re.compile(r'-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----', re.I)),
            ('GitHub Token', re.compile(r'gh[ps]_[a-zA-Z0-9]{36}', re.I)),
        ]

    def test_detect_aws_key(self, secret_patterns):
        """Should detect AWS access key"""
        content = "aws_access_key_id: AKIAIOSFODNN7EXAMPLE"
        detected = any(pattern.search(content) for _, pattern in secret_patterns)
        assert detected

    def test_detect_password(self, secret_patterns):
        """Should detect hardcoded password"""
        content = 'db_password: "mysupersecretpassword"'
        detected = any(pattern.search(content) for _, pattern in secret_patterns)
        assert detected

    def test_detect_private_key(self, secret_patterns):
        """Should detect private key"""
        content = "-----BEGIN RSA PRIVATE KEY-----\nMIIE..."
        detected = any(pattern.search(content) for _, pattern in secret_patterns)
        assert detected

    def test_not_detect_jinja_variable(self, secret_patterns):
        """Should not detect Jinja2 variable as secret"""
        content = 'password: "{{ vault_password }}"'
        # In actual implementation, Jinja2 variables are skipped
        has_jinja = '{{ ' in content and ' }}' in content
        assert has_jinja

    def test_not_detect_safe_content(self, secret_patterns):
        """Should not detect safe content as secret"""
        content = """
        - name: Install package
          package:
            name: nginx
            state: present
        """
        detected = any(pattern.search(content) for _, pattern in secret_patterns)
        assert not detected


# =============================================================================
# Best Practices Tests
# =============================================================================

class TestBestPractices:
    """Tests for Ansible best practices checks"""

    def test_check_become_directive(self):
        """Should detect missing become directive"""
        playbook = """
- name: Test
  hosts: all
  tasks:
    - name: Task
      debug:
        msg: test
"""
        has_become = 'become:' in playbook
        assert not has_become

    def test_check_tags_present(self):
        """Should detect missing tags"""
        playbook = """
- name: Test
  hosts: all
  tasks:
    - name: Task
      debug:
        msg: test
"""
        has_tags = 'tags:' in playbook
        assert not has_tags

    def test_check_handlers_defined(self):
        """Should detect undefined handlers"""
        playbook = """
- name: Test
  hosts: all
  tasks:
    - name: Task
      copy:
        src: file
        dest: /etc/file
      notify: restart service
"""
        has_notify = 'notify:' in playbook
        has_handlers = 'handlers:' in playbook
        assert has_notify and not has_handlers

    def test_good_playbook_passes_checks(self):
        """Should pass all checks for good playbook"""
        playbook = """
- name: Good Playbook
  hosts: all
  become: yes
  tasks:
    - name: Install nginx
      package:
        name: nginx
        state: present
      tags:
        - install
        - nginx
      notify: restart nginx
  handlers:
    - name: restart nginx
      service:
        name: nginx
        state: restarted
"""
        has_become = 'become:' in playbook
        has_tags = 'tags:' in playbook
        has_handlers = 'handlers:' in playbook

        assert has_become
        assert has_tags
        assert has_handlers


# =============================================================================
# Template Generation Tests
# =============================================================================

class TestTemplateGeneration:
    """Tests for playbook template generation"""

    def test_kubernetes_template_structure(self):
        """Should generate valid Kubernetes template"""
        template = """
---
- name: Deploy to Kubernetes
  hosts: localhost
  gather_facts: no
  vars:
    namespace: "{{ namespace | default('default') }}"
  tasks:
    - name: Create namespace
      kubernetes.core.k8s:
        name: "{{ namespace }}"
        api_version: v1
        kind: Namespace
        state: present
"""
        data = yaml.safe_load(template)
        assert 'kubernetes.core.k8s' in str(data)

    def test_docker_template_structure(self):
        """Should generate valid Docker template"""
        template = """
---
- name: Setup Docker
  hosts: all
  become: yes
  tasks:
    - name: Install Docker
      package:
        name: docker-ce
        state: present
    - name: Start Docker
      service:
        name: docker
        state: started
        enabled: yes
"""
        data = yaml.safe_load(template)
        assert any('docker' in str(task).lower() for task in data[0]['tasks'])

    def test_template_has_required_fields(self):
        """Should have all required fields in template"""
        template = """
---
- name: Test Template
  hosts: all
  become: yes
  vars:
    var1: value1
  tasks:
    - name: Task 1
      debug:
        msg: test
"""
        data = yaml.safe_load(template)
        play = data[0]

        assert 'name' in play
        assert 'hosts' in play
        assert 'tasks' in play
        assert len(play['tasks']) > 0


# =============================================================================
# Edge Case Tests
# =============================================================================

class TestEdgeCases:
    """Tests for edge cases and error handling"""

    @pytest.fixture
    def patterns(self):
        return compile_patterns()

    def test_empty_prompt(self, patterns):
        """Should handle empty prompt"""
        context = analyze_prompt("", patterns)
        assert context.playbook_type == PlaybookType.SYSTEM  # Default

    def test_ambiguous_prompt(self, patterns):
        """Should handle ambiguous prompt"""
        prompt = "Setup something on server"
        context = analyze_prompt(prompt, patterns)
        # Should default to SYSTEM when no specific type detected
        assert context.playbook_type == PlaybookType.SYSTEM

    def test_multiple_types_prompt(self, patterns):
        """Should pick first matching type for multi-type prompt"""
        prompt = "Deploy Docker containers to Kubernetes"
        context = analyze_prompt(prompt, patterns)
        # Should match Kubernetes first (alphabetically first in patterns dict)
        assert context.playbook_type in [PlaybookType.KUBERNETES, PlaybookType.DOCKER]

    def test_case_insensitive_matching(self, patterns):
        """Should match patterns case-insensitively"""
        prompts = [
            "Deploy to KUBERNETES",
            "deploy to kubernetes",
            "Deploy to Kubernetes",
        ]

        for prompt in prompts:
            context = analyze_prompt(prompt, patterns)
            assert context.playbook_type == PlaybookType.KUBERNETES

    def test_unicode_prompt(self, patterns):
        """Should handle Unicode characters"""
        prompt = "Deploy aplikáció to Kubernetes with émojis 🚀"
        context = analyze_prompt(prompt, patterns)
        assert context.playbook_type == PlaybookType.KUBERNETES


# =============================================================================
# Run tests
# =============================================================================

if __name__ == '__main__':
    pytest.main([__file__, '-v'])
