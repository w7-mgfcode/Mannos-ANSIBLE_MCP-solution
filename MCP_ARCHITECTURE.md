# Ansible MCP Server - Architecture Documentation

**Generated**: 2025-11-18
**Version**: 1.0.0
**SDK Version**: 0.5.0

---

## System Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          MCP Client (e.g., Claude)                       │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                       STDIO Transport (JSON-RPC 2.0)
                                 │
┌────────────────────────────────▼────────────────────────────────────────┐
│                       Ansible MCP Server (TypeScript)                    │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │                    Request Handlers                             │   │
│  │                                                                 │   │
│  │  ┌──────────────────────┐  ┌──────────────────────┐           │   │
│  │  │  tools/list          │  │  tools/call          │           │   │
│  │  │  - Returns 10 tools  │  │  - Routes to handler │           │   │
│  │  │  - Schemas included  │  │  - Zod validation    │           │   │
│  │  │  - Descriptions      │  │  - Error handling    │           │   │
│  │  └──────────────────────┘  └──────────────────────┘           │   │
│  │                                                                 │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                 │                                       │
│          ┌──────────────────────┼──────────────────────┐               │
│          │                      │                      │               │
│   ┌──────▼──────────┐  ┌────────▼────────┐  ┌─────────▼──────┐      │
│   │  Playbook Tools │  │ Template Tools   │  │  AI Provider   │      │
│   │                 │  │                  │  │                │      │
│   │ • Generate      │  │ • List           │  │ • OpenAI       │      │
│   │ • Validate      │  │ • Get            │  │ • Anthropic    │      │
│   │ • Run           │  │ • Enrich         │  │ • Gemini       │      │
│   │ • Refine        │  │ • Generate+Tmpl  │  │ • Ollama       │      │
│   │ • Lint          │  │ • Update         │  └────────────────┘      │
│   │                 │  │ • History        │                           │
│   └─────────────────┘  └──────────────────┘                           │
│                                                                          │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  Shared Components                                              │   │
│  │  • PromptTemplateLibrary (typed templates + versioning)        │   │
│  │  • InputValidation (Zod schemas)                               │   │
│  │  • ErrorHandling (try-catch blocks)                            │   │
│  │  • FileOperations (playbooks, logs)                            │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                          │
└────────────────────────────────┬────────────────────────────────────────┘
                                 │
                  ┌──────────────┼──────────────┐
                  │              │              │
          ┌───────▼──────┐  ┌────▼─────┐  ┌───▼────────┐
          │  Ansible CLI │  │  YAML FS  │  │  AI Models │
          │  (playbook   │  │  (save    │  │  (external │
          │   execution) │  │   files)  │  │   services)│
          └──────────────┘  └──────────┘  └────────────┘
```

---

## Data Flow Diagram

### Tool Execution Flow

```
┌─────────────────┐
│ MCP Client      │
│ (e.g., Claude)  │
└────────┬────────┘
         │
         │ Call Tool Request
         │ (JSON-RPC via STDIO)
         │
         ▼
┌─────────────────────────────────┐
│ MCP Server (stdio transport)    │
└────────┬────────────────────────┘
         │
         ├─ Route Request
         │
         ▼
┌────────────────────────────────────┐
│ setRequestHandler("tools/call")    │
│ • Extract tool name & parameters   │
│ • Route to handler via switch()    │
└────────┬───────────────────────────┘
         │
         ├─ Switch on tool name
         │
         ├─ Case "generate_playbook"
         │   │
         │   ▼
         │  ┌──────────────────────────┐
         │  │ generatePlaybook()        │
         │  │ 1. Parse & validate args │
         │  │ 2. Call AI or template   │
         │  │ 3. Save to filesystem    │
         │  │ 4. Return success + path │
         │  └──────────────────────────┘
         │
         ├─ Case "validate_playbook"
         │   │
         │   ▼
         │  ┌──────────────────────────┐
         │  │ validatePlaybook()        │
         │  │ 1. Read file             │
         │  │ 2. YAML validation       │
         │  │ 3. Ansible syntax check  │
         │  │ 4. Return validation     │
         │  └──────────────────────────┘
         │
         └─ [8 more tools...]
         │
         ▼
┌────────────────────────────────────┐
│ Response Generation                │
│ {                                  │
│   content: [{                      │
│     type: 'text',                  │
│     text: JSON.stringify({...})    │
│   }]                               │
│ }                                  │
└────────┬───────────────────────────┘
         │
         │ Response (JSON-RPC via STDIO)
         │
         ▼
┌─────────────────┐
│ MCP Client      │
│ Receives & uses │
│ tool result     │
└─────────────────┘
```

---

## Tool Architecture

### Tool Definition Structure

```typescript
// Each tool defined with:
{
  name: string              // Unique identifier
  description: string       // What it does
  inputSchema: {            // JSON Schema for inputs
    type: 'object'
    properties: {           // Parameter definitions
      param1: {
        type: 'string'
        description: '...'
      }
      param2: {
        type: 'object'
        optional: true
      }
    }
    required: ['param1']    // Required params
  }
}
```

### Tool Execution Architecture

```
┌─ generatePlaybook()
│  │
│  ├─ Parse arguments with Zod
│  │  └─ GeneratePlaybookSchema.parse()
│  │
│  ├─ Check if template specified
│  │  ├─ YES: Use from Map<string, string>
│  │  └─ NO: Call AI provider or fallback
│  │
│  ├─ Generate content (AI or template)
│  │
│  ├─ Save to file
│  │  └─ /tmp/ansible-mcp/playbook_<timestamp>.yml
│  │
│  ├─ Validate YAML
│  │
│  └─ Return MCP response
│
├─ validatePlaybook()
│  │
│  ├─ Read playbook file
│  │
│  ├─ YAML validation
│  │
│  ├─ Ansible syntax check
│  │  └─ ansible-playbook --syntax-check
│  │
│  ├─ Best practices check (optional)
│  │
│  └─ Return validation results
│
├─ runPlaybook()
│  │
│  ├─ Build ansible-playbook command
│  │
│  ├─ Add extra vars, tags, check mode
│  │
│  ├─ Execute command
│  │
│  └─ Return stdout/stderr
│
├─ refinePlaybook()
│  │
│  ├─ Read current playbook
│  │
│  ├─ Use AI for intelligent refinement
│  │  └─ Falls back to rule-based
│  │
│  ├─ Apply feedback-based changes
│  │
│  └─ Save refined version
│
└─ lintPlaybook()
   │
   ├─ Run ansible-lint command
   │
   └─ Return lint results
```

---

## Type System Architecture

### TypeScript Configuration

```typescript
// Compilation settings
{
  target: "ES2022"           // Modern JavaScript
  module: "NodeNext"         // ESM with Node.js resolution
  strict: true               // Strict type checking
  
  // Strict options enabled:
  noUnusedLocals: true
  noUnusedParameters: true
  noImplicitReturns: true
  noFallthroughCasesInSwitch: true
  noUncheckedIndexedAccess: true
  
  // Disabled options:
  exactOptionalPropertyTypes: false
  noImplicitOverride: false
}
```

### Validation Architecture

```
┌─ Input arrives at handler
│
├─ Type: `any` (no compile-time checking)
│
├─ Runtime validation with Zod
│  │
│  ├─ GeneratePlaybookSchema.parse(args)
│  │  │
│  │  ├─ prompt: string (required)
│  │  ├─ template: string (optional)
│  │  └─ context: object (optional)
│  │
│  ├─ ValidatePlaybookSchema.parse(args)
│  ├─ RunPlaybookSchema.parse(args)
│  ├─ RefinePlaybookSchema.parse(args)
│  └─ [7 more schemas...]
│
├─ If validation fails
│  └─ ZodError caught in try-catch
│
└─ If validation passes
   └─ Proceed with handler logic
```

---

## Error Handling Architecture

### Current Error Flow (⚠️ NEEDS IMPROVEMENT)

```
┌─ Tool execution
│
├─ Try block
│  │
│  ├─ Success path
│  │  └─ Return { success: true, ... }
│  │
│  └─ Exception thrown
│
├─ Catch block
│  │
│  ├─ Catch (error as Error)
│  │
│  └─ Return { success: false, error: message }
│
└─ Response to client
   │
   ├─ Client must parse
   │  └─ if (success) { use data } else { handle error }
   │
   └─ No error type discrimination
```

### Recommended Error Flow

```
┌─ Tool execution
│
├─ Try block
│  │
│  ├─ Success path
│  │  └─ Return { content: [{...}] }
│  │
│  └─ Exception thrown
│
├─ Catch block
│  │
│  ├─ Determine error type
│  │  ├─ ValidationError
│  │  ├─ NotFoundError
│  │  ├─ ExecutionError
│  │  └─ InternalError
│  │
│  └─ Return MCP ErrorResponse
│     {
│       error: message,
│       code?: number,
│       data?: { ... }
│     }
│
└─ Response to client
   │
   ├─ Client uses standard error handling
   │
   └─ Error type is clear
```

---

## Capabilities Declaration Architecture

### Current State

```typescript
{
  capabilities: {
    tools: {}  // Empty object
  }
}
```

### Recommended State

```typescript
{
  capabilities: {
    tools: {
      // Optional: tool capabilities
    },
    resources: {
      // Optional: resource availability
    },
    sampling: {
      // Optional: sampling capability
    },
    logging: {
      // Optional: logging capability
    }
  }
}
```

---

## Request Handler Architecture

### Current Implementation

```typescript
// Handler registration
setRequestHandler("tools/list" as any, async () => {
  // Returns Tool[]
});

setRequestHandler("tools/call" as any, async (request) => {
  const { name, arguments: args } = request.params;
  
  // Switch statement routing
  switch (name) {
    case 'generate_playbook':
      return await this.generatePlaybook(args);
    // ... 9 more cases
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
});
```

### Issues

```
Problem: Type Safety
├─ "tools/list" as any
├─ Should use: ListToolsRequest type
└─ Impact: No compile-time validation

Problem: Tool Lookup
├─ Switch statement (O(n) lookup)
├─ Should use: Map<string, Handler>
└─ Impact: Performance & maintainability

Problem: Error Handling
├─ Throws generic Error
├─ Should use: MCP ErrorResponse
└─ Impact: Client error handling
```

---

## File System Architecture

```
/tmp/ansible-mcp/
├── playbook_<timestamp>.yml          # Generated playbooks
├── playbook_<timestamp>_refined.yml  # Refined versions
├── templates/                        # Prompt templates
│   ├── kubernetes-deployment.json
│   ├── docker-setup.json
│   ├── security-hardening.json
│   ├── database-setup.json
│   ├── monitoring-stack.json
│   └── [other templates]
└── logs/
    └── ansible.log                   # Ansible execution logs
```

---

## Component Dependencies

```
AnsibleMCPServer
├── Server (MCP SDK)
│   ├── StdioServerTransport
│   └── Tool types
│
├── PromptTemplateLibrary
│   ├── PromptTemplate[]
│   ├── TemplateCategory enum
│   └── Version management
│
├── AIProvider (Abstract)
│   ├── OpenAIProvider
│   ├── AnthropicProvider
│   ├── GeminiProvider
│   └── OllamaProvider
│
├── Zod (Input validation)
│   ├── GeneratePlaybookSchema
│   ├── ValidatePlaybookSchema
│   ├── RunPlaybookSchema
│   ├── RefinePlaybookSchema
│   ├── LintPlaybookSchema
│   └── [Template schemas]
│
└── External Tools
    ├── yaml module
    ├── fs/promises module
    ├── child_process exec
    └── path module
```

---

## Protocol Layers

```
Layer 1: Transport
├─ STDIO (standard input/output)
├─ Message format: JSON-RPC 2.0
└─ Encoding: UTF-8

Layer 2: MCP Protocol
├─ Requests: ListToolsRequest, CallToolRequest
├─ Responses: ToolList, ToolResult
└─ Error: ErrorResponse

Layer 3: Tool Implementation
├─ Tool definitions
├─ Input schemas (JSON Schema)
├─ Tool handlers
└─ Response formatting

Layer 4: Business Logic
├─ Playbook generation (AI)
├─ Playbook validation (Ansible)
├─ Playbook execution (Ansible)
├─ Template management
└─ Refinement logic
```

---

## State Management Architecture

```
AnsibleMCPServer Instance
│
├─ playbookTemplates: Map<string, string>
│  ├─ kubernetes_deployment
│  ├─ docker_setup
│  └─ system_hardening
│
├─ promptTemplateLibrary: PromptTemplateLibrary
│  ├─ templates: Map<string, PromptTemplate>
│  ├─ versioning
│  └─ changelog tracking
│
├─ workDir: string
│  └─ /tmp/ansible-mcp
│
└─ aiProvider: AIProvider | null
   ├─ Provider configuration
   ├─ Model selection
   └─ API initialization
```

---

## Scalability Considerations

### Current Bottlenecks

1. **Tool Lookup**: Switch statement (O(n))
   - Impact: Low (only 10 tools)
   - Fix: Use Map-based routing

2. **Tool List Generation**: Regenerated on every request
   - Impact: Very low
   - Fix: Cache if needed

3. **File Operations**: Synchronous in some paths
   - Impact: Low (using async/await)
   - Fix: Ensure all I/O is async

### Recommended Improvements

```
┌─ Connection pooling for AI APIs
├─ Redis caching for generated playbooks
├─ Tool metadata caching
├─ Template compilation caching
└─ Error rate limiting
```

---

## Testing Architecture

### Current State
- No test files found
- Manual testing via CLI/Docker

### Recommended Structure

```
tests/
├── unit/
│  ├── handlers.test.ts
│  ├── validation.test.ts
│  ├── tools/
│  │  ├── generate.test.ts
│  │  ├── validate.test.ts
│  │  ├── run.test.ts
│  │  └── [other tools]
│  └── templates.test.ts
│
├── integration/
│  ├── mcp-protocol.test.ts
│  ├── error-handling.test.ts
│  └── end-to-end.test.ts
│
└── fixtures/
   ├── sample-playbooks/
   ├── test-templates/
   └── mock-responses/
```

---

## Deployment Architecture

```
Docker Compose Stack
├── ansible-mcp (MCP Server)
│  ├── Port 3000
│  ├── Volumes: playbooks, inventory, logs
│  └── Depends on: redis, vault
│
├── ai-generator (Python)
│  ├── Port 8000
│  └── Depends on: redis
│
├── redis (Cache & Queue)
│  └── Port 6379
│
└── vault (Secrets)
   └── Port 8200
```

---

## Performance Profile

| Operation | Current | Bottleneck |
|-----------|---------|------------|
| Tool List | ~1ms | Very fast |
| Generate (AI) | 5-30s | AI API latency |
| Generate (Template) | 100ms | YAML generation |
| Validate | 500ms | Ansible CLI |
| Lint | 1s | ansible-lint CLI |
| Run | Variable | Playbook execution |

---

**End of Architecture Document**

For detailed implementation analysis, see: `MCP_COMPLIANCE_ANALYSIS.md`
