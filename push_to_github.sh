#!/bin/bash

# GitHub Repository Setup Script
# This script helps you push the Ansible MCP Server to your GitHub account

echo "═══════════════════════════════════════════════════════════════"
echo "   Ansible MCP Server - GitHub Repository Setup"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Módosítsd az ellenőrzést így:
if [ ! -f "package.json" ] || [ ! -d ".git" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    echo "Current directory: $(pwd)"
    exit 1
fi

echo "📋 Prerequisites:"
echo "   1. GitHub account"
echo "   2. GitHub CLI (gh) or git with SSH/HTTPS authentication"
echo "   3. Repository creation permissions"
echo ""

read -p "Do you have these prerequisites? (y/n): " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Please set up the prerequisites first."
    exit 1
fi

echo ""
echo "🔧 Setup Options:"
echo "   1. Use GitHub CLI (recommended)"
echo "   2. Manual setup with existing repository"
echo ""

read -p "Choose option (1 or 2): " OPTION

if [ "$OPTION" = "1" ]; then
    # GitHub CLI method
    echo ""
    echo "📦 Creating repository using GitHub CLI..."
    
    read -p "Enter repository name (default: ansible-mcp-server): " REPO_NAME
    REPO_NAME=${REPO_NAME:-ansible-mcp-server}
    
    read -p "Make repository public? (y/n): " -n 1 -r
    echo ""
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        VISIBILITY="public"
    else
        VISIBILITY="private"
    fi
    
    # Create repository
    gh repo create "$REPO_NAME" \
        --description "AI-powered Ansible playbook generator with MCP integration" \
        --$VISIBILITY \
        --source=. \
        --push \
        --remote=origin
    
    if [ $? -eq 0 ]; then
        echo "✅ Repository created and pushed successfully!"
        echo ""
        echo "🔗 Your repository URL: https://github.com/$(gh api user -q .login)/$REPO_NAME"
    else
        echo "❌ Failed to create repository. Please check your GitHub CLI authentication."
        exit 1
    fi
    
elif [ "$OPTION" = "2" ]; then
    # Manual method
    echo ""
    echo "📝 Manual Setup Instructions:"
    echo ""
    echo "1. Create a new repository on GitHub:"
    echo "   • Go to: https://github.com/new"
    echo "   • Repository name: ansible-mcp-server (recommended)"
    echo "   • Description: AI-powered Ansible playbook generator with MCP integration"
    echo "   • Choose public or private"
    echo "   • DO NOT initialize with README, .gitignore, or license"
    echo ""
    
    read -p "Press Enter when you've created the repository..."
    
    echo ""
    read -p "Enter your GitHub username: " USERNAME
    read -p "Enter repository name: " REPO_NAME
    
    echo ""
    echo "Choose connection method:"
    echo "   1. HTTPS"
    echo "   2. SSH"
    read -p "Choice (1 or 2): " CONN_METHOD
    
    if [ "$CONN_METHOD" = "1" ]; then
        REMOTE_URL="https://github.com/$USERNAME/$REPO_NAME.git"
    else
        REMOTE_URL="git@github.com:$USERNAME/$REPO_NAME.git"
    fi
    
    echo ""
    echo "🔄 Adding remote and pushing..."
    git remote add origin "$REMOTE_URL"
    git branch -M main
    git push -u origin main
    
    if [ $? -eq 0 ]; then
        echo "✅ Repository pushed successfully!"
        echo ""
        echo "🔗 Your repository URL: https://github.com/$USERNAME/$REPO_NAME"
    else
        echo "❌ Failed to push. Please check your authentication and try again."
        echo ""
        echo "Manual commands to try:"
        echo "  git remote add origin $REMOTE_URL"
        echo "  git branch -M main"
        echo "  git push -u origin main"
        exit 1
    fi
else
    echo "Invalid option selected."
    exit 1
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "   🎉 Setup Complete!"
echo "═══════════════════════════════════════════════════════════════"
echo ""
echo "📚 Next Steps:"
echo "   1. Visit your repository on GitHub"
echo "   2. Add collaborators if needed (Settings → Manage access)"
echo "   3. Set up branch protection rules (Settings → Branches)"
echo "   4. Configure secrets for CI/CD (Settings → Secrets)"
echo "   5. Enable GitHub Pages for documentation (optional)"
echo ""
echo "🔐 Required GitHub Secrets for CI/CD:"
echo "   • DOCKER_USERNAME - DockerHub username"
echo "   • DOCKER_TOKEN - DockerHub access token"
echo "   • NPM_TOKEN - NPM registry token (if publishing)"
echo "   • SNYK_TOKEN - Snyk security scanning token (optional)"
echo ""
echo "📖 Documentation:"
echo "   • README.md - Main documentation"
echo "   • USAGE.md - Detailed usage examples"
echo "   • CONTRIBUTING.md - Contribution guidelines"
echo ""
echo "Happy automating! 🚀"
