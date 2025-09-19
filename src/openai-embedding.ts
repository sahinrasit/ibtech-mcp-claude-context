import { Embedding, EmbeddingVector } from "@zilliz/claude-context-core";

export interface OpenAIEmbeddingConfig {
    model: string;
    apiKey: string;
    baseURL?: string;
}

interface OpenAIEmbeddingResponse {
    data: Array<{
        embedding: number[];
        index: number;
    }>;
    model: string;
    usage: {
        prompt_tokens: number;
        total_tokens: number;
    };
}

export class OpenAIEmbedding extends Embedding {
    private config: OpenAIEmbeddingConfig;
    private dimension: number;
    protected maxTokens: number = 8192; // Default max tokens for text-embedding-ada-002

    constructor(config: OpenAIEmbeddingConfig) {
        super();
        this.config = config;
        this.dimension = 1536; // Default dimension for text-embedding-ada-002
    }

    async detectDimension(testText?: string): Promise<number> {
        if (this.dimension) {
            return this.dimension;
        }

        const test = testText || "test";
        try {
            const result = await this.embed(test);
            this.dimension = result.dimension;
            return this.dimension;
        } catch (error) {
            console.error(`[OPENAI] Failed to detect dimension:`, error);
            // Fallback to default dimension
            this.dimension = 1536;
            return this.dimension;
        }
    }

    async embed(text: string): Promise<EmbeddingVector> {
        const processedText = this.preprocessText(text);

        try {
            const response = await fetch(`${this.config.baseURL || 'https://api.openai.com/v1'}/embeddings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify({
                    input: processedText,
                    model: this.config.model
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json() as OpenAIEmbeddingResponse;

            if (!data.data || !data.data[0] || !data.data[0].embedding) {
                throw new Error('Invalid response format from OpenAI API');
            }

            const embedding = data.data[0].embedding;
            this.dimension = embedding.length;

            return {
                vector: embedding,
                dimension: this.dimension
            };
        } catch (error) {
            console.error(`[OPENAI] Embedding error:`, error);
            throw error;
        }
    }

    async embedBatch(texts: string[]): Promise<EmbeddingVector[]> {
        const processedTexts = this.preprocessTexts(texts);

        try {
            const response = await fetch(`${this.config.baseURL || 'https://api.openai.com/v1'}/embeddings`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${this.config.apiKey}`
                },
                body: JSON.stringify({
                    input: processedTexts,
                    model: this.config.model
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                throw new Error(`OpenAI API error: ${response.status} ${response.statusText} - ${errorText}`);
            }

            const data = await response.json() as OpenAIEmbeddingResponse;

            if (!data.data || !Array.isArray(data.data)) {
                throw new Error('Invalid response format from OpenAI API');
            }

            const results: EmbeddingVector[] = [];
            for (const item of data.data) {
                if (!item.embedding) {
                    throw new Error('Invalid embedding data in response');
                }

                const embedding = item.embedding;
                this.dimension = embedding.length;

                results.push({
                    vector: embedding,
                    dimension: this.dimension
                });
            }

            return results;
        } catch (error) {
            console.error(`[OPENAI] Batch embedding error:`, error);
            throw error;
        }
    }

    getDimension(): number {
        return this.dimension;
    }

    getProvider(): string {
        return 'OpenAI';
    }

    /**
     * Get current model name
     * @returns Current model name
     */
    getModel(): string {
        return this.config.model;
    }

    /**
     * Set model type
     * @param model Model name
     */
    setModel(model: string): void {
        this.config.model = model;
        // Update dimension based on model
        this.updateDimensionForModel(model);
    }

    /**
     * Update dimension based on model
     * @param model Model name
     */
    private updateDimensionForModel(model: string): void {
        switch (model) {
            case 'text-embedding-ada-002':
                this.dimension = 1536;
                break;
            case 'text-embedding-3-small':
                this.dimension = 1536;
                break;
            case 'text-embedding-3-large':
                this.dimension = 3072;
                break;
            default:
                // Default to ada-002 dimensions
                this.dimension = 1536;
                break;
        }
    }

    /**
     * Get list of supported models
     */
    static getSupportedModels(): Record<string, {
        dimension: number;
        description: string;
    }> {
        return {
            'text-embedding-ada-002': {
                dimension: 1536,
                description: 'Ada 002 embedding model'
            },
            'text-embedding-3-small': {
                dimension: 1536,
                description: 'Text embedding 3 small model'
            },
            'text-embedding-3-large': {
                dimension: 3072,
                description: 'Text embedding 3 large model'
            }
        };
    }
}