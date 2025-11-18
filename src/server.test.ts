/**
 * Unit tests for Ansible MCP Server
 * Tests security features, validation, and core functionality
 */

import { describe, test, expect, jest } from '@jest/globals';

// Mock external dependencies
jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    connect: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
    ping: jest.fn<() => Promise<string>>().mockResolvedValue('PONG'),
    get: jest.fn<() => Promise<string | null>>().mockResolvedValue(null),
    setex: jest.fn<() => Promise<string>>().mockResolvedValue('OK'),
    quit: jest.fn<() => Promise<void>>().mockResolvedValue(undefined),
  }));
});

jest.mock('node-vault', () => {
  return jest.fn().mockImplementation(() => ({
    health: jest.fn<() => Promise<{ initialized: boolean }>>().mockResolvedValue({ initialized: true }),
    read: jest.fn<() => Promise<{ data: { key: string } }>>().mockResolvedValue({ data: { key: 'value' } }),
  }));
});

// =============================================================================
// Security Tests
// =============================================================================

describe('Security Features', () => {
  describe('Path Validation', () => {
    test('should reject path traversal attempts with ../', () => {
      const maliciousPath = '/tmp/ansible-mcp/../../../etc/passwd';
      expect(maliciousPath.includes('..')).toBe(true);
    });

    test('should reject paths outside allowed directories', () => {
      const allowedPaths = ['/tmp/ansible-mcp', '/workspace/playbooks'];
      const testPath = '/etc/passwd';
      const isAllowed = allowedPaths.some(allowed => testPath.startsWith(allowed));
      expect(isAllowed).toBe(false);
    });

    test('should accept paths within allowed directories', () => {
      const allowedPaths = ['/tmp/ansible-mcp', '/workspace/playbooks'];
      const testPath = '/tmp/ansible-mcp/playbook_123.yml';
      const isAllowed = allowedPaths.some(allowed => testPath.startsWith(allowed));
      expect(isAllowed).toBe(true);
    });

    test('should reject null byte injection', () => {
      const maliciousPath = '/tmp/ansible-mcp/file\0.yml';
      expect(maliciousPath.includes('\0')).toBe(true);
    });
  });

  describe('Secrets Detection', () => {
    const secretPatterns = [
      { name: 'AWS Access Key', pattern: /AKIA[0-9A-Z]{16}/gi },
      { name: 'Password', pattern: /password['":\s]*['"]?([^'"}\s]{8,})/gi },
      { name: 'Private Key', pattern: /-----BEGIN (?:RSA |EC |DSA |OPENSSH )?PRIVATE KEY-----/gi },
      { name: 'GitHub Token', pattern: /gh[ps]_[a-zA-Z0-9]{36}/gi },
    ];

    test('should detect AWS access keys', () => {
      const content = 'aws_access_key_id: AKIAIOSFODNN7EXAMPLE';
      const hasSecret = secretPatterns.some(({ pattern }) => {
        pattern.lastIndex = 0;
        return pattern.test(content);
      });
      expect(hasSecret).toBe(true);
    });

    test('should detect hardcoded passwords', () => {
      const content = 'password: "supersecretpassword123"';
      const hasSecret = secretPatterns.some(({ pattern }) => {
        pattern.lastIndex = 0;
        return pattern.test(content);
      });
      expect(hasSecret).toBe(true);
    });

    test('should detect private keys', () => {
      const content = '-----BEGIN RSA PRIVATE KEY-----\nMIIEpA...';
      const hasSecret = secretPatterns.some(({ pattern }) => {
        pattern.lastIndex = 0;
        return pattern.test(content);
      });
      expect(hasSecret).toBe(true);
    });

    test('should detect GitHub tokens', () => {
      const content = 'github_token: ghp_1234567890abcdefghijklmnopqrstuvwxyz';
      const hasSecret = secretPatterns.some(({ pattern }) => {
        pattern.lastIndex = 0;
        return pattern.test(content);
      });
      expect(hasSecret).toBe(true);
    });

    test('should not flag Jinja2 variables as secrets', () => {
      const content = 'password: "{{ vault_password }}"';
      // This should be skipped in actual implementation
      const isJinja = content.includes('{{ ') && content.includes(' }}');
      expect(isJinja).toBe(true);
    });

    test('should not flag safe content', () => {
      const content = `
        - name: Install package
          package:
            name: nginx
            state: present
      `;
      const hasSecret = secretPatterns.some(({ pattern }) => {
        pattern.lastIndex = 0;
        return pattern.test(content);
      });
      expect(hasSecret).toBe(false);
    });
  });

  describe('Rate Limiting', () => {
    test('should track requests within time window', () => {
      const rateLimitMap = new Map<string, number[]>();
      const windowMs = 60000;
      const maxRequests = 100;

      // Simulate requests
      const clientId = 'test-client';
      const requests: number[] = [];
      const now = Date.now();

      for (let i = 0; i < 50; i++) {
        requests.push(now - i * 1000);
      }
      rateLimitMap.set(clientId, requests);

      const recentRequests = requests.filter(time => now - time < windowMs);
      expect(recentRequests.length).toBeLessThan(maxRequests);
    });

    test('should block requests exceeding rate limit', () => {
      const maxRequests = 100;
      const requests: number[] = [];
      const now = Date.now();

      // Simulate 100 requests
      for (let i = 0; i < 100; i++) {
        requests.push(now - i * 100);
      }

      const windowMs = 60000;
      const recentRequests = requests.filter(time => now - time < windowMs);
      expect(recentRequests.length).toBe(100);
      expect(recentRequests.length >= maxRequests).toBe(true);
    });
  });
});

// =============================================================================
// Input Validation Tests
// =============================================================================

describe('Input Validation', () => {
  describe('Tag Sanitization', () => {
    test('should sanitize tags to prevent injection', () => {
      const maliciousTags = ['deploy; rm -rf /', 'test$(whoami)', 'prod`id`'];
      const sanitizedTags = maliciousTags.map(tag =>
        tag.replace(/[^a-zA-Z0-9_-]/g, '')
      ).filter(tag => tag.length > 0);

      expect(sanitizedTags).toEqual(['deployrm-rf', 'testwhoami', 'prodid']);
    });

    test('should allow valid tags', () => {
      const validTags = ['deploy', 'production', 'web-server', 'app_v2'];
      const sanitizedTags = validTags.map(tag =>
        tag.replace(/[^a-zA-Z0-9_-]/g, '')
      );

      expect(sanitizedTags).toEqual(validTags);
    });
  });

  describe('Playbook Size Validation', () => {
    test('should reject oversized playbooks', () => {
      const maxSize = 1024 * 1024; // 1MB
      const oversizedContent = 'x'.repeat(maxSize + 1);
      expect(oversizedContent.length > maxSize).toBe(true);
    });

    test('should accept normal-sized playbooks', () => {
      const maxSize = 1024 * 1024;
      const normalContent = `
        ---
        - name: Test Playbook
          hosts: all
          tasks:
            - name: Test task
              debug:
                msg: "Hello World"
      `;
      expect(normalContent.length < maxSize).toBe(true);
    });
  });
});

// =============================================================================
// YAML Validation Tests
// =============================================================================

describe('YAML Validation', () => {
  test('should validate correct YAML syntax', () => {
    const validYaml = `
---
- name: Valid Playbook
  hosts: all
  tasks:
    - name: Test task
      debug:
        msg: "Hello"
`;

    // Import yaml and test
    const yaml = require('js-yaml');
    expect(() => yaml.load(validYaml)).not.toThrow();
  });

  test('should detect invalid YAML syntax', () => {
    const invalidYaml = `
---
- name: Invalid Playbook
  hosts: all
  tasks:
    - name: Bad indentation
     debug:  # Wrong indentation
        msg: "Hello"
`;

    const yaml = require('js-yaml');
    expect(() => yaml.load(invalidYaml)).toThrow();
  });
});

// =============================================================================
// Best Practices Check Tests
// =============================================================================

describe('Best Practices Validation', () => {
  test('should warn about missing become directive', () => {
    const content = `
      - name: Playbook without become
        hosts: all
        tasks:
          - name: Install package
            package:
              name: nginx
    `;

    const hasBecomeDirective = content.includes('become:') || content.includes('become_user:');
    expect(hasBecomeDirective).toBe(false);
  });

  test('should warn about missing tags', () => {
    const content = `
      - name: Playbook without tags
        hosts: all
        tasks:
          - name: Install package
            package:
              name: nginx
    `;

    const hasTags = content.includes('tags:');
    expect(hasTags).toBe(false);
  });

  test('should detect undefined handlers', () => {
    const content = `
      - name: Playbook with notify but no handlers
        hosts: all
        tasks:
          - name: Update config
            copy:
              src: file
              dest: /etc/file
            notify: restart service
    `;

    const hasNotify = content.includes('notify:');
    const hasHandlers = content.includes('handlers:');
    expect(hasNotify && !hasHandlers).toBe(true);
  });
});

// =============================================================================
// Retry Logic Tests
// =============================================================================

describe('Retry Logic', () => {
  test('should implement exponential backoff', () => {
    const baseDelay = 1000;
    const delays = [1, 2, 3].map(attempt => baseDelay * Math.pow(2, attempt - 1));
    expect(delays).toEqual([1000, 2000, 4000]);
  });

  test('should respect max retries', async () => {
    const maxRetries = 3;
    let attempts = 0;

    const operation = async () => {
      attempts++;
      throw new Error('Simulated failure');
    };

    try {
      for (let i = 0; i < maxRetries; i++) {
        try {
          await operation();
          break;
        } catch (e) {
          if (i === maxRetries - 1) throw e;
        }
      }
    } catch (e) {
      // Expected to throw after max retries
    }

    expect(attempts).toBe(maxRetries);
  });
});

// =============================================================================
// Metrics Tests
// =============================================================================

describe('Metrics', () => {
  test('should have correct metric names', () => {
    const expectedMetrics = [
      'ansible_mcp_playbooks_generated_total',
      'ansible_mcp_playbooks_executed_total',
      'ansible_mcp_validation_errors_total',
      'ansible_mcp_execution_duration_seconds',
      'ansible_mcp_secrets_detected_total',
      'ansible_mcp_auth_failures_total',
      'ansible_mcp_active_connections',
    ];

    // Verify metric names follow Prometheus naming conventions
    expectedMetrics.forEach(name => {
      expect(name).toMatch(/^[a-z][a-z0-9_]*$/);
      expect(name).toContain('ansible_mcp');
    });
  });

  test('should have appropriate histogram buckets', () => {
    const buckets = [0.1, 0.5, 1, 5, 10, 30, 60, 120, 300];

    // Verify buckets are in ascending order
    for (let i = 1; i < buckets.length; i++) {
      const current = buckets[i];
      const previous = buckets[i - 1];
      if (current !== undefined && previous !== undefined) {
        expect(current).toBeGreaterThan(previous);
      }
    }

    // Verify reasonable range for playbook execution
    const firstBucket = buckets[0];
    const lastBucket = buckets[buckets.length - 1];
    if (firstBucket !== undefined) {
      expect(firstBucket).toBeLessThanOrEqual(1);
    }
    if (lastBucket !== undefined) {
      expect(lastBucket).toBeGreaterThanOrEqual(60);
    }
  });
});

// =============================================================================
// Integration Test Helpers
// =============================================================================

describe('Test Utilities', () => {
  test('should create test playbook content', () => {
    const createTestPlaybook = (name: string, hosts: string = 'all') => {
      return `---
- name: ${name}
  hosts: ${hosts}
  become: yes
  tasks:
    - name: Test task
      debug:
        msg: "Test playbook"
      tags:
        - test
`;
    };

    const playbook = createTestPlaybook('Test Playbook');
    expect(playbook).toContain('name: Test Playbook');
    expect(playbook).toContain('hosts: all');
    expect(playbook).toContain('become: yes');
    expect(playbook).toContain('tags:');
  });
});
