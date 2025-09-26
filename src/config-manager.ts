import { getPerformanceConfig, PERFORMANCE_CONFIG } from './performance-config';

/**
 * Configuration manager that provides environment-aware settings
 */
export class ConfigManager {
    private static instance: ConfigManager;
    private environment: 'development' | 'production' | 'test';
    private performanceConfig: typeof PERFORMANCE_CONFIG;

    private constructor() {
        // Detect environment from NODE_ENV or default to production
        this.environment = (process.env.NODE_ENV as any) || 'production';
        this.performanceConfig = getPerformanceConfig(this.environment);

        console.log(`[CONFIG] Initialized for environment: ${this.environment}`);
    }

    public static getInstance(): ConfigManager {
        if (!ConfigManager.instance) {
            ConfigManager.instance = new ConfigManager();
        }
        return ConfigManager.instance;
    }

    public getEnvironment(): string {
        return this.environment;
    }

    public getPerformanceConfig() {
        return this.performanceConfig;
    }

    public getEmbeddingConfig(provider: string) {
        const config = this.performanceConfig.EMBEDDING;
        const providerUpper = provider.toUpperCase();

        return {
            concurrentRequests: config[`${providerUpper}_CONCURRENT_REQUESTS` as keyof typeof config] || 2,
            chunkSize: config[`${providerUpper}_CHUNK_SIZE` as keyof typeof config] || 50,
            batchDelay: config[`${providerUpper}_BATCH_DELAY` as keyof typeof config] || 200,
        };
    }

    public getSnapshotConfig() {
        return this.performanceConfig.SNAPSHOT;
    }

    public getMilvusConfig() {
        return this.performanceConfig.MILVUS;
    }

    public getIndexingConfig() {
        return this.performanceConfig.INDEXING;
    }

    public isDebugEnabled(): boolean {
        return this.performanceConfig.LOGGING.ENABLE_DEBUG_LOGS;
    }

    public isProgressLogsEnabled(): boolean {
        return this.performanceConfig.LOGGING.ENABLE_PROGRESS_LOGS;
    }

    /**
     * Update configuration at runtime (useful for testing or dynamic adjustments)
     */
    public updateEnvironment(env: 'development' | 'production' | 'test') {
        this.environment = env;
        this.performanceConfig = getPerformanceConfig(env);
        console.log(`[CONFIG] Updated environment to: ${env}`);
    }

    /**
     * Get configuration summary for debugging
     */
    public getConfigSummary() {
        return {
            environment: this.environment,
            embedding: {
                ibthink: this.getEmbeddingConfig('IBTHINK'),
                openai: this.getEmbeddingConfig('OPENAI'),
                voyageai: this.getEmbeddingConfig('VOYAGEAI'),
            },
            snapshot: this.getSnapshotConfig(),
            indexing: this.getIndexingConfig(),
        };
    }
}