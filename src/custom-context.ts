import { Context, ContextConfig } from "@zilliz/claude-context-core";
import { IbthinkEmbedding } from "./ibthink-embedding.js";
import { OpenAIEmbedding } from "./openai-embedding.js";

/**
 * Custom Context class that extends the core Context with custom embedding support
 *
 * Strategy: Use our own embedding implementations (IbthinkEmbedding, OpenAIEmbedding)
 * instead of core package's embedding classes for full control
 */
export class CustomContext extends Context {

    private originalIbthinkEmbedding?: IbthinkEmbedding;

    /**
     * Override indexCodebase to support IbthinkEmbedding
     */
    async indexCodebase(
        codebasePath: string,
        progressCallback?: (progress: { phase: string; current: number; total: number; percentage: number }) => void,
        forceReindex?: boolean
    ) {
        const embedding = this.getEmbedding();

        // Use workaround for our custom embedding implementations
        if (embedding instanceof IbthinkEmbedding) {
            console.log(`[CUSTOM-INDEX] 🎯 Using custom indexing for IbthinkEmbedding`);
            return this.customEmbeddingIndexWorkaround(codebasePath, embedding, progressCallback, forceReindex);
        }

        if (embedding instanceof OpenAIEmbedding) {
            console.log(`[CUSTOM-INDEX] 🎯 Using custom indexing for custom OpenAIEmbedding`);
            return this.customEmbeddingIndexWorkaround(codebasePath, embedding, progressCallback, forceReindex);
        }

        // For core package embedding providers, use the default implementation
        console.log(`[CUSTOM-INDEX] 🔄 Using core indexing for ${embedding.getProvider()}`);
        return super.indexCodebase(codebasePath, progressCallback, forceReindex);
    }

    /**
     * Generic workaround for custom embedding implementations
     */
    private async customEmbeddingIndexWorkaround(
        codebasePath: string,
        customEmbedding: IbthinkEmbedding | OpenAIEmbedding,
        progressCallback?: (progress: { phase: string; current: number; total: number; percentage: number }) => void,
        forceReindex?: boolean
    ) {
        console.log(`[CUSTOM-INDEX] 🚀 Starting custom embedding indexing for: ${codebasePath}`);
        console.log(`[CUSTOM-INDEX] 🧠 Using ${customEmbedding.getProvider()} with dimension: ${customEmbedding.getDimension()}`);

        try {
            // Import core OpenAI embedding temporarily for proxy base
            const { OpenAIEmbedding: CoreOpenAIEmbedding } = await import("@zilliz/claude-context-core");

            // Create a temporary embedding instance for proxy base
            const tempEmbedding = new CoreOpenAIEmbedding({
                apiKey: 'temp',  // Will be overridden
                model: customEmbedding.getModel()
            });

            // Create a proxy that intercepts embedding calls and redirects to our custom embedding
            const proxyEmbedding = new Proxy(tempEmbedding, {
                get: (target, prop) => {
                    // Intercept embed and embedBatch calls
                    if (prop === 'embed') {
                        return async (text: string) => {
                            console.log(`[CUSTOM-INDEX] 🧠 Proxy embedding single text (${text.length} chars) via ${customEmbedding.getProvider()}`);
                            const result = await customEmbedding.embed(text);
                            console.log(`[CUSTOM-INDEX] ✅ Embedding result: dimension=${result.dimension}`);
                            return result;
                        };
                    }
                    if (prop === 'embedBatch') {
                        return async (texts: string[]) => {
                            console.log(`[CUSTOM-INDEX] 🧠 Proxy embedding batch: ${texts.length} texts via ${customEmbedding.getProvider()}`);
                            const results = await customEmbedding.embedBatch(texts);
                            console.log(`[CUSTOM-INDEX] ✅ Batch embedding results: ${results.length} vectors, dimensions=${results[0]?.dimension}`);
                            return results;
                        };
                    }
                    if (prop === 'getDimension') {
                        return () => customEmbedding.getDimension();
                    }
                    if (prop === 'getProvider') {
                        return () => customEmbedding.getProvider();
                    }
                    // For other properties, use the original target
                    return target[prop as keyof typeof target];
                }
            });

            // Temporarily replace embedding
            console.log(`[CUSTOM-INDEX] 🔄 Temporarily switching to proxy embedding`);
            const originalEmbedding = this.getEmbedding();
            this.updateEmbedding(proxyEmbedding as any);

            // Call the core indexing method with our proxy
            console.log(`[CUSTOM-INDEX] 🎯 Starting core indexing with proxy embedding`);
            const result = await super.indexCodebase(codebasePath, progressCallback, forceReindex);
            console.log(`[CUSTOM-INDEX] 📊 Indexing result: ${JSON.stringify(result)}`);

            // Restore original embedding
            console.log(`[CUSTOM-INDEX] 🔄 Restoring original ${customEmbedding.getProvider()} embedding`);
            this.updateEmbedding(originalEmbedding);

            console.log(`[CUSTOM-INDEX] ✅ Custom ${customEmbedding.getProvider()} indexing completed!`);
            return result;

        } catch (error) {
            console.error(`[CUSTOM-INDEX] ❌ Custom ${customEmbedding.getProvider()} indexing failed:`, error);
            throw error;
        }
    }

}