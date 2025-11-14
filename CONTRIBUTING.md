# Contributing to Ansible MCP Server

Thank you for your interest in contributing to the Ansible MCP Server project! This document provides guidelines and instructions for contributing.

## 🤝 How to Contribute

### Reporting Issues

- Check if the issue already exists in the [Issues](https://github.com/shellsnake/ansible-mcp-server/issues) section
- Use the issue templates when creating new issues
- Provide clear reproduction steps
- Include relevant logs and error messages

### Submitting Pull Requests

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Add tests for new functionality
5. Ensure all tests pass (`npm test`)
6. Commit your changes (`git commit -m 'Add amazing feature'`)
7. Push to your branch (`git push origin feature/amazing-feature`)
8. Open a Pull Request

### Development Setup

```bash
# Clone your fork
git clone https://github.com/YOUR_USERNAME/ansible-mcp-server.git
cd ansible-mcp-server

# Install dependencies
npm install
pip install -r requirements.txt

# Run in development mode
npm run dev

# Run tests
npm test
python -m pytest tests/
```

## 📝 Coding Standards

### TypeScript/JavaScript
- Use TypeScript for all new code
- Follow ESLint configuration
- Add JSDoc comments for public APIs
- Write unit tests for new functions

### Python
- Follow PEP 8 style guide
- Use type hints
- Add docstrings to functions and classes
- Minimum 80% test coverage

### Ansible Playbooks
- Use YAML syntax
- Follow Ansible best practices
- Add comments for complex tasks
- Include tags for all tasks

## 🧪 Testing

### Running Tests

```bash
# Unit tests
npm test

# Python tests
python -m pytest

# Ansible playbook validation
ansible-lint playbooks/

# Integration tests
docker-compose -f docker-compose.test.yml up
```

### Writing Tests

- Write tests for all new features
- Maintain minimum 80% code coverage
- Include both positive and negative test cases
- Mock external dependencies

## 📚 Documentation

- Update README.md for user-facing changes
- Add inline code comments
- Update API documentation for new endpoints
- Include examples for new features

## 🏷️ Commit Message Guidelines

Follow the [Conventional Commits](https://www.conventionalcommits.org/) specification:

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `test:` Adding or updating tests
- `chore:` Maintenance tasks

Examples:
```
feat: add Kubernetes deployment template
fix: resolve YAML parsing error in validator
docs: update API documentation for generate_playbook
```

## 🔄 Review Process

1. All PRs require at least one review
2. CI/CD checks must pass
3. No merge conflicts
4. Documentation must be updated
5. Tests must be included for new features

## 📜 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## 💬 Questions?

Feel free to:
- Open an issue for questions
- Join our discussions
- Contact the maintainers

Thank you for contributing! 🎉
