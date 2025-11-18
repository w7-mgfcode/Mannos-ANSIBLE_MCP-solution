"""
Pytest configuration and shared fixtures
"""

import pytest
import tempfile
import shutil
from pathlib import Path


@pytest.fixture
def temp_dir():
    """Create a temporary directory for test files"""
    temp_path = tempfile.mkdtemp()
    yield Path(temp_path)
    shutil.rmtree(temp_path)


@pytest.fixture
def sample_playbook():
    """Return a sample valid playbook"""
    return """---
- name: Sample Playbook
  hosts: all
  become: yes
  vars:
    app_name: testapp
  tasks:
    - name: Install package
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


@pytest.fixture
def invalid_playbook():
    """Return an invalid playbook with syntax errors"""
    return """---
- name: Invalid Playbook
  hosts: all
  tasks:
    - name: Bad task
     debug:  # Wrong indentation
        msg: "test"
"""


@pytest.fixture
def playbook_with_secrets():
    """Return a playbook containing potential secrets"""
    return """---
- name: Playbook with secrets
  hosts: all
  vars:
    aws_key: AKIAIOSFODNN7EXAMPLE
    db_password: "supersecretpassword123"
  tasks:
    - name: Configure app
      template:
        src: config.j2
        dest: /etc/app/config
"""
