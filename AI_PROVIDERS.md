# AI Providers Guide

This document explains how to configure and use different AI providers with the Ansible MCP Server for intelligent playbook generation.

## Table of Contents

1. [Overview](#overview)
2. [Supported Providers](#supported-providers)
3. [Configuration](#configuration)
4. [Provider-Specific Setup](#provider-specific-setup)
5. [Usage Examples](#usage-examples)
6. [Troubleshooting](#troubleshooting)

---

## Overview

The Ansible MCP Server supports multiple AI providers for intelligent playbook generation:

- **OpenAI** (GPT-4, GPT-3.5-turbo)
- **Anthropic** (Claude 3 family)
- **Google Gemini** (Gemini Pro, Gemini 1.5)
- **Ollama** (Local LLMs)

The server automatically uses the configured AI provider to:
- Generate playbooks from natural language prompts
- Refine existing playbooks based on feedback
- Optimize playbooks for best practices

If no AI provider is configured or if AI generation fails, the server falls back to template-based generation.

---

## Supported Providers

### 1. OpenAI

**Models:**
- `gpt-5` (latest flagship)
- `gpt-4.1` (recommended)
- `gpt-4.1-mini` (fast & affordable)
- `gpt-4.1-nano` (fastest)
- `o4-mini` (reasoning)
- `o3` (advanced reasoning)
- `gpt-4o` (multimodal)
- `gpt-4o-mini`

**Pros:**
- High-quality output
- Fast response times
- Well-documented API
- Large context windows (up to 1M tokens)

**Cons:**
- Requires API key (paid)
- Usage-based pricing

### 2. Anthropic (Claude)

**Models:**
- `claude-sonnet-4-5-20250929` (latest, best for coding/agents)
- `claude-haiku-4-5-20251015` (fast & affordable)
- `claude-opus-4-1-20250805` (most capable)
- `claude-sonnet-4-20250522` (balanced)
- `claude-opus-4-20250522` (hybrid reasoning)
- `claude-3-5-sonnet-20241022` (legacy)
- `claude-3-5-haiku-20241022` (legacy)

**Note:** Claude 3 Opus deprecated June 2025, Claude 3 Sonnet and Claude 2.1 retired July 2025.

**Pros:**
- State-of-the-art coding (SWE-bench leader)
- Excellent reasoning capabilities
- Large context window (up to 1M tokens)
- Extended thinking for complex tasks

**Cons:**
- Requires API key (paid)
- Premium pricing for Opus models

### 3. Google Gemini

**Models:**
- `gemini-3-pro` (latest, most intelligent)
- `gemini-3-deep-think` (advanced reasoning)
- `gemini-2.5-pro` (stable)
- `gemini-2.5-flash` (recommended, fast)
- `gemini-2.5-flash-lite` (most cost-efficient)
- `gemini-2.0-flash` (legacy)
- `gemini-1.5-pro` (legacy)
- `gemini-1.5-flash` (legacy)

**Pros:**
- Free tier available
- Excellent performance
- Best vibe coding (WebDev Arena leader)
- Multimodal capabilities
- Large context window (1M+ tokens)

**Cons:**
- API availability may vary by region
- Some models in preview

### 4. Ollama (Local LLMs)

**Common Models:**
- `llama3.2` / `llama3.2:1b` / `llama3.2:3b` (latest)
- `llama3.1` / `llama3.1:8b` / `llama3.1:70b` / `llama3.1:405b`
- `codellama` / `codellama:13b` / `codellama:34b`
- `qwen2.5` / `qwen2.5-coder`
- `deepseek-coder-v2`
- `mistral` / `mixtral`
- `phi3` / `gemma2`

**Pros:**
- **Free** - runs locally
- No API key required
- Privacy - data stays local
- No usage limits

**Cons:**
- Requires local installation
- Needs GPU for good performance
- Quality depends on model size

---

## Configuration

### Environment Variables

Configure the AI provider using environment variables. Create a `.env` file in the project root:

```bash
# Copy the example file
cp .env.example .env

# Edit with your configuration
nano .env
```

### Basic Configuration

```bash
# Choose your provider
AI_PROVIDER=openai  # or anthropic, gemini, ollama

# Specify the model (optional - uses defaults if not set)
AI_MODEL=gpt-4.1

# Add your API key (not needed for Ollama)
OPENAI_API_KEY=sk-your-key-here
```

### All Available Variables

```bash
# Provider Selection
AI_PROVIDER=openai              # openai | anthropic | gemini | ollama
AI_MODEL=gpt-4                  # Model name (provider-specific)

# API Keys
OPENAI_API_KEY=sk-...           # OpenAI API key
ANTHROPIC_API_KEY=sk-ant-...    # Anthropic API key
GEMINI_API_KEY=...              # Google Gemini API key
GOOGLE_API_KEY=...              # Alternative for Gemini

# Custom Base URL (optional)
AI_BASE_URL=http://localhost:11434  # For custom Ollama instance
```

---

## Provider-Specific Setup

### OpenAI Setup

1. **Get API Key:**
   - Go to https://platform.openai.com/api-keys
   - Create a new API key
   - Copy the key (starts with `sk-`)

2. **Configure:**
   ```bash
   AI_PROVIDER=openai
   AI_MODEL=gpt-4.1
   OPENAI_API_KEY=sk-your-key-here
   ```

3. **Recommended Models:**
   - **Production:** `gpt-5` or `gpt-4.1` (best quality)
   - **Development:** `gpt-4.1-mini` (balanced)
   - **Testing:** `gpt-4.1-nano` (fastest)
   - **Reasoning:** `o4-mini` or `o3` (complex tasks)

4. **Test:**
   ```bash
   docker compose up -d ansible-mcp
   docker compose logs -f ansible-mcp
   # Should see: "AI Provider initialized: OpenAI (gpt-4.1)"
   ```

### Anthropic Setup

1. **Get API Key:**
   - Go to https://console.anthropic.com/
   - Navigate to API Keys
   - Create a new key
   - Copy the key (starts with `sk-ant-`)

2. **Configure:**
   ```bash
   AI_PROVIDER=anthropic
   AI_MODEL=claude-sonnet-4-5-20250929
   ANTHROPIC_API_KEY=sk-ant-your-key-here
   ```

3. **Recommended Models:**
   - **Production:** `claude-opus-4-1-20250805` (most capable)
   - **Development:** `claude-sonnet-4-5-20250929` (best for coding/agents)
   - **Testing:** `claude-haiku-4-5-20251015` (fast & affordable)

### Google Gemini Setup

1. **Get API Key:**
   - Go to https://aistudio.google.com/app/apikey
   - Create a new API key
   - Copy the key

2. **Configure:**
   ```bash
   AI_PROVIDER=gemini
   AI_MODEL=gemini-2.5-flash
   GEMINI_API_KEY=your-key-here
   ```

3. **Recommended Models:**
   - **Production:** `gemini-3-pro` (most intelligent)
   - **Development:** `gemini-2.5-flash` (balanced)
   - **Testing:** `gemini-2.5-flash-lite` (most cost-efficient)
   - **Reasoning:** `gemini-3-deep-think` (complex tasks)

4. **Note:** Gemini has a generous free tier (60 requests/minute).

### Ollama Setup (Local)

1. **Install Ollama:**
   ```bash
   # macOS/Linux
   curl https://ollama.ai/install.sh | sh

   # Or download from https://ollama.ai
   ```

2. **Pull a Model:**
   ```bash
   ollama pull llama3.2  # Latest, good for general use
   # or
   ollama pull qwen2.5-coder  # Best for code generation
   # or
   ollama pull llama3.1:70b  # Larger model, better quality
   ```

3. **Start Ollama:**
   ```bash
   ollama serve
   # Runs on http://localhost:11434 by default
   ```

4. **Configure:**
   ```bash
   AI_PROVIDER=ollama
   AI_MODEL=llama3.2
   # No API key needed!
   ```

5. **For Custom Ollama Instance:**
   ```bash
   AI_BASE_URL=http://192.168.1.100:11434  # Custom host
   ```

---

## Usage Examples

### Using with Docker Compose

```bash
# Set environment variables
export AI_PROVIDER=openai
export OPENAI_API_KEY=sk-your-key-here

# Start services
docker compose up -d

# View logs to confirm AI provider loaded
docker compose logs ansible-mcp
```

### Using with MCP Client

Once configured, the AI provider works automatically:

```javascript
// Request playbook generation
{
  "tool": "generate_playbook",
  "arguments": {
    "prompt": "Deploy a highly available PostgreSQL cluster with automatic failover",
    "context": {
      "environment": "production",
      "target_hosts": "db_servers"
    }
  }
}

// The AI provider will generate an intelligent playbook
// Result includes AI-generated tasks, error handling, best practices
```

### Provider Switching

You can switch providers without code changes:

```bash
# Use OpenAI
AI_PROVIDER=openai AI_MODEL=gpt-4.1 docker compose up -d

# Switch to Claude
AI_PROVIDER=anthropic AI_MODEL=claude-sonnet-4-5-20250929 docker compose up -d

# Switch to Gemini
AI_PROVIDER=gemini AI_MODEL=gemini-2.5-flash docker compose up -d

# Switch to local Ollama
AI_PROVIDER=ollama AI_MODEL=llama3.2 docker compose up -d
```

### Fallback Behavior

The server automatically falls back to template-based generation if:
- No AI provider is configured
- API key is invalid
- API request fails
- Network issues occur

```
# Logs will show:
AI Provider initialization failed: OpenAI: API key is required
Falling back to template-based generation
```

---

## Troubleshooting

### Problem: "AI Provider initialization failed"

**Symptoms:**
```
AI Provider initialization failed: OpenAI: API key is required
Falling back to template-based generation
```

**Solutions:**
1. Check that API key is set:
   ```bash
   echo $OPENAI_API_KEY  # Should show your key
   ```

2. Verify `.env` file exists and is loaded:
   ```bash
   cat .env | grep API_KEY
   ```

3. For Docker, ensure environment variables are passed:
   ```bash
   docker compose config | grep API_KEY
   ```

### Problem: "API request failed: 401 Unauthorized"

**Symptoms:**
```
OpenAI API request failed: 401 Unauthorized
```

**Solutions:**
1. Verify API key is correct and active
2. Check if key has been revoked
3. For OpenAI, ensure you have credits available
4. For Anthropic, verify API access is enabled

### Problem: Ollama connection failed

**Symptoms:**
```
Ollama API request failed: ECONNREFUSED
```

**Solutions:**
1. Check Ollama is running:
   ```bash
   curl http://localhost:11434/api/tags
   ```

2. Verify model is pulled:
   ```bash
   ollama list
   ```

3. If using custom URL, check `AI_BASE_URL`:
   ```bash
   echo $AI_BASE_URL
   ```

### Problem: Slow generation with Ollama

**Solutions:**
1. Use a smaller model:
   ```bash
   ollama pull codellama:7b  # Faster than 13b/34b
   ```

2. Use GPU acceleration (if available):
   ```bash
   # Ollama uses GPU by default if available
   nvidia-smi  # Check GPU usage
   ```

3. Increase timeout in code:
   ```typescript
   timeout: 180000  // 3 minutes for local models
   ```

### Problem: Rate limits exceeded

**Symptoms:**
```
API request failed: 429 Too Many Requests
```

**Solutions:**
1. For OpenAI/Anthropic: Reduce request frequency
2. Upgrade to higher tier plan
3. Switch to Ollama for unlimited local generation

---

## Comparison Table

| Feature | OpenAI | Anthropic | Gemini | Ollama |
|---------|--------|-----------|---------|---------|
| **Cost** | Paid | Paid | Free tier | Free |
| **Setup** | Easy | Easy | Easy | Moderate |
| **Speed** | Fast | Fast | Fast | Slow (CPU) / Fast (GPU) |
| **Quality** | Excellent | Excellent | Good | Varies by model |
| **Privacy** | Cloud | Cloud | Cloud | Local |
| **API Key** | Required | Required | Required | Not needed |
| **Best For** | Production | Production | Development | Privacy/Testing |

---

## Recommended Configurations

### Production

```bash
AI_PROVIDER=openai
AI_MODEL=gpt-5
OPENAI_API_KEY=sk-your-key-here
```

Or:

```bash
AI_PROVIDER=anthropic
AI_MODEL=claude-opus-4-1-20250805
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Or:

```bash
AI_PROVIDER=gemini
AI_MODEL=gemini-3-pro
GEMINI_API_KEY=your-key-here
```

### Development

```bash
AI_PROVIDER=anthropic
AI_MODEL=claude-sonnet-4-5-20250929
ANTHROPIC_API_KEY=sk-ant-your-key-here
```

Or:

```bash
AI_PROVIDER=openai
AI_MODEL=gpt-4.1
OPENAI_API_KEY=sk-your-key-here
```

Or:

```bash
AI_PROVIDER=gemini
AI_MODEL=gemini-2.5-flash
GEMINI_API_KEY=your-key-here
```

### Testing/Privacy

```bash
AI_PROVIDER=ollama
AI_MODEL=llama3.2
# No API key needed
```

Or for coding tasks:

```bash
AI_PROVIDER=ollama
AI_MODEL=qwen2.5-coder
# No API key needed
```

---

## Additional Resources

- [OpenAI API Documentation](https://platform.openai.com/docs)
- [Anthropic API Documentation](https://docs.anthropic.com/)
- [Google Gemini Documentation](https://ai.google.dev/docs)
- [Ollama Documentation](https://github.com/ollama/ollama)

---

For more information, see the main [README.md](README.md) and [CLAUDE.md](CLAUDE.md) files.
