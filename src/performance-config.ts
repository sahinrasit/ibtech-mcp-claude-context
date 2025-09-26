/**
 * Performance optimization constants for the MCP server
 * These values are tuned for fast indexing and efficient resource usage
 */
export const PERFORMANCE_CONFIG = {
    // Embedding processing
    EMBEDDING: {
        // Concurrent requests for different providers
        IBTHINK_CONCURRENT_REQUESTS: 3,
        OPENAI_CONCURRENT_REQUESTS: 5,
        VOYAGEAI_CONCURRENT_REQUESTS: 4,
        GEMINI_CONCURRENT_REQUESTS: 2,
        OLLAMA_CONCURRENT_REQUESTS: 1, // Local processing, avoid overwhelming

        // Batch sizes for different providers
        IBTHINK_CHUNK_SIZE: 50,
        OPENAI_CHUNK_SIZE: 100,
        VOYAGEAI_CHUNK_SIZE: 75,
        GEMINI_CHUNK_SIZE: 25,
        OLLAMA_CHUNK_SIZE: 10,

        // Rate limiting delays (milliseconds)
        IBTHINK_BATCH_DELAY: 100,
        OPENAI_BATCH_DELAY: 200,
        VOYAGEAI_BATCH_DELAY: 150,
        GEMINI_BATCH_DELAY: 300,
        OLLAMA_BATCH_DELAY: 0, // No delay for local
    },

    // Snapshot management
    SNAPSHOT: {
        SAVE_INTERVAL_MS: 15000, // 15 seconds between saves
        THROTTLE_INTERVAL_MS: 1000, // 1 second min between saves
        BATCH_UPDATE_SIZE: 100, // Batch multiple updates
    },

    // File operations
    FILE_OPS: {
        MAX_CONCURRENT_READS: 50,
        READ_CHUNK_SIZE: 8192, // 8KB chunks
        DIRECTORY_SCAN_BATCH_SIZE: 1000,
        FILE_STAT_BATCH_SIZE: 100,
    },

    // Milvus database
    MILVUS: {
        // Optimized for fast indexing
        SEGMENT_SIZE_MB: 1024,
        SEGMENT_SEAL_PROPORTION: 0.25,
        INSERT_BUFFER_SIZE_MB: 512,
        INDEX_BUILD_WORKERS: 4,
        MAX_SEGMENT_NUM: 16,

        // Cache sizes
        QUERY_NODE_CACHE_SIZE_MB: 4096,
        INDEX_ENGINE_CACHE_SIZE_MB: 2048,

        // Performance tuning
        SEARCH_ENGINE_NUM_THREADS: 8,
        BUILD_INDEX_THREADS: 4,

        // Connection pooling
        MAX_CONNECTIONS: 10,
        CONNECTION_TIMEOUT_MS: 30000,
    },

    // Indexing process
    INDEXING: {
        MAX_CONCURRENT_CODEBASES: 2,
        CHUNK_PROCESSING_BATCH_SIZE: 500,
        PROGRESS_UPDATE_INTERVAL_MS: 5000, // 5 seconds

        // Memory management
        MAX_MEMORY_USAGE_MB: 4096, // 4GB max
        GC_INTERVAL_MS: 60000, // Force GC every minute

        // Error handling
        MAX_RETRIES: 3,
        RETRY_DELAY_MS: 1000,
        EXPONENTIAL_BACKOFF: true,
    },

    // API rate limits
    RATE_LIMITS: {
        REQUESTS_PER_MINUTE: {
            IBTHINK: 100,
            OPENAI: 3000,
            VOYAGEAI: 300,
            GEMINI: 60,
            OLLAMA: 1000, // Local, higher limit
        },

        TOKENS_PER_MINUTE: {
            IBTHINK: 100000,
            OPENAI: 1000000,
            VOYAGEAI: 300000,
            GEMINI: 50000,
            OLLAMA: 500000,
        }
    },

    // Logging
    LOGGING: {
        // Reduce logging in performance-critical paths
        ENABLE_PROGRESS_LOGS: true,
        ENABLE_DEBUG_LOGS: false,
        LOG_BATCH_SIZE: 50,
        LOG_FLUSH_INTERVAL_MS: 10000,
    }
} as const;

/**
 * Environment-specific overrides
 */
export const getPerformanceConfig = (env: 'development' | 'production' | 'test' = 'production') => {
    // Create a deep copy and make it mutable
    const config = JSON.parse(JSON.stringify(PERFORMANCE_CONFIG));

    switch (env) {
        case 'development':
            // More conservative settings for development
            config.EMBEDDING.IBTHINK_CONCURRENT_REQUESTS = 2;
            config.EMBEDDING.OPENAI_CONCURRENT_REQUESTS = 3;
            config.MILVUS.MAX_CONNECTIONS = 5;
            config.INDEXING.MAX_CONCURRENT_CODEBASES = 1;
            config.LOGGING.ENABLE_DEBUG_LOGS = true;
            break;

        case 'test':
            // Minimal settings for testing
            config.EMBEDDING.IBTHINK_CONCURRENT_REQUESTS = 1;
            config.EMBEDDING.OPENAI_CONCURRENT_REQUESTS = 1;
            config.SNAPSHOT.SAVE_INTERVAL_MS = 5000;
            config.MILVUS.MAX_CONNECTIONS = 2;
            config.LOGGING.ENABLE_PROGRESS_LOGS = false;
            break;

        case 'production':
        default:
            // Use default optimized settings
            break;
    }

    return config;
};

/**
 * Helper function to get provider-specific embedding config
 */
export const getEmbeddingConfig = (provider: string) => {
    const config = PERFORMANCE_CONFIG.EMBEDDING;
    const providerUpper = provider.toUpperCase();

    return {
        concurrentRequests: config[`${providerUpper}_CONCURRENT_REQUESTS` as keyof typeof config] || 2,
        chunkSize: config[`${providerUpper}_CHUNK_SIZE` as keyof typeof config] || 50,
        batchDelay: config[`${providerUpper}_BATCH_DELAY` as keyof typeof config] || 200,
    };
};