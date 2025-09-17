#!/usr/bin/env node


import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import {
    ListToolsRequestSchema,
    CallToolRequestSchema
} from "@modelcontextprotocol/sdk/types.js";
import { Context } from "@zilliz/claude-context-core";
import { MilvusVectorDatabase } from "@zilliz/claude-context-core";
import * as http from "http";
import express, { Request, Response, NextFunction } from "express";
import { randomUUID } from "crypto";

// Import our modular components
import { createMcpConfig, logConfigurationSummary, showHelpMessage, ContextMcpConfig, buildProjectPath } from "./config.js";
import { createEmbeddingInstance, logEmbeddingProviderInfo } from "./embedding.js";
import { SnapshotManager } from "./snapshot.js";
import { SyncManager } from "./sync.js";
import { ToolHandlers } from "./handlers.js";

class ContextMcpServer {
    private server: Server;
    private context: Context | null = null;
    private snapshotManager: SnapshotManager;
    private syncManager: SyncManager;
    private toolHandlers: ToolHandlers;
    private httpTransport?: StreamableHTTPServerTransport;
    public httpServer?: http.Server;
    private config: ContextMcpConfig;
    // Stateless design - no session management needed

    constructor(config: ContextMcpConfig) {
        this.config = config;
        // Initialize MCP server
        this.server = new Server(
            {
                name: config.name,
                version: config.version
            },
            {
                capabilities: {
                    tools: {}
                }
            }
        );

        // Initialize embedding provider and vector database based on transport type
        // HTTP transport'ta lazy initialization (API key'ler header'lardan gelecek)
        console.log(`[EMBEDDING] HTTP transport mode - lazy initialization from headers`);
        this.context = null; // Will be initialized when first request comes

        // Initialize managers
        this.snapshotManager = new SnapshotManager();
        this.syncManager = new SyncManager(this.context, this.snapshotManager);
        this.toolHandlers = new ToolHandlers(this.context, this.snapshotManager, config);

        // Load existing codebase snapshot on startup
        this.snapshotManager.loadCodebaseSnapshot();

        this.setupTools();
    }

    private setupTools() {
        const index_description = `
Index a company codebase directory to enable semantic search for all employees.

🏢 **Company Document Search**:
- Indexes company documents and code for shared access by all employees
- Once indexed by any employee, all employees can search the same index
- Stateless design - no user-specific data or session management

✨ **Usage Guidance**:
- This tool is typically used when search fails due to an unindexed codebase.
- If indexing is attempted on an already indexed path, and a conflict is detected, you MUST prompt the user to confirm whether to proceed with a force index (i.e., re-indexing and overwriting the previous index).
- Indexing updates are immediately available to all users
`;


        const search_description = `
Search the indexed company codebase using natural language queries.

🏢 **Company Document Search**:
- Search across all company documents and code indexed by any employee
- Stateless design - each search is independent, no conversation history
- Concurrent access - supports up to 100 simultaneous users

🎯 **When to Use**:
This tool is versatile and can be used for various company document searches:
- **Code search**: Find specific functions, classes, or implementations
- **Document search**: Find company policies, procedures, or documentation
- **Issue identification**: Locate problematic code sections or bugs
- **Code review**: Understand existing implementations and patterns
- **Refactoring**: Find all related code pieces that need to be updated
- **Feature development**: Understand existing architecture and similar implementations
- **Knowledge discovery**: Find relevant information across all company documents

✨ **Usage Guidance**:
- If the codebase is not indexed, this tool will return a clear error message indicating that indexing is required first.
- You can then use the index_codebase tool to index the codebase before searching again.
- All searches are independent - no user context or conversation history is maintained
`;

        // Define available tools
        this.server.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: [
                    {
                        name: "index_codebase",
                        description: `Index company documents and code for shared access by all employees. Indexes the entire branch directory: {reposBasePath}/{defaultProject}/{defaultBranch}`,
                        inputSchema: {
                            type: "object",
                            properties: {
                                force: {
                                    type: "boolean",
                                    description: "Force re-indexing even if already indexed",
                                    default: false
                                },
                                splitter: {
                                    type: "string",
                                    description: "Code splitter to use: 'ast' for syntax-aware splitting with automatic fallback, 'langchain' for character-based splitting",
                                    enum: ["ast", "langchain"],
                                    default: "ast"
                                },
                                customExtensions: {
                                    type: "array",
                                    items: {
                                        type: "string"
                                    },
                                    description: "Optional: Additional file extensions to include beyond defaults (e.g., ['.vue', '.svelte', '.astro']). Extensions should include the dot prefix or will be automatically added",
                                    default: []
                                },
                                ignorePatterns: {
                                    type: "array",
                                    items: {
                                        type: "string"
                                    },
                                    description: "Optional: Additional ignore patterns to exclude specific files/directories beyond defaults. Only include this parameter if the user explicitly requests custom ignore patterns (e.g., ['static/**', '*.tmp', 'private/**'])",
                                    default: []
                                }
                            },
                            required: []
                        }
                    },
                    {
                        name: "search_code",
                        description: `Search company documents and code using natural language queries. Stateless search across all indexed company content. Searches the entire branch directory: {reposBasePath}/{defaultProject}/{defaultBranch}`,
                        inputSchema: {
                            type: "object",
                            properties: {
                                query: {
                                    type: "string",
                                    description: "Natural language query to search for in the codebase"
                                },
                                limit: {
                                    type: "number",
                                    description: "Maximum number of results to return",
                                    default: 10,
                                    maximum: 50
                                },
                                extensionFilter: {
                                    type: "array",
                                    items: {
                                        type: "string"
                                    },
                                    description: "Optional: List of file extensions to filter results. (e.g., ['.ts','.py']).",
                                    default: []
                                }
                            },
                            required: ["query"]
                        }
                    },
                    {
                        name: "clear_index",
                        description: `Clear the company document search index for the default project and branch from config. Clears the entire branch directory: {reposBasePath}/{defaultProject}/{defaultBranch}`,
                        inputSchema: {
                            type: "object",
                            properties: {},
                            required: []
                        }
                    },
                    {
                        name: "get_indexing_status",
                        description: `Get the current indexing status of all company document projects. Shows progress percentage for actively indexing codebases and completion status for indexed codebases.`,
                        inputSchema: {
                            type: "object",
                            properties: {},
                            required: []
                        }
                    },
                    {
                        name: "index_project",
                        description: `Index the default company project from the structured repos directory using default branch from config. Automatically indexes all components in the specified branch. Uses the configured project structure: {reposBasePath}/{defaultProject}/{defaultBranch}/{component}`,
                        inputSchema: {
                            type: "object",
                            properties: {
                                force: {
                                    type: "boolean",
                                    description: "Force re-indexing even if already indexed",
                                    default: false
                                },
                                splitter: {
                                    type: "string",
                                    description: "Code splitter to use: 'ast' for syntax-aware splitting with automatic fallback, 'langchain' for character-based splitting",
                                    enum: ["ast", "langchain"],
                                    default: "ast"
                                }
                            },
                            required: []
                        }
                    },
                    {
                        name: "list_projects",
                        description: `List available projects in the repos directory`,
                        inputSchema: {
                            type: "object",
                            properties: {},
                            required: []
                        }
                    },
                    {
                        name: "list_branches",
                        description: `List available branches for the default project from config`,
                        inputSchema: {
                            type: "object",
                            properties: {},
                            required: []
                        }
                    },
                    {
                        name: "list_components",
                        description: `List available components for the default project and branch from config`,
                        inputSchema: {
                            type: "object",
                            properties: {},
                            required: []
                        }
                    }
                ]
            };
        });

        // Handle tool execution
        this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
            const { name, arguments: args } = request.params;

            switch (name) {
                case "index_codebase":
                    return await this.toolHandlers.handleIndexCodebase(args);
                case "search_code":
                    return await this.toolHandlers.handleSearchCode(args);
                case "clear_index":
                    return await this.toolHandlers.handleClearIndex(args);
                case "get_indexing_status":
                    return await this.toolHandlers.handleGetIndexingStatus(args);
                case "index_project":
                    return await this.toolHandlers.handleIndexProject(args);
                case "list_projects":
                    return await this.toolHandlers.handleListProjects(args);
                case "list_branches":
                    return await this.toolHandlers.handleListBranches(args);
                case "list_components":
                    return await this.toolHandlers.handleListComponents(args);

                default:
                    throw new Error(`Unknown tool: ${name}`);
            }
        });
    }

    async start() {
        console.log('[SYNC-DEBUG] MCP server start() method called');
        console.log('Starting Context MCP server...');

        await this.startHttpServer();

        // Stateless design - no background sync needed
        console.log('[SYNC-DEBUG] Stateless MCP server initialization complete');
    }


    private async startHttpServer() {
        const config = this.getConfig();
        if (!config.transport?.http) {
            throw new Error('HTTP transport configuration is missing');
        }

        const httpConfig = config.transport.http;
        
        // Stateless design - no MCP transport needed, we'll handle requests directly

        // Create Express app
        const app = express();
        
        // Add custom headers middleware
        if (httpConfig.headers) {
            app.use((req: Request, res: Response, next: NextFunction) => {
                Object.entries(httpConfig.headers!).forEach(([key, value]) => {
                    res.setHeader(key, value);
                });
                next();
            });
        }

        // Add parameter extraction middleware for HTTP transport
        app.use((req: Request, res: Response, next: NextFunction) => {
            // Extract parameters from headers and set as environment variables
            const headers = req.headers;
            
            if (headers['x-embedding-provider']) {
                process.env.EMBEDDING_PROVIDER = headers['x-embedding-provider'] as string;
            }
            if (headers['x-embedding-model']) {
                process.env.EMBEDDING_MODEL = headers['x-embedding-model'] as string;
            }
            if (headers['x-openai-api-key']) {
                process.env.OPENAI_API_KEY = headers['x-openai-api-key'] as string;
            }
            if (headers['x-openai-base-url']) {
                process.env.OPENAI_BASE_URL = headers['x-openai-base-url'] as string;
            }
            if (headers['x-milvus-address']) {
                process.env.MILVUS_ADDRESS = headers['x-milvus-address'] as string;
            }
            if (headers['x-milvus-token']) {
                process.env.MILVUS_TOKEN = headers['x-milvus-token'] as string;
            }
            if (headers['x-default-project']) {
                process.env.DEFAULT_PROJECT = headers['x-default-project'] as string;
            }
            if (headers['x-default-branch']) {
                process.env.DEFAULT_BRANCH = headers['x-default-branch'] as string;
            }
            
            // Initialize context if not already initialized (lazy initialization)
            if (!this.context && process.env.OPENAI_API_KEY && process.env.MILVUS_ADDRESS) {
                console.log(`[EMBEDDING] Initializing context from headers...`);
                try {
                    const embedding = createEmbeddingInstance({
                        embeddingProvider: process.env.EMBEDDING_PROVIDER as any || 'OpenAI',
                        embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
                        openaiApiKey: process.env.OPENAI_API_KEY,
                        openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
                        milvusAddress: process.env.MILVUS_ADDRESS,
                        milvusToken: process.env.MILVUS_TOKEN
                    } as ContextMcpConfig);
                    
                    const vectorDatabase = new MilvusVectorDatabase({
                        address: process.env.MILVUS_ADDRESS,
                        ...(process.env.MILVUS_TOKEN && { token: process.env.MILVUS_TOKEN })
                    });
                    
                    this.context = new Context({
                        embedding,
                        vectorDatabase
                    });
                    
                    // Update managers with new context
                    this.syncManager = new SyncManager(this.context, this.snapshotManager);
                    this.toolHandlers = new ToolHandlers(this.context, this.snapshotManager, this.config);
                    
                    console.log(`[EMBEDDING] ✅ Context initialized successfully from headers`);
                } catch (error) {
                    console.error(`[EMBEDDING] ❌ Failed to initialize context from headers:`, error);
                }
            }
            
            next();
        });

        // Parse JSON bodies
        app.use(express.json());

        // Handle MCP requests with stateless design
        app.all('/mcp', async (req: Request, res: Response) => {
            try {
                // Log request details for debugging
                console.log(`[HTTP] Handling stateless MCP request - Method: ${req.method}`);
                
                // Ensure context is initialized for each request
                if (!this.context && process.env.OPENAI_API_KEY && process.env.MILVUS_ADDRESS) {
                    console.log(`[EMBEDDING] Ensuring context initialization for request...`);
                    try {
                        const embedding = createEmbeddingInstance({
                            embeddingProvider: process.env.EMBEDDING_PROVIDER as any || 'OpenAI',
                            embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
                            openaiApiKey: process.env.OPENAI_API_KEY,
                            openaiBaseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
                            milvusAddress: process.env.MILVUS_ADDRESS,
                            milvusToken: process.env.MILVUS_TOKEN
                        } as ContextMcpConfig);
                        
                        const vectorDatabase = new MilvusVectorDatabase({
                            address: process.env.MILVUS_ADDRESS,
                            ...(process.env.MILVUS_TOKEN && { token: process.env.MILVUS_TOKEN })
                        });
                        
                        this.context = new Context({
                            embedding,
                            vectorDatabase
                        });
                        
                        // Update managers with new context
                        this.syncManager = new SyncManager(this.context, this.snapshotManager);
                        this.toolHandlers = new ToolHandlers(this.context, this.snapshotManager, this.config);
                        
                        console.log(`[EMBEDDING] ✅ Context ensured and initialized successfully`);
                    } catch (error) {
                        console.error(`[EMBEDDING] ❌ Failed to ensure context initialization:`, error);
                    }
                }
                
                // Handle MCP requests directly without transport
                const mcpRequest = req.body;
                
                if (!mcpRequest || !mcpRequest.method) {
                    res.status(400).json({ error: 'Invalid MCP request' });
                    return;
                }
                
                // Handle different MCP methods
                switch (mcpRequest.method) {
                    case 'initialize':
                        res.json({
                            jsonrpc: '2.0',
                            id: mcpRequest.id,
                            result: {
                                protocolVersion: '2024-11-05',
                                capabilities: {
                                    tools: {}
                                },
                                serverInfo: {
                                    name: this.config.name,
                                    version: this.config.version
                                }
                            }
                        });
                        break;
                        
                    case 'tools/list':
                        res.json({
                            jsonrpc: '2.0',
                            id: mcpRequest.id,
                            result: {
                                tools: [
                                    {
                                        name: "index_codebase",
                                        description: `Index company documents and code for shared access by all employees. Indexes the entire branch directory: {reposBasePath}/{defaultProject}/{defaultBranch}`,
                                        inputSchema: {
                                            type: "object",
                                            properties: {
                                                force: { type: "boolean", description: "Force re-indexing even if already indexed", default: false },
                                                splitter: { type: "string", description: "Code splitter to use: 'ast' for syntax-aware splitting with automatic fallback, 'langchain' for character-based splitting", enum: ["ast", "langchain"], default: "ast" },
                                                customExtensions: { type: "array", items: { type: "string" }, description: "Optional: Additional file extensions to include beyond defaults", default: [] },
                                                ignorePatterns: { type: "array", items: { type: "string" }, description: "Optional: Additional ignore patterns to exclude specific files/directories beyond defaults", default: [] }
                                            },
                                            required: []
                                        }
                                    },
                                    {
                                        name: "search_code",
                                        description: `Search company documents and code using natural language queries. Stateless search across all indexed company content. Searches the entire branch directory: {reposBasePath}/{defaultProject}/{defaultBranch}`,
                                        inputSchema: {
                                            type: "object",
                                            properties: {
                                                query: { type: "string", description: "Natural language query to search for in the codebase" },
                                                limit: { type: "number", description: "Maximum number of results to return", default: 10, maximum: 50 },
                                                extensionFilter: { type: "array", items: { type: "string" }, description: "Optional: List of file extensions to filter results", default: [] }
                                            },
                                            required: ["query"]
                                        }
                                    },
                                    {
                                        name: "clear_index",
                                        description: `Clear the company document search index for the default project and branch from config. Clears the entire branch directory: {reposBasePath}/{defaultProject}/{defaultBranch}`,
                                        inputSchema: { type: "object", properties: {}, required: [] }
                                    },
                                    {
                                        name: "get_indexing_status",
                                        description: `Get the current indexing status of all company document projects. Shows progress percentage for actively indexing codebases and completion status for indexed codebases.`,
                                        inputSchema: { type: "object", properties: {}, required: [] }
                                    },
                                    {
                                        name: "index_project",
                                        description: `Index the default company project from the structured repos directory using default branch from config. Automatically indexes all components in the specified branch. Uses the configured project structure: {reposBasePath}/{defaultProject}/{defaultBranch}/{component}`,
                                        inputSchema: {
                                            type: "object",
                                            properties: {
                                                force: { type: "boolean", description: "Force re-indexing even if already indexed", default: false },
                                                splitter: { type: "string", description: "Code splitter to use: 'ast' for syntax-aware splitting with automatic fallback, 'langchain' for character-based splitting", enum: ["ast", "langchain"], default: "ast" }
                                            },
                                            required: []
                                        }
                                    },
                                    {
                                        name: "list_projects",
                                        description: `List available projects in the repos directory`,
                                        inputSchema: { type: "object", properties: {}, required: [] }
                                    },
                                    {
                                        name: "list_branches",
                                        description: `List available branches for the default project from config`,
                                        inputSchema: { type: "object", properties: {}, required: [] }
                                    },
                                    {
                                        name: "list_components",
                                        description: `List available components for the default project and branch from config`,
                                        inputSchema: { type: "object", properties: {}, required: [] }
                                    }
                                ]
                            }
                        });
                        break;
                        
                    case 'tools/call':
                        const { name, arguments: args } = mcpRequest.params;
                        
                        try {
                            let result;
                            switch (name) {
                                case "index_codebase":
                                    result = await this.toolHandlers.handleIndexCodebase(args);
                                    break;
                                case "search_code":
                                    result = await this.toolHandlers.handleSearchCode(args);
                                    break;
                                case "clear_index":
                                    result = await this.toolHandlers.handleClearIndex(args);
                                    break;
                                case "get_indexing_status":
                                    result = await this.toolHandlers.handleGetIndexingStatus(args);
                                    break;
                                case "index_project":
                                    result = await this.toolHandlers.handleIndexProject(args);
                                    break;
                                case "list_projects":
                                    result = await this.toolHandlers.handleListProjects(args);
                                    break;
                                case "list_branches":
                                    result = await this.toolHandlers.handleListBranches(args);
                                    break;
                                case "list_components":
                                    result = await this.toolHandlers.handleListComponents(args);
                                    break;
                                default:
                                    throw new Error(`Unknown tool: ${name}`);
                            }
                            
                            res.json({
                                jsonrpc: '2.0',
                                id: mcpRequest.id,
                                result
                            });
                        } catch (error: any) {
                            res.json({
                                jsonrpc: '2.0',
                                id: mcpRequest.id,
                                error: {
                                    code: -32000,
                                    message: error.message || 'Tool execution failed'
                                }
                            });
                        }
                        break;
                        
                    default:
                        res.json({
                            jsonrpc: '2.0',
                            id: mcpRequest.id,
                            error: {
                                code: -32601,
                                message: `Method not found: ${mcpRequest.method}`
                            }
                        });
                }
            } catch (error) {
                console.error('[HTTP] Error handling request:', error);
                res.status(500).json({ error: 'Internal server error' });
            }
        });

        // Health check endpoint
        app.get('/health', (req: Request, res: Response) => {
            res.json({ status: 'ok', timestamp: new Date().toISOString() });
        });

        // Create HTTP server
        this.httpServer = http.createServer(app);

        // Start server with improved error handling and port binding
        return new Promise<void>((resolve, reject) => {
            // Set server timeout to prevent hanging connections - optimized for concurrent access
            this.httpServer!.timeout = 60000; // 60 seconds for better concurrent handling
            
            this.httpServer!.listen(httpConfig.port, httpConfig.host, () => {
                console.log(`[HTTP] MCP server started and listening on http://${httpConfig.host}:${httpConfig.port}`);
                console.log(`[HTTP] MCP endpoint: http://${httpConfig.host}:${httpConfig.port}/mcp`);
                console.log(`[HTTP] Health check: http://${httpConfig.host}:${httpConfig.port}/health`);
                
                // Stateless design - no transport connection needed
                console.log('[HTTP] Stateless server ready');
                    resolve();
            });

            this.httpServer!.on('error', (error: any) => {
                console.error('[HTTP] Server error:', error);
                if (error.code === 'EADDRINUSE') {
                    console.error(`[HTTP] Port ${httpConfig.port} is already in use. Please try a different port or wait for the previous server to fully shut down.`);
                }
                reject(error);
            });
            
            // Handle server close events
            this.httpServer!.on('close', () => {
                console.log('[HTTP] Server closed');
            });
        });
    }

    private getConfig(): ContextMcpConfig {
        return this.config;
    }

    private initializeGlobalContext(config: ContextMcpConfig): void {
        // Initialize global context for shared codebase (HTTP transport)
        console.log(`[EMBEDDING] Initializing global context for shared codebase...`);
        try {
            const embedding = createEmbeddingInstance({
                embeddingProvider: 'OpenAI',
                embeddingModel: 'text-embedding-3-small',
                openaiApiKey: 'placeholder', // Will be set from headers
                openaiBaseUrl: 'https://api.openai.com/v1',
                milvusAddress: 'placeholder', // Will be set from headers
                milvusToken: 'placeholder'
            } as ContextMcpConfig);
            
            const vectorDatabase = new MilvusVectorDatabase({
                address: 'placeholder', // Will be set from headers
                token: 'placeholder'
            });
            
            this.context = new Context({
                embedding,
                vectorDatabase
            });
            
            console.log(`[EMBEDDING] ✅ Global context initialized successfully`);
        } catch (error) {
            console.error(`[EMBEDDING] ❌ Failed to initialize global context:`, error);
        }
    }


}

// Global server instance for graceful shutdown
let globalServer: ContextMcpServer | null = null;

// Main execution
async function main() {
    // Parse command line arguments
    const args = process.argv.slice(2);

    // Show help if requested
    if (args.includes('--help') || args.includes('-h')) {
        showHelpMessage();
        process.exit(0);
    }

    // Create configuration
    const config = createMcpConfig();
    logConfigurationSummary(config);

    globalServer = new ContextMcpServer(config);
    await globalServer.start();
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
    console.error("Received SIGINT, shutting down gracefully...");
    await gracefulShutdown();
});

process.on('SIGTERM', async () => {
    console.error("Received SIGTERM, shutting down gracefully...");
    await gracefulShutdown();
});

async function gracefulShutdown() {
    try {
        // Close HTTP server if running
        if (globalServer?.httpServer) {
            console.log("Closing HTTP server...");
            await new Promise<void>((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error('Server close timeout'));
                }, 5000); // 5 second timeout
                
                globalServer!.httpServer!.close((error) => {
                    clearTimeout(timeout);
                    if (error) {
                        console.error("Error closing HTTP server:", error);
                        reject(error);
                    } else {
                        console.log("HTTP server closed successfully");
                        resolve();
                    }
                });
            });
        }
        
        // Give a moment for cleanup
        await new Promise(resolve => setTimeout(resolve, 100));
        
        console.log("Graceful shutdown completed");
        process.exit(0);
    } catch (error) {
        console.error("Error during graceful shutdown:", error);
        process.exit(1);
    }
}

// Always start the server - this is designed to be the main entry point
main().catch((error) => {
    console.error("Fatal error:", error);
    process.exit(1);
});