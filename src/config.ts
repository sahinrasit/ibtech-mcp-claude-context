import { envManager } from "@zilliz/claude-context-core";
import * as path from "path";
import * as os from "os";
import * as fs from "fs";
 
export interface ContextMcpConfig {
    name: string;
    version: string;
    // Embedding provider configuration
    embeddingProvider: 'OpenAI' | 'VoyageAI' | 'Gemini' | 'Ollama' | 'Ibthink';
    embeddingModel: string;
    // Provider-specific API keys
    openaiApiKey?: string;
    openaiBaseUrl?: string;
    voyageaiApiKey?: string;
    geminiApiKey?: string;
    geminiBaseUrl?: string;
    // Ibthink configuration
    ibthinkApiKey?: string;
    ibthinkBaseUrl?: string;
    // Ollama configuration
    ollamaModel?: string;
    ollamaHost?: string;
    // Vector database configuration
    milvusAddress?: string; // Optional, can be auto-resolved from token
    milvusToken?: string;
    // Project structure configuration
    reposBasePath?: string; // Base path for repos folder (default: ~/repos)
    defaultProject?: string; // Default project name
    defaultBranch?: string; // Default branch name
    // HTTP Transport configuration
    transport?: {
        type: 'stdio' | 'http';
        http?: {
            port?: number;
            host?: string;
            enableJsonResponse?: boolean;
            allowedHosts?: string[];
            allowedOrigins?: string[];
            enableDnsRebindingProtection?: boolean;
            headers?: Record<string, string>;
        };
    };
}
 
// Legacy format (v1) - for backward compatibility
export interface CodebaseSnapshotV1 {
    indexedCodebases: string[];
    indexingCodebases: string[] | Record<string, number>;  // Array (legacy) or Map of codebase path to progress percentage
    lastUpdated: string;
}
 
// New format (v2) - structured with codebase information
 
// Base interface for common fields
interface CodebaseInfoBase {
    lastUpdated: string;
}
 
// Indexing state - when indexing is in progress
export interface CodebaseInfoIndexing extends CodebaseInfoBase {
    status: 'indexing';
    indexingPercentage: number;  // Current progress percentage
}
 
// Indexed state - when indexing completed successfully
export interface CodebaseInfoIndexed extends CodebaseInfoBase {
    status: 'indexed';
    indexedFiles: number;        // Number of files indexed
    totalChunks: number;         // Total number of chunks generated
    indexStatus: 'completed' | 'limit_reached';  // Status from indexing result
}
 
// Index failed state - when indexing failed
export interface CodebaseInfoIndexFailed extends CodebaseInfoBase {
    status: 'indexfailed';
    errorMessage: string;        // Error message from the failure
    lastAttemptedPercentage?: number;  // Progress when failure occurred
}
 
// Union type for all codebase information states
export type CodebaseInfo = CodebaseInfoIndexing | CodebaseInfoIndexed | CodebaseInfoIndexFailed;
 
export interface CodebaseSnapshotV2 {
    formatVersion: 'v2';
    codebases: Record<string, CodebaseInfo>;  // codebasePath -> CodebaseInfo
    lastUpdated: string;
}
 
// Union type for all supported formats
export type CodebaseSnapshot = CodebaseSnapshotV1 | CodebaseSnapshotV2;
 
// Helper function to get default model for each provider
export function getDefaultModelForProvider(provider: string): string {
    switch (provider) {
        case 'OpenAI':
            return 'text-embedding-3-small';
        case 'VoyageAI':
            return 'voyage-code-3';
        case 'Gemini':
            return 'gemini-embedding-001';
        case 'Ollama':
            return 'nomic-embed-text';
        case 'Ibthink':
            return 'text-embedding-ada-002';
        default:
            return 'text-embedding-3-small';
    }
}
 
// Helper function to get embedding model with provider-specific environment variable priority
export function getEmbeddingModelForProvider(provider: string): string {
    switch (provider) {
        case 'Ollama':
            // For Ollama, prioritize OLLAMA_MODEL over EMBEDDING_MODEL for backward compatibility
            const ollamaModel = envManager.get('OLLAMA_MODEL') || envManager.get('EMBEDDING_MODEL') || getDefaultModelForProvider(provider);
            console.log(`[DEBUG] 🎯 Ollama model selection: OLLAMA_MODEL=${envManager.get('OLLAMA_MODEL') || 'NOT SET'}, EMBEDDING_MODEL=${envManager.get('EMBEDDING_MODEL') || 'NOT SET'}, selected=${ollamaModel}`);
            return ollamaModel;
        case 'OpenAI':
        case 'VoyageAI':
        case 'Gemini':
        case 'Ibthink':
        default:
            // For all other providers, use EMBEDDING_MODEL or default
            const selectedModel = envManager.get('EMBEDDING_MODEL') || getDefaultModelForProvider(provider);
            console.log(`[DEBUG] 🎯 ${provider} model selection: EMBEDDING_MODEL=${envManager.get('EMBEDDING_MODEL') || 'NOT SET'}, selected=${selectedModel}`);
            return selectedModel;
    }
}
 
export function createMcpConfig(): ContextMcpConfig {
    // Debug: Print all environment variables related to Context
    console.log(`[DEBUG] 🔍 Environment Variables Debug:`);
    console.log(`[DEBUG]   EMBEDDING_PROVIDER: ${envManager.get('EMBEDDING_PROVIDER') || 'NOT SET'}`);
    console.log(`[DEBUG]   EMBEDDING_MODEL: ${envManager.get('EMBEDDING_MODEL') || 'NOT SET'}`);
    console.log(`[DEBUG]   OLLAMA_MODEL: ${envManager.get('OLLAMA_MODEL') || 'NOT SET'}`);
    console.log(`[DEBUG]   GEMINI_API_KEY: ${envManager.get('GEMINI_API_KEY') ? 'SET (length: ' + envManager.get('GEMINI_API_KEY')!.length + ')' : 'NOT SET'}`);
    console.log(`[DEBUG]   OPENAI_API_KEY: ${envManager.get('OPENAI_API_KEY') ? 'SET (length: ' + envManager.get('OPENAI_API_KEY')!.length + ')' : 'NOT SET'}`);
    console.log(`[DEBUG]   MILVUS_ADDRESS: ${envManager.get('MILVUS_ADDRESS') || 'NOT SET'}`);
    console.log(`[DEBUG]   NODE_ENV: ${envManager.get('NODE_ENV') || 'NOT SET'}`);
 
    const transportType = (envManager.get('MCP_TRANSPORT_TYPE') as 'stdio' | 'http') || 'stdio';
   
    const config: ContextMcpConfig = {
        name: envManager.get('MCP_SERVER_NAME') || "Context MCP Server",
        version: envManager.get('MCP_SERVER_VERSION') || "1.0.0",
        // Embedding provider configuration - HTTP transport'ta da environment variable'lardan alınacak
        embeddingProvider: (envManager.get('EMBEDDING_PROVIDER') as 'OpenAI' | 'VoyageAI' | 'Gemini' | 'Ollama' | 'Ibthink') || 'OpenAI',
        embeddingModel: getEmbeddingModelForProvider(envManager.get('EMBEDDING_PROVIDER') || 'OpenAI'),
        // Provider-specific API keys - HTTP transport'ta header'lardan alınacak
        openaiApiKey: transportType === 'http' ? 'placeholder' : envManager.get('OPENAI_API_KEY'),
        openaiBaseUrl: transportType === 'http' ? 'https://api.openai.com/v1' : envManager.get('OPENAI_BASE_URL'),
        voyageaiApiKey: envManager.get('VOYAGEAI_API_KEY'),
        geminiApiKey: envManager.get('GEMINI_API_KEY'),
        geminiBaseUrl: envManager.get('GEMINI_BASE_URL'),
        // Ibthink configuration - HTTP transport'ta da environment variable'lardan alınacak
        ibthinkApiKey: envManager.get('IBTHINK_API_KEY'),
        ibthinkBaseUrl: envManager.get('IBTHINK_BASE_URL') || 'https://smg-llm-api.seip-vip-prd-ocpgen11.qnb.com.tr/v1',
        // Ollama configuration
        ollamaModel: envManager.get('OLLAMA_MODEL'),
        ollamaHost: envManager.get('OLLAMA_HOST'),
        // Vector database configuration - HTTP transport'ta da environment variable'lardan alınacak
        milvusAddress: envManager.get('MILVUS_ADDRESS'),
        milvusToken: envManager.get('MILVUS_TOKEN'),
        // Project structure configuration - HTTP transport'ta da environment variable'lardan alınacak
        reposBasePath: path.join(process.cwd(), 'repos'), // Always use ./repos in project directory
        defaultProject: envManager.get('DEFAULT_PROJECT') || 'mobilebanking',
        defaultBranch: envManager.get('DEFAULT_BRANCH') || 'prod',
        // HTTP Transport configuration
        transport: {
            type: transportType,
            http: {
                port: parseInt(envManager.get('MCP_HTTP_PORT') || '3000'),
                host: envManager.get('MCP_HTTP_HOST') || 'localhost',
                enableJsonResponse: envManager.get('MCP_HTTP_JSON_RESPONSE') === 'true',
                allowedHosts: envManager.get('MCP_HTTP_ALLOWED_HOSTS')?.split(',').map(h => h.trim()),
                allowedOrigins: envManager.get('MCP_HTTP_ALLOWED_ORIGINS')?.split(',').map(o => o.trim()),
                enableDnsRebindingProtection: envManager.get('MCP_HTTP_DNS_REBINDING_PROTECTION') === 'true',
                headers: envManager.get('MCP_HTTP_HEADERS') ? JSON.parse(envManager.get('MCP_HTTP_HEADERS')!) : undefined
            }
        }
    };
 
    return config;
}
 
/**
 * Build project path based on project name and branch
 * Structure: {reposBasePath}/{projectName}/{branch}/{component}
 */
export function buildProjectPath(
    reposBasePath: string,
    projectName: string,
    branch: string,
    component?: string
): string {
    let projectPath = path.join(reposBasePath, projectName, branch);
   
    if (component) {
        projectPath = path.join(projectPath, component);
    }
   
    return projectPath;
}
 
/**
 * Get available projects from repos directory
 */
export function getAvailableProjects(reposBasePath: string): string[] {
    try {
        if (!fs.existsSync(reposBasePath)) {
            return [];
        }
       
        const projects = fs.readdirSync(reposBasePath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
           
        return projects;
    } catch (error) {
        console.error(`[CONFIG] Error reading projects from ${reposBasePath}:`, error);
        return [];
    }
}
 
/**
 * Get available branches for a project
 */
export function getAvailableBranches(reposBasePath: string, projectName: string): string[] {
    try {
        const projectPath = path.join(reposBasePath, projectName);
       
        if (!fs.existsSync(projectPath)) {
            return [];
        }
       
        const branches = fs.readdirSync(projectPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
           
        return branches;
    } catch (error) {
        console.error(`[CONFIG] Error reading branches for project ${projectName}:`, error);
        return [];
    }
}
 
/**
 * Get available components for a project branch
 */
export function getAvailableComponents(reposBasePath: string, projectName: string, branch: string): string[] {
    try {
        const branchPath = path.join(reposBasePath, projectName, branch);
       
        if (!fs.existsSync(branchPath)) {
            return [];
        }
       
        const components = fs.readdirSync(branchPath, { withFileTypes: true })
            .filter(dirent => dirent.isDirectory())
            .map(dirent => dirent.name);
           
        return components;
    } catch (error) {
        console.error(`[CONFIG] Error reading components for ${projectName}/${branch}:`, error);
        return [];
    }
}
 
export function logConfigurationSummary(config: ContextMcpConfig): void {
    // Log configuration summary before starting server
    console.log(`[MCP] 🚀 Starting Context MCP Server`);
    console.log(`[MCP] Configuration Summary:`);
    console.log(`[MCP]   Server: ${config.name} v${config.version}`);
    console.log(`[MCP]   Transport: ${config.transport?.type || 'stdio'}`);
   
    if (config.transport?.type === 'http' && config.transport.http) {
        console.log(`[MCP]   HTTP Server: ${config.transport.http.host}:${config.transport.http.port}`);
        console.log(`[MCP]   JSON Response: ${config.transport.http.enableJsonResponse ? 'Enabled' : 'Disabled (SSE)'}`);
        if (config.transport.http.allowedHosts?.length) {
            console.log(`[MCP]   Allowed Hosts: ${config.transport.http.allowedHosts.join(', ')}`);
        }
        if (config.transport.http.allowedOrigins?.length) {
            console.log(`[MCP]   Allowed Origins: ${config.transport.http.allowedOrigins.join(', ')}`);
        }
        if (config.transport.http.headers) {
            console.log(`[MCP]   Custom Headers: ${Object.keys(config.transport.http.headers).length} configured`);
        }
    }
   
    console.log(`[MCP]   Embedding Provider: ${config.embeddingProvider}`);
    console.log(`[MCP]   Embedding Model: ${config.embeddingModel}`);
    console.log(`[MCP]   Milvus Address: ${config.milvusAddress || (config.milvusToken ? '[Auto-resolve from token]' : '[Not configured]')}`);
 
    // Log provider-specific configuration without exposing sensitive data
    switch (config.embeddingProvider) {
        case 'OpenAI':
            console.log(`[MCP]   OpenAI API Key: ${config.openaiApiKey ? '✅ Configured' : '❌ Missing'}`);
            if (config.openaiBaseUrl) {
                console.log(`[MCP]   OpenAI Base URL: ${config.openaiBaseUrl}`);
            }
            break;
        case 'VoyageAI':
            console.log(`[MCP]   VoyageAI API Key: ${config.voyageaiApiKey ? '✅ Configured' : '❌ Missing'}`);
            break;
        case 'Gemini':
            console.log(`[MCP]   Gemini API Key: ${config.geminiApiKey ? '✅ Configured' : '❌ Missing'}`);
            if (config.geminiBaseUrl) {
                console.log(`[MCP]   Gemini Base URL: ${config.geminiBaseUrl}`);
            }
            break;
        case 'Ollama':
            console.log(`[MCP]   Ollama Host: ${config.ollamaHost || 'http://127.0.0.1:11434'}`);
            console.log(`[MCP]   Ollama Model: ${config.embeddingModel}`);
            break;
        case 'Ibthink':
            console.log(`[MCP]   Ibthink API Key: ${config.ibthinkApiKey ? '✅ Configured' : '❌ Missing'}`);
            console.log(`[MCP]   Ibthink Base URL: ${config.ibthinkBaseUrl || 'Default'}`);
            break;
    }
 
    console.log(`[MCP] 🔧 Initializing server components...`);
}
 
export function showHelpMessage(): void {
    console.log(`
Context MCP Server
 
Usage: npx @zilliz/claude-context-mcp@latest [options]
 
Options:
  --help, -h                          Show this help message
 
Environment Variables:
  MCP_SERVER_NAME         Server name
  MCP_SERVER_VERSION      Server version
 
  Transport Configuration:
  MCP_TRANSPORT_TYPE      Transport type: stdio, http (default: stdio)
  MCP_HTTP_PORT           HTTP server port (default: 3000)
  MCP_HTTP_HOST           HTTP server host (default: localhost)
  MCP_HTTP_JSON_RESPONSE  Enable JSON responses instead of SSE (default: false)
  MCP_HTTP_ALLOWED_HOSTS  Comma-separated list of allowed hosts for DNS rebinding protection
  MCP_HTTP_ALLOWED_ORIGINS Comma-separated list of allowed origins for DNS rebinding protection
  MCP_HTTP_DNS_REBINDING_PROTECTION Enable DNS rebinding protection (default: false)
  MCP_HTTP_HEADERS        JSON string of custom headers to include in responses
 
  Embedding Provider Configuration:
  EMBEDDING_PROVIDER      Embedding provider: OpenAI, VoyageAI, Gemini, Ollama, Ibthink (default: OpenAI)
  EMBEDDING_MODEL         Embedding model name (works for all providers)
 
  Provider-specific API Keys:
  OPENAI_API_KEY          OpenAI API key (required for OpenAI provider)
  OPENAI_BASE_URL         OpenAI API base URL (optional, for custom endpoints)
  VOYAGEAI_API_KEY        VoyageAI API key (required for VoyageAI provider)
  GEMINI_API_KEY          Google AI API key (required for Gemini provider)
  GEMINI_BASE_URL         Gemini API base URL (optional, for custom endpoints)
  IBTHINK_API_KEY         Ibthink API key (required for Ibthink provider)
  IBTHINK_BASE_URL        Ibthink API base URL (optional, default: https://smg-llm-api.seip-vip-prd-ocpgen11.qnb.com.tr/v1)
 
  Ollama Configuration:
  OLLAMA_HOST             Ollama server host (default: http://127.0.0.1:11434)
  OLLAMA_MODEL            Ollama model name (alternative to EMBEDDING_MODEL for Ollama)
 
  Vector Database Configuration:
  MILVUS_ADDRESS          Milvus address (optional, can be auto-resolved from token)
  MILVUS_TOKEN            Milvus token (optional, used for authentication and address resolution)
 
Examples:
  # Start MCP server with stdio transport (default)
  OPENAI_API_KEY=sk-xxx MILVUS_ADDRESS=localhost:19530 npx @zilliz/claude-context-mcp@latest
 
  # Start MCP server with HTTP transport on port 3000
  MCP_TRANSPORT_TYPE=http MCP_HTTP_PORT=3000 OPENAI_API_KEY=sk-xxx MILVUS_TOKEN=your-token npx @zilliz/claude-context-mcp@latest
 
  # Start MCP server with HTTP transport and custom headers
  MCP_TRANSPORT_TYPE=http MCP_HTTP_PORT=8080 MCP_HTTP_HEADERS='{"X-API-Key":"your-api-key","X-Custom-Header":"value"}' OPENAI_API_KEY=sk-xxx MILVUS_TOKEN=your-token npx @zilliz/claude-context-mcp@latest
 
  # Start MCP server with HTTP transport and DNS rebinding protection
  MCP_TRANSPORT_TYPE=http MCP_HTTP_ALLOWED_HOSTS=localhost,127.0.0.1 MCP_HTTP_DNS_REBINDING_PROTECTION=true OPENAI_API_KEY=sk-xxx MILVUS_TOKEN=your-token npx @zilliz/claude-context-mcp@latest
 
  # Start MCP server with VoyageAI and HTTP transport
  MCP_TRANSPORT_TYPE=http EMBEDDING_PROVIDER=VoyageAI VOYAGEAI_API_KEY=pa-xxx EMBEDDING_MODEL=voyage-3-large MILVUS_TOKEN=your-token npx @zilliz/claude-context-mcp@latest
 
  # Start MCP server with Ollama and HTTP transport
  MCP_TRANSPORT_TYPE=http EMBEDDING_PROVIDER=Ollama OLLAMA_MODEL=mxbai-embed-large MILVUS_TOKEN=your-token npx @zilliz/claude-context-mcp@latest
 
  # Start MCP server with Ibthink and HTTP transport
  MCP_TRANSPORT_TYPE=http EMBEDDING_PROVIDER=Ibthink IBTHINK_API_KEY=Cash_Management_Payments_Ae_zy7he5 EMBEDDING_MODEL=text-embedding-ada-002 MILVUS_TOKEN=your-token npx @zilliz/claude-context-mcp@latest
        `);
}
 
