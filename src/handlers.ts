import * as fs from "fs";
import * as path from "path";
import * as crypto from "crypto";
import { Context, COLLECTION_LIMIT_MESSAGE } from "@zilliz/claude-context-core";
import { SnapshotManager } from "./snapshot.js";
import { ensureAbsolutePath, truncateContent, trackCodebasePath } from "./utils.js";
import { ContextMcpConfig } from "./config.js";

export class ToolHandlers {
    private context: Context | null;
    private snapshotManager: SnapshotManager;
    private config: ContextMcpConfig;
    private indexingStats: { indexedFiles: number; totalChunks: number } | null = null;
    private currentWorkspace: string;

    constructor(context: Context | null, snapshotManager: SnapshotManager, config: ContextMcpConfig) {
        this.context = context;
        this.snapshotManager = snapshotManager;
        this.config = config;
        this.currentWorkspace = process.cwd();
        console.log(`[WORKSPACE] Current workspace: ${this.currentWorkspace}`);
    }

    /**
     * Sync indexed codebases from Zilliz Cloud collections
     * This method fetches all collections from the vector database,
     * gets the first document from each collection to extract codebasePath from metadata,
     * and updates the snapshot with discovered codebases.
     * 
     * Logic: Compare mcp-codebase-snapshot.json with zilliz cloud collections
     * - If local snapshot has extra directories (not in cloud), remove them
     * - If local snapshot is missing directories (exist in cloud), ignore them
     */
    private async syncIndexedCodebasesFromCloud(): Promise<void> {
        try {
            // Check if using local Milvus - skip cloud sync for local instances
            const milvusAddress = process.env.MILVUS_ADDRESS || '';
            const isLocalMilvus = !milvusAddress.includes('https') && !milvusAddress.includes('cloud.zilliz.com');

            if (isLocalMilvus) {
                console.log(`[SYNC-CLOUD] ⏭️ Skipping cloud sync for local Milvus instance: ${milvusAddress}`);
                return;
            }

            console.log(`[SYNC-CLOUD] 🔄 Syncing indexed codebases from Zilliz Cloud...`);

            // Check if context is initialized
            if (!this.context) {
                console.log(`[SYNC-CLOUD] ⚠️ Context not initialized, skipping cloud sync`);
                return;
            }

            // Get all collections using the interface method
            const vectorDb = this.context.getVectorDatabase();

            // Use the new listCollections method from the interface
            const collections = await vectorDb.listCollections();

            console.log(`[SYNC-CLOUD] 📋 Found ${collections.length} collections in Zilliz Cloud`);

            if (collections.length === 0) {
                console.log(`[SYNC-CLOUD] ✅ No collections found in cloud`);
                // If no collections in cloud, remove all local codebases
                const localCodebases = this.snapshotManager.getIndexedCodebases();
                if (localCodebases.length > 0) {
                    console.log(`[SYNC-CLOUD] 🧹 Removing ${localCodebases.length} local codebases as cloud has no collections`);
                    for (const codebasePath of localCodebases) {
                        this.snapshotManager.removeIndexedCodebase(codebasePath);
                        console.log(`[SYNC-CLOUD] ➖ Removed local codebase: ${codebasePath}`);
                    }
                    this.snapshotManager.saveCodebaseSnapshot();
                    console.log(`[SYNC-CLOUD] 💾 Updated snapshot to match empty cloud state`);
                }
                return;
            }

            const cloudCodebases = new Set<string>();

            // Check each collection for codebase path
            for (const collectionName of collections) {
                try {
                    // Skip collections that don't match the code_chunks pattern (support both legacy and new collections)
                    if (!collectionName.startsWith('code_chunks_') && !collectionName.startsWith('hybrid_code_chunks_')) {
                        console.log(`[SYNC-CLOUD] ⏭️  Skipping non-code collection: ${collectionName}`);
                        continue;
                    }

                    console.log(`[SYNC-CLOUD] 🔍 Checking collection: ${collectionName}`);

                    // Query the first document to get metadata
                    const results = await vectorDb.query(
                        collectionName,
                        '', // Empty filter to get all results
                        ['metadata'], // Only fetch metadata field
                        1 // Only need one result to extract codebasePath
                    );

                    if (results && results.length > 0) {
                        const firstResult = results[0];
                        const metadataStr = firstResult.metadata;

                        if (metadataStr) {
                            try {
                                const metadata = JSON.parse(metadataStr);
                                const codebasePath = metadata.codebasePath;

                                if (codebasePath && typeof codebasePath === 'string') {
                                    console.log(`[SYNC-CLOUD] 📍 Found codebase path: ${codebasePath} in collection: ${collectionName}`);
                                    cloudCodebases.add(codebasePath);
                                } else {
                                    console.warn(`[SYNC-CLOUD] ⚠️  No codebasePath found in metadata for collection: ${collectionName}`);
                                }
                            } catch (parseError) {
                                console.warn(`[SYNC-CLOUD] ⚠️  Failed to parse metadata JSON for collection ${collectionName}:`, parseError);
                            }
                        } else {
                            console.warn(`[SYNC-CLOUD] ⚠️  No metadata found in collection: ${collectionName}`);
                        }
                    } else {
                        console.log(`[SYNC-CLOUD] ℹ️  Collection ${collectionName} is empty`);
                    }
                } catch (collectionError: any) {
                    console.warn(`[SYNC-CLOUD] ⚠️  Error checking collection ${collectionName}:`, collectionError.message || collectionError);
                    // Continue with next collection
                }
            }

            console.log(`[SYNC-CLOUD] 📊 Found ${cloudCodebases.size} valid codebases in cloud`);

            // Get current local codebases
            const localCodebases = new Set(this.snapshotManager.getIndexedCodebases());
            console.log(`[SYNC-CLOUD] 📊 Found ${localCodebases.size} local codebases in snapshot`);

            let hasChanges = false;

            // Remove local codebases that don't exist in cloud
            for (const localCodebase of localCodebases) {
                if (!cloudCodebases.has(localCodebase)) {
                    this.snapshotManager.removeIndexedCodebase(localCodebase);
                    hasChanges = true;
                    console.log(`[SYNC-CLOUD] ➖ Removed local codebase (not in cloud): ${localCodebase}`);
                }
            }

            // Note: We don't add cloud codebases that are missing locally (as per user requirement)
            console.log(`[SYNC-CLOUD] ℹ️  Skipping addition of cloud codebases not present locally (per sync policy)`);

            if (hasChanges) {
                this.snapshotManager.saveCodebaseSnapshot();
                console.log(`[SYNC-CLOUD] 💾 Updated snapshot to match cloud state`);
            } else {
                console.log(`[SYNC-CLOUD] ✅ Local snapshot already matches cloud state`);
            }

            console.log(`[SYNC-CLOUD] ✅ Cloud sync completed successfully`);
        } catch (error: any) {
            console.error(`[SYNC-CLOUD] ❌ Error syncing codebases from cloud:`, error.message || error);
            // Don't throw - this is not critical for the main functionality
        }
    }

    public async handleIndexCodebase(args: any) {
        const { force, splitter, customExtensions, ignorePatterns } = args;
        const forceReindex = force || false;
        const splitterType = splitter || 'ast'; // Default to AST
        const customFileExtensions = customExtensions || [];
        const customIgnorePatterns = ignorePatterns || [];
        
        // Check if context is initialized
        if (!this.context) {
            return {
                content: [{
                    type: "text",
                    text: `❌ Context not initialized. Please ensure embedding provider and vector database are properly configured.`
                }],
                isError: true
            };
        }
        
        // Use default project and branch from config
        const projectName = this.config.defaultProject;
        const branch = this.config.defaultBranch || 'prod';
        
        if (!projectName) {
            return {
                content: [{
                    type: "text",
                    text: `❌ No default project configured. Please set DEFAULT_PROJECT environment variable or configure it in the config.`
                }],
                isError: true
            };
        }
        
        // Build project path using configured structure - index the entire branch
        const { buildProjectPath } = await import('./config.js');
        const reposBasePath = this.config.reposBasePath || path.join(process.cwd(), 'repos');
        
        // Index the entire branch directory instead of individual components
        const codebasePath = buildProjectPath(reposBasePath, projectName, branch);

        try {
            // Sync indexed codebases from cloud first
            await this.syncIndexedCodebasesFromCloud();

            // Validate splitter parameter
            if (splitterType !== 'ast' && splitterType !== 'langchain') {
                return {
                    content: [{
                        type: "text",
                        text: `Error: Invalid splitter type '${splitterType}'. Must be 'ast' or 'langchain'.`
                    }],
                    isError: true
                };
            }
            // Force absolute path resolution - warn if relative path provided
            const absolutePath = ensureAbsolutePath(codebasePath);

            // Validate path exists
            if (!fs.existsSync(absolutePath)) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: Path '${absolutePath}' does not exist. Original input: '${codebasePath}'`
                    }],
                    isError: true
                };
            }

            // Check if it's a directory
            const stat = fs.statSync(absolutePath);
            if (!stat.isDirectory()) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: Path '${absolutePath}' is not a directory`
                    }],
                    isError: true
                };
            }

            // Check if already indexing
            if (this.snapshotManager.getIndexingCodebases().includes(absolutePath)) {
                return {
                    content: [{
                        type: "text",
                        text: `Codebase '${absolutePath}' is already being indexed in the background. Please wait for completion.`
                    }],
                    isError: true
                };
            }

            //Check if the snapshot and cloud index are in sync
            if (this.context && this.snapshotManager.getIndexedCodebases().includes(absolutePath) !== await this.context.hasIndex(absolutePath)) {
                console.warn(`[INDEX-VALIDATION] ❌ Snapshot and cloud index mismatch: ${absolutePath}`);
            }

            // Check if already indexed (unless force is true)
            if (!forceReindex && this.snapshotManager.getIndexedCodebases().includes(absolutePath)) {
                return {
                    content: [{
                        type: "text",
                        text: `Codebase '${absolutePath}' is already indexed. Use force=true to re-index.`
                    }],
                    isError: true
                };
            }

            // If force reindex and codebase is already indexed, remove it
            if (forceReindex) {
                if (this.snapshotManager.getIndexedCodebases().includes(absolutePath)) {
                    console.log(`[FORCE-REINDEX] 🔄 Removing '${absolutePath}' from indexed list for re-indexing`);
                    this.snapshotManager.removeIndexedCodebase(absolutePath);
                }
                if (this.context && await this.context.hasIndex(absolutePath)) {
                    console.log(`[FORCE-REINDEX] 🔄 Clearing index for '${absolutePath}'`);
                    await this.context.clearIndex(absolutePath);
                }
            }

            // CRITICAL: Pre-index collection creation validation
            try {
                console.log(`[INDEX-VALIDATION] 🔍 Validating collection creation capability`);
                const vectorDB = this.context?.getVectorDatabase();
                console.log(`[INDEX-VALIDATION] 🔍 Vector DB info: Type=${vectorDB?.constructor.name || 'null'}, Connected=${!!vectorDB}`);
                
                const canCreateCollection = this.context ? await this.context.getVectorDatabase().checkCollectionLimit() : false;

                if (!canCreateCollection) {
                    console.error(`[INDEX-VALIDATION] ❌ Collection limit validation failed: ${absolutePath}`);

                    // CRITICAL: Immediately return the COLLECTION_LIMIT_MESSAGE to MCP client
                    return {
                        content: [{
                            type: "text",
                            text: COLLECTION_LIMIT_MESSAGE
                        }],
                        isError: true
                    };
                }

                console.log(`[INDEX-VALIDATION] ✅  Collection creation validation completed`);
            } catch (validationError: any) {
                // Handle other collection creation errors with detailed logging
                let errorMessage = 'Unknown error';
                let errorStack = 'No stack trace available';
                
                try {
                    if (validationError instanceof Error) {
                        errorMessage = validationError.message;
                        errorStack = validationError.stack || 'No stack trace available';
                    } else if (typeof validationError === 'string') {
                        errorMessage = validationError;
                    } else if (validationError && typeof validationError === 'object') {
                        // Try to extract meaningful information from the error object
                        errorMessage = validationError.message || 
                                      validationError.error || 
                                      validationError.description ||
                                      JSON.stringify(validationError, null, 2);
                        errorStack = validationError.stack || 'No stack trace available';
                    } else {
                        errorMessage = String(validationError);
                    }
                } catch (stringifyError) {
                    errorMessage = `Error serializing error: ${stringifyError}`;
                }
                
                console.error(`[INDEX-VALIDATION] ❌ Collection creation validation failed:`);
                console.error(`[INDEX-VALIDATION] ❌ Error message: ${errorMessage}`);
                console.error(`[INDEX-VALIDATION] ❌ Error stack: ${errorStack}`);
                console.error(`[INDEX-VALIDATION] ❌ Raw error:`, validationError);
                
                return {
                    content: [{
                        type: "text",
                        text: `Error validating collection creation: ${errorMessage}\n\nStack trace: ${errorStack}`
                    }],
                    isError: true
                };
            }

            // Add custom extensions if provided
            if (customFileExtensions.length > 0 && this.context) {
                console.log(`[CUSTOM-EXTENSIONS] Adding ${customFileExtensions.length} custom extensions: ${customFileExtensions.join(', ')}`);
                this.context.addCustomExtensions(customFileExtensions);
            }

            // Add custom ignore patterns if provided (before loading file-based patterns)
            if (customIgnorePatterns.length > 0 && this.context) {
                console.log(`[IGNORE-PATTERNS] Adding ${customIgnorePatterns.length} custom ignore patterns: ${customIgnorePatterns.join(', ')}`);
                this.context.addCustomIgnorePatterns(customIgnorePatterns);
            }

            // Check current status and log if retrying after failure
            const currentStatus = this.snapshotManager.getCodebaseStatus(absolutePath);
            if (currentStatus === 'indexfailed') {
                const failedInfo = this.snapshotManager.getCodebaseInfo(absolutePath) as any;
                console.log(`[BACKGROUND-INDEX] Retrying indexing for previously failed codebase. Previous error: ${failedInfo?.errorMessage || 'Unknown error'}`);
            }

            // Set to indexing status and save snapshot immediately
            this.snapshotManager.setCodebaseIndexing(absolutePath, 0);
            this.snapshotManager.saveCodebaseSnapshot();

            // Track the codebase path for syncing
            trackCodebasePath(absolutePath);

            // Start background indexing - now safe to proceed
            this.startBackgroundIndexing(absolutePath, forceReindex, splitterType);

            const pathInfo = codebasePath !== absolutePath
                ? `\nNote: Input path '${codebasePath}' was resolved to absolute path '${absolutePath}'`
                : '';

            const extensionInfo = customFileExtensions.length > 0
                ? `\nUsing ${customFileExtensions.length} custom extensions: ${customFileExtensions.join(', ')}`
                : '';

            const ignoreInfo = customIgnorePatterns.length > 0
                ? `\nUsing ${customIgnorePatterns.length} custom ignore patterns: ${customIgnorePatterns.join(', ')}`
                : '';

            return {
                content: [{
                    type: "text",
                    text: `Started background indexing for codebase '${absolutePath}' using ${splitterType.toUpperCase()} splitter.${pathInfo}${extensionInfo}${ignoreInfo}\n\nIndexing is running in the background. You can search the codebase while indexing is in progress, but results may be incomplete until indexing completes.`
                }]
            };

        } catch (error: any) {
            // Enhanced error handling to prevent MCP service crash
            console.error('Error in handleIndexCodebase:', error);

            // Ensure we always return a proper MCP response, never throw
            return {
                content: [{
                    type: "text",
                    text: `Error starting indexing: ${error.message || error}`
                }],
                isError: true
            };
        }
    }

    private async startBackgroundIndexing(codebasePath: string, forceReindex: boolean, splitterType: string) {
        const absolutePath = codebasePath;
        let lastSaveTime = 0; // Track last save timestamp

        try {
            console.log(`[BACKGROUND-INDEX] Starting background indexing for: ${absolutePath}`);

            // Check if directory exists and log its contents
            const fs = await import('fs');
            const path = await import('path');

            try {
                const stats = await fs.promises.stat(absolutePath);
                console.log(`[PATH-CHECK] 📂 Target path exists: ${absolutePath}`);
                console.log(`[PATH-CHECK] 📋 Path type: ${stats.isDirectory() ? 'Directory' : 'File'}`);

                if (stats.isDirectory()) {
                    const entries = await fs.promises.readdir(absolutePath);
                    console.log(`[PATH-CHECK] 📁 Directory contains ${entries.length} entries`);
                    if (entries.length > 0) {
                        const sampleEntries = entries.slice(0, 10);
                        console.log(`[PATH-CHECK] 📄 Directory contents: ${sampleEntries.join(', ')}${entries.length > 10 ? '...' : ''}`);
                    }
                }
            } catch (pathError) {
                console.log(`[PATH-CHECK] ❌ Cannot access path: ${absolutePath}`);
                console.log(`[PATH-CHECK] 💥 Path error:`, pathError);
            }

            // Note: If force reindex, collection was already cleared during validation phase
            if (forceReindex) {
                console.log(`[BACKGROUND-INDEX] ℹ️  Force reindex mode - collection was already cleared during validation`);
            }

            // Use the existing Context instance for indexing.
            let contextForThisTask = this.context;
            if (splitterType !== 'ast') {
                console.warn(`[BACKGROUND-INDEX] Non-AST splitter '${splitterType}' requested; falling back to AST splitter`);
            }

            // Load ignore patterns from files first (including .ignore, .gitignore, etc.)
            if (this.context) {
                await this.context.getLoadedIgnorePatterns(absolutePath);
            }

            // Initialize file synchronizer with proper ignore patterns (including project-specific patterns)
            const { FileSynchronizer } = await import("@zilliz/claude-context-core");
            const ignorePatterns = this.context?.getIgnorePatterns() || [];
            console.log(`[BACKGROUND-INDEX] Using ignore patterns: ${ignorePatterns.join(', ')}`);

            console.log(`[FILE-SCAN] 📁 Initializing file synchronizer for: ${absolutePath}`);
            const synchronizer = new FileSynchronizer(absolutePath, ignorePatterns);

            console.log(`[FILE-SCAN] 🔍 Starting file system scan and merkle tree creation...`);
            await synchronizer.initialize();
            console.log(`[FILE-SCAN] ✅ File synchronizer initialized successfully`);
            console.log(`[FILE-SCAN] 💾 Merkle snapshot created/loaded for tracking file changes`);

            // Check for changes to understand what files are detected
            try {
                const changes = await synchronizer.checkForChanges();
                const totalFiles = changes.added.length + changes.modified.length;
                console.log(`[FILE-SCAN] 📊 Detected ${totalFiles} files for processing`);

                if (changes.added.length > 0) {
                    const sampleFiles = changes.added.slice(0, 5);
                    console.log(`[FILE-SCAN] 📄 Sample files: ${sampleFiles.join(', ')}${changes.added.length > 5 ? '...' : ''}`);
                }
            } catch (changeError) {
                console.log(`[FILE-SCAN] ⚠️  Could not check file changes:`, changeError);
            }

            // Store synchronizer in the context (let context manage collection names)
            if (this.context) {
                console.log(`[COLLECTION] 🔧 Preparing hybrid vector collection for codebase: ${absolutePath}`);
                try {
                    await this.context.getPreparedCollection(absolutePath);
                    console.log(`[COLLECTION] ✅ Collection preparation completed successfully`);

                    const collectionName = this.context.getCollectionName(absolutePath);
                    console.log(`[COLLECTION] 📝 Collection name generated: ${collectionName}`);
                    this.context.setSynchronizer(collectionName, synchronizer);
                } catch (error) {
                    console.log(`[COLLECTION] ❌ Collection preparation failed:`);
                    console.log(`[COLLECTION] 💥 Error details:`, error);
                    throw error;
                }
            }
            if (contextForThisTask !== this.context && this.context && contextForThisTask) {
                const collectionName = this.context.getCollectionName(absolutePath);
                contextForThisTask.setSynchronizer(collectionName, synchronizer);
            }

            console.log(`[BACKGROUND-INDEX] Starting indexing with ${splitterType} splitter for: ${absolutePath}`);

            // Log embedding provider information before indexing
            const embeddingProvider = this.context?.getEmbedding();
            if (embeddingProvider) {
                console.log(`[BACKGROUND-INDEX] 🧠 Using embedding provider: ${embeddingProvider.getProvider()} with dimension: ${embeddingProvider.getDimension()}`);
            }

            // Start indexing with the appropriate context and progress tracking
            console.log(`[BACKGROUND-INDEX] 🚀 Beginning codebase indexing process...`);
            const stats = await contextForThisTask!.indexCodebase(absolutePath, (progress) => {
                // Update progress in snapshot manager using new method
                this.snapshotManager.setCodebaseIndexing(absolutePath, progress.percentage);

                // Save snapshot periodically (every 2 seconds to avoid too frequent saves)
                const currentTime = Date.now();
                if (currentTime - lastSaveTime >= 2000) { // 2 seconds = 2000ms
                    this.snapshotManager.saveCodebaseSnapshot();
                    lastSaveTime = currentTime;
                    console.log(`[BACKGROUND-INDEX] 💾 Saved progress snapshot at ${progress.percentage.toFixed(1)}%`);
                }

                console.log(`[BACKGROUND-INDEX] Progress: ${progress.phase} - ${progress.percentage}% (${progress.current}/${progress.total})`);
            });
            console.log(`[BACKGROUND-INDEX] ✅ Indexing completed successfully! Files: ${stats.indexedFiles}, Chunks: ${stats.totalChunks}`);

            // Set codebase to indexed status with complete statistics
            this.snapshotManager.setCodebaseIndexed(absolutePath, stats);
            this.indexingStats = { indexedFiles: stats.indexedFiles, totalChunks: stats.totalChunks };

            // Save snapshot after updating codebase lists
            this.snapshotManager.saveCodebaseSnapshot();

            let message = `Background indexing completed for '${absolutePath}' using ${splitterType.toUpperCase()} splitter.\nIndexed ${stats.indexedFiles} files, ${stats.totalChunks} chunks.`;
            if (stats.status === 'limit_reached') {
                message += `\n⚠️  Warning: Indexing stopped because the chunk limit (450,000) was reached. The index may be incomplete.`;
            }

            console.log(`[BACKGROUND-INDEX] ${message}`);

        } catch (error: any) {
            console.error(`[BACKGROUND-INDEX] Error during indexing for ${absolutePath}:`, error);

            // Get the last attempted progress
            const lastProgress = this.snapshotManager.getIndexingProgress(absolutePath);

            // Set codebase to failed status with error information
            const errorMessage = error.message || String(error);
            this.snapshotManager.setCodebaseIndexFailed(absolutePath, errorMessage, lastProgress);
            this.snapshotManager.saveCodebaseSnapshot();

            // Log error but don't crash MCP service - indexing errors are handled gracefully
            console.error(`[BACKGROUND-INDEX] Indexing failed for ${absolutePath}: ${errorMessage}`);
        }
    }

    public async handleSearchCode(args: any) {
        const { query, limit = 10, extensionFilter } = args;
        const resultLimit = limit || 10;

        try {
            // Check if context is initialized
            if (!this.context) {
                return {
                    content: [{
                        type: "text",
                        text: `❌ Context not initialized. Please ensure embedding provider and vector database are properly configured.`
                    }],
                    isError: true
                };
            }

            // Use default project and branch from config
            const projectName = this.config.defaultProject;
            const branch = this.config.defaultBranch || 'prod';
            
            if (!projectName) {
                return {
                    content: [{
                        type: "text",
                        text: `❌ No default project configured. Please set DEFAULT_PROJECT environment variable or configure it in the config.`
                    }],
                    isError: true
                };
            }

            // Sync indexed codebases from cloud first
            await this.syncIndexedCodebasesFromCloud();

            // Build project path using configured structure - search the entire branch
            const { buildProjectPath } = await import('./config.js');
            const reposBasePath = this.config.reposBasePath || path.join(process.cwd(), 'repos');
            
            // Search the entire branch directory instead of individual components
            const codebasePath = buildProjectPath(reposBasePath, projectName, branch);
            const absolutePath = ensureAbsolutePath(codebasePath);

            // Validate path exists
            if (!fs.existsSync(absolutePath)) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: Path '${absolutePath}' does not exist. Original input: '${codebasePath}'`
                    }],
                    isError: true
                };
            }

            // Check if it's a directory
            const stat = fs.statSync(absolutePath);
            if (!stat.isDirectory()) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: Path '${absolutePath}' is not a directory`
                    }],
                    isError: true
                };
            }

            trackCodebasePath(absolutePath);

            // Check if this codebase is indexed or being indexed
            const isIndexed = this.snapshotManager.getIndexedCodebases().includes(absolutePath);
            const isIndexing = this.snapshotManager.getIndexingCodebases().includes(absolutePath);

            if (!isIndexed && !isIndexing) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: Codebase '${absolutePath}' is not indexed. Please index it first using the index_codebase tool.`
                    }],
                    isError: true
                };
            }

            // Show indexing status if codebase is being indexed
            let indexingStatusMessage = '';
            if (isIndexing) {
                indexingStatusMessage = `\n⚠️  **Indexing in Progress**: This codebase is currently being indexed in the background. Search results may be incomplete until indexing completes.`;
            }

            console.log(`[SEARCH] Searching in codebase: ${absolutePath}`);
            console.log(`[SEARCH] Query: "${query}"`);
            console.log(`[SEARCH] Indexing status: ${isIndexing ? 'In Progress' : 'Completed'}`);

            // Log embedding provider information before search
            const embeddingProvider = this.context?.getEmbedding();
            if (embeddingProvider) {
                console.log(`[SEARCH] 🧠 Using embedding provider: ${embeddingProvider.getProvider()} for search`);
                console.log(`[SEARCH] 🔍 Generating embeddings for query using ${embeddingProvider.getProvider()}...`);
            }

            // Build filter expression from extensionFilter list
            let filterExpr: string | undefined = undefined;
            if (Array.isArray(extensionFilter) && extensionFilter.length > 0) {
                const cleaned = extensionFilter
                    .filter((v: any) => typeof v === 'string')
                    .map((v: string) => v.trim())
                    .filter((v: string) => v.length > 0);
                const invalid = cleaned.filter((e: string) => !(e.startsWith('.') && e.length > 1 && !/\s/.test(e)));
                if (invalid.length > 0) {
                    return {
                        content: [{ type: 'text', text: `Error: Invalid file extensions in extensionFilter: ${JSON.stringify(invalid)}. Use proper extensions like '.ts', '.py'.` }],
                        isError: true
                    };
                }
                const quoted = cleaned.map((e: string) => `'${e}'`).join(', ');
                filterExpr = `fileExtension in [${quoted}]`;
            }

            // Search in the specified codebase
            const searchResults = await this.context!.semanticSearch(
                absolutePath,
                query,
                Math.min(resultLimit, 50),
                0.3,
                filterExpr
            );

            console.log(`[SEARCH] ✅ Search completed! Found ${searchResults.length} results using ${embeddingProvider.getProvider()} embeddings`);

            if (searchResults.length === 0) {
                let noResultsMessage = `No results found for query: "${query}" in codebase '${absolutePath}'`;
                if (isIndexing) {
                    noResultsMessage += `\n\nNote: This codebase is still being indexed. Try searching again after indexing completes, or the query may not match any indexed content.`;
                }
                return {
                    content: [{
                        type: "text",
                        text: noResultsMessage
                    }]
                };
            }

            // Format results
            const formattedResults = searchResults.map((result: any, index: number) => {
                const location = `${result.relativePath}:${result.startLine}-${result.endLine}`;
                const context = truncateContent(result.content, 5000);
                const codebaseInfo = path.basename(absolutePath);

                return `${index + 1}. Code snippet (${result.language}) [${codebaseInfo}]\n` +
                    `   Location: ${location}\n` +
                    `   Rank: ${index + 1}\n` +
                    `   Context: \n\`\`\`${result.language}\n${context}\n\`\`\`\n`;
            }).join('\n');

            let resultMessage = `Found ${searchResults.length} results for query: "${query}" in codebase '${absolutePath}'${indexingStatusMessage}\n\n${formattedResults}`;

            if (isIndexing) {
                resultMessage += `\n\n💡 **Tip**: This codebase is still being indexed. More results may become available as indexing progresses.`;
            }

            return {
                content: [{
                    type: "text",
                    text: resultMessage
                }]
            };
        } catch (error) {
            // Check if this is the collection limit error
            // Handle both direct string throws and Error objects containing the message
            const errorMessage = typeof error === 'string' ? error : (error instanceof Error ? error.message : String(error));

            if (errorMessage === COLLECTION_LIMIT_MESSAGE || errorMessage.includes(COLLECTION_LIMIT_MESSAGE)) {
                // Return the collection limit message as a successful response
                // This ensures LLM treats it as final answer, not as retryable error
                return {
                    content: [{
                        type: "text",
                        text: COLLECTION_LIMIT_MESSAGE
                    }]
                };
            }

            return {
                content: [{
                    type: "text",
                    text: `Error searching code: ${errorMessage} Please check if the codebase has been indexed first.`
                }],
                isError: true
            };
        }
    }

    public async handleClearIndex(args: any) {
        // Check if context is initialized
        if (!this.context) {
            return {
                content: [{
                    type: "text",
                    text: `❌ Context not initialized. Please ensure embedding provider and vector database are properly configured.`
                }],
                isError: true
            };
        }

        // Use default project and branch from config
        const projectName = this.config.defaultProject;
        const branch = this.config.defaultBranch || 'prod';
        
        if (!projectName) {
            return {
                content: [{
                    type: "text",
                    text: `❌ No default project configured. Please set DEFAULT_PROJECT environment variable or configure it in the config.`
                }],
                isError: true
            };
        }

        if (this.snapshotManager.getIndexedCodebases().length === 0 && this.snapshotManager.getIndexingCodebases().length === 0) {
            return {
                content: [{
                    type: "text",
                    text: "No codebases are currently indexed or being indexed."
                }]
            };
        }

        try {
            // Build project path using configured structure - clear the entire branch
            const { buildProjectPath } = await import('./config.js');
            const reposBasePath = this.config.reposBasePath || path.join(process.cwd(), 'repos');
            
            // Clear the entire branch directory instead of individual components
            const codebasePath = buildProjectPath(reposBasePath, projectName, branch);
            const absolutePath = ensureAbsolutePath(codebasePath);

            // Validate path exists
            if (!fs.existsSync(absolutePath)) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: Path '${absolutePath}' does not exist. Original input: '${codebasePath}'`
                    }],
                    isError: true
                };
            }

            // Check if it's a directory
            const stat = fs.statSync(absolutePath);
            if (!stat.isDirectory()) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: Path '${absolutePath}' is not a directory`
                    }],
                    isError: true
                };
            }

            // Check if this codebase is indexed or being indexed
            const isIndexed = this.snapshotManager.getIndexedCodebases().includes(absolutePath);
            const isIndexing = this.snapshotManager.getIndexingCodebases().includes(absolutePath);

            if (!isIndexed && !isIndexing) {
                return {
                    content: [{
                        type: "text",
                        text: `Error: Codebase '${absolutePath}' is not indexed or being indexed.`
                    }],
                    isError: true
                };
            }

            console.log(`[CLEAR] Clearing codebase: ${absolutePath}`);

            try {
                await this.context!.clearIndex(absolutePath);
                console.log(`[CLEAR] Successfully cleared index for: ${absolutePath}`);
            } catch (error: any) {
                const errorMsg = `Failed to clear ${absolutePath}: ${error.message}`;
                console.error(`[CLEAR] ${errorMsg}`);
                return {
                    content: [{
                        type: "text",
                        text: errorMsg
                    }],
                    isError: true
                };
            }

            // Completely remove the cleared codebase from snapshot
            this.snapshotManager.removeCodebaseCompletely(absolutePath);

            // Reset indexing stats if this was the active codebase
            this.indexingStats = null;

            // Save snapshot after clearing index
            this.snapshotManager.saveCodebaseSnapshot();

            let resultText = `Successfully cleared codebase '${absolutePath}'`;

            const remainingIndexed = this.snapshotManager.getIndexedCodebases().length;
            const remainingIndexing = this.snapshotManager.getIndexingCodebases().length;

            if (remainingIndexed > 0 || remainingIndexing > 0) {
                resultText += `\n${remainingIndexed} other indexed codebase(s) and ${remainingIndexing} indexing codebase(s) remain`;
            }

            return {
                content: [{
                    type: "text",
                    text: resultText
                }]
            };
        } catch (error) {
            // Check if this is the collection limit error
            // Handle both direct string throws and Error objects containing the message
            const errorMessage = typeof error === 'string' ? error : (error instanceof Error ? error.message : String(error));

            if (errorMessage === COLLECTION_LIMIT_MESSAGE || errorMessage.includes(COLLECTION_LIMIT_MESSAGE)) {
                // Return the collection limit message as a successful response
                // This ensures LLM treats it as final answer, not as retryable error
                return {
                    content: [{
                        type: "text",
                        text: COLLECTION_LIMIT_MESSAGE
                    }]
                };
            }

            return {
                content: [{
                    type: "text",
                    text: `Error clearing index: ${errorMessage}`
                }],
                isError: true
            };
        }
    }

    public async handleGetIndexingStatus(args: any) {
        try {
            // Get all indexed codebases
            const indexedCodebases = this.snapshotManager.getIndexedCodebases();
            const indexingCodebases = this.snapshotManager.getIndexingCodebases();
            
            if (indexedCodebases.length === 0 && indexingCodebases.length === 0) {
                return {
                    content: [{
                        type: "text",
                        text: "📊 No projects are currently indexed or being indexed."
                    }]
                };
            }
            
            let statusMessage = "📊 Indexing Status Summary:\n\n";

            // Show indexed codebases
            if (indexedCodebases.length > 0) {
                statusMessage += "✅ **Indexed Projects:**\n";
                for (const codebasePath of indexedCodebases) {
                    const info = this.snapshotManager.getCodebaseInfo(codebasePath);
                    if (info && 'indexedFiles' in info) {
                        const indexedInfo = info as any;
                        statusMessage += `   📁 ${codebasePath}\n`;
                        statusMessage += `      📊 ${indexedInfo.indexedFiles} files, ${indexedInfo.totalChunks} chunks\n`;
                        statusMessage += `      📅 Status: ${indexedInfo.indexStatus}\n`;
                        statusMessage += `      🕐 Updated: ${new Date(indexedInfo.lastUpdated).toLocaleString()}\n\n`;
                    } else {
                        statusMessage += `   📁 ${codebasePath} (ready for search)\n\n`;
                    }
                }
            }

            // Show indexing codebases
            if (indexingCodebases.length > 0) {
                statusMessage += "🔄 **Currently Indexing:**\n";
                for (const [codebasePath, progress] of indexingCodebases) {
                    statusMessage += `   📁 ${codebasePath}\n`;
                    statusMessage += `      📊 Progress: ${Number(progress).toFixed(1)}%\n\n`;
                }
            }

            return {
                content: [{
                    type: "text",
                    text: statusMessage
                }]
            };

        } catch (error: any) {
            return {
                content: [{
                    type: "text",
                    text: `Error getting indexing status: ${error.message || error}`
                }],
                isError: true
            };
        }
    }

    /**
     * Handle index_project tool - Index a project from structured repos directory
     * Always indexes all components in the specified branch
     */
    public async handleIndexProject(args: any): Promise<any> {
        try {
            const { force = false, splitter = 'ast' } = args;
            
            // Use default project and branch from config
            const projectName = this.config.defaultProject;
            const branch = this.config.defaultBranch || 'prod';
            
            if (!projectName) {
                return {
                    content: [{
                        type: "text",
                        text: `❌ No default project configured. Please set DEFAULT_PROJECT environment variable or configure it in the config.`
                    }],
                    isError: true
                };
            }
            
            // Import config functions
            const { buildProjectPath, getAvailableComponents } = await import('./config.js');
            
            const reposBasePath = this.config.reposBasePath || path.join(process.cwd(), 'repos');
            
            // Always index all components in the branch
            const components = getAvailableComponents(reposBasePath, projectName, branch);
            
            if (components.length === 0) {
                return {
                    content: [{
                        type: "text",
                        text: `❌ No components found for project '${projectName}/${branch}'.\n\nPlease ensure the project structure follows:\nrepos/${projectName}/${branch}/\n├── fbIos/\n├── fbAndroid/\n├── fbBackend/\n└── ...`
                    }],
                    isError: true
                };
            }
            
            console.log(`[INDEX-PROJECT] Indexing all components in ${projectName}/${branch}: ${components.join(', ')}`);
            
            // Index each component
            const results = [];
            let successCount = 0;
            let errorCount = 0;
            
            for (const comp of components) {
                try {
                    const projectPath = buildProjectPath(reposBasePath, projectName, branch, comp);
                    console.log(`[INDEX-PROJECT] Indexing component: ${comp} at ${projectPath}`);
                    
                    const result = await this.handleIndexCodebase({
                        path: projectPath,
                        force,
                        splitter,
                        customExtensions: [],
                        ignorePatterns: []
                    });
                    
                    if (result.isError) {
                        errorCount++;
                        results.push(`❌ ${comp}: ${result.content[0].text}`);
                    } else {
                        successCount++;
                        results.push(`✅ ${comp}: Successfully indexed`);
                    }
                } catch (error: any) {
                    errorCount++;
                    results.push(`❌ ${comp}: ${error.message || error}`);
                }
            }
            
            // Create summary message
            let summaryMessage = `📊 Indexing Summary for ${projectName}/${branch}:\n\n`;
            summaryMessage += `✅ Successfully indexed: ${successCount} components\n`;
            summaryMessage += `❌ Failed: ${errorCount} components\n\n`;
            summaryMessage += `📋 Details:\n${results.join('\n')}`;
            
            return {
                content: [{
                    type: "text",
                    text: summaryMessage
                }],
                isError: errorCount > 0
            };
            
        } catch (error: any) {
            return {
                content: [{
                    type: "text",
                    text: `Error indexing project: ${error.message || error}`
                }],
                isError: true
            };
        }
    }

    /**
     * Handle list_projects tool - List available projects
     */
    public async handleListProjects(args: any): Promise<any> {
        try {
            const { getAvailableProjects } = await import('./config.js');
            const reposBasePath = path.join(process.cwd(), 'repos'); // Always use ./repos in project directory
            
            const projects = getAvailableProjects(reposBasePath);
            
            let message = `📁 Available Projects in ${reposBasePath}:\n\n`;
            
            if (projects.length === 0) {
                message += `❌ No projects found. Please ensure the repos directory exists and contains project folders.\n\n`;
                message += `Expected structure:\n`;
                message += `repos/\n`;
                message += `├── mobilebanking/\n`;
                message += `├── corebanking/\n`;
                message += `└── ...\n`;
            } else {
                projects.forEach((project, index) => {
                    message += `${index + 1}. ${project}\n`;
                });
            }
            
            return {
                content: [{
                    type: "text",
                    text: message
                }]
            };
            
        } catch (error: any) {
            return {
                content: [{
                    type: "text",
                    text: `Error listing projects: ${error.message || error}`
                }],
                isError: true
            };
        }
    }

    /**
     * Handle list_branches tool - List available branches for a project
     */
    public async handleListBranches(args: any): Promise<any> {
        try {
            // Use default project from config
            const projectName = this.config.defaultProject;
            
            if (!projectName) {
                return {
                    content: [{
                        type: "text",
                        text: `❌ No default project configured. Please set DEFAULT_PROJECT environment variable or configure it in the config.`
                    }],
                    isError: true
                };
            }
            
            const { getAvailableBranches } = await import('./config.js');
            const reposBasePath = this.config.reposBasePath || path.join(process.cwd(), 'repos');
            
            const branches = getAvailableBranches(reposBasePath, projectName);
            
            let message = `🌿 Available Branches for Project '${projectName}':\n\n`;
            
            if (branches.length === 0) {
                message += `❌ No branches found for project '${projectName}'.\n\n`;
                message += `Expected structure:\n`;
                message += `repos/${projectName}/\n`;
                message += `├── prod/\n`;
                message += `├── preprod/\n`;
                message += `├── test/\n`;
                message += `└── ...\n`;
            } else {
                branches.forEach((branch, index) => {
                    message += `${index + 1}. ${branch}\n`;
                });
            }
            
            return {
                content: [{
                    type: "text",
                    text: message
                }]
            };
            
        } catch (error: any) {
            return {
                content: [{
                    type: "text",
                    text: `Error listing branches: ${error.message || error}`
                }],
                isError: true
            };
        }
    }

    /**
     * Handle list_components tool - List available components for a project branch
     */
    public async handleListComponents(args: any): Promise<any> {
        try {
            // Use default project and branch from config
            const projectName = this.config.defaultProject;
            const branch = this.config.defaultBranch || 'prod';
            
            if (!projectName) {
                return {
                    content: [{
                        type: "text",
                        text: `❌ No default project configured. Please set DEFAULT_PROJECT environment variable or configure it in the config.`
                    }],
                    isError: true
                };
            }
            
            const { getAvailableComponents } = await import('./config.js');
            const reposBasePath = this.config.reposBasePath || path.join(process.cwd(), 'repos');
            
            const components = getAvailableComponents(reposBasePath, projectName, branch);
            
            let message = `🧩 Available Components for Project '${projectName}/${branch}':\n\n`;
            
            if (components.length === 0) {
                message += `❌ No components found for project '${projectName}/${branch}'.\n\n`;
                message += `Expected structure:\n`;
                message += `repos/${projectName}/${branch}/\n`;
                message += `├── fbIos/\n`;
                message += `├── fbAndroid/\n`;
                message += `├── fbBackend/\n`;
                message += `└── ...\n`;
            } else {
                components.forEach((component, index) => {
                    message += `${index + 1}. ${component}\n`;
                });
            }
            
            return {
                content: [{
                    type: "text",
                    text: message
                }]
            };
            
        } catch (error: any) {
            return {
                content: [{
                    type: "text",
                    text: `Error listing components: ${error.message || error}`
                }],
                isError: true
            };
        }
    }
} 