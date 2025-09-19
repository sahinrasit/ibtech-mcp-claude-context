import { Context, ContextConfig } from "@zilliz/claude-context-core";
import { IbthinkEmbedding } from "./ibthink-embedding.js";

/**
 * Custom Context class that extends the core Context with IbthinkEmbedding support
 *
 * Strategy: Instead of reimplementing everything, we temporarily switch embedding
 * to a compatible one for indexing, then switch back
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

        // Check if it's IbthinkEmbedding - if so, use workaround
        if (embedding instanceof IbthinkEmbedding) {
            console.log(`[CUSTOM-INDEX] 🎯 Using workaround for IbthinkEmbedding indexing`);
            return this.ibthinkIndexWorkaround(codebasePath, progressCallback, forceReindex);
        }

        // For other embedding providers, use the default core implementation
        console.log(`[CUSTOM-INDEX] 🔄 Using core indexing for ${embedding.getProvider()}`);
        return super.indexCodebase(codebasePath, progressCallback, forceReindex);
    }

    /**
     * Workaround for IbthinkEmbedding indexing using embedding swap strategy
     */
    private async ibthinkIndexWorkaround(
        codebasePath: string,
        progressCallback?: (progress: { phase: string; current: number; total: number; percentage: number }) => void,
        forceReindex?: boolean
    ) {
        const ibthinkEmbedding = this.getEmbedding() as IbthinkEmbedding;
        console.log(`[CUSTOM-INDEX] 🚀 Starting IbthinkEmbedding workaround for: ${codebasePath}`);
        console.log(`[CUSTOM-INDEX] 🧠 Using ${ibthinkEmbedding.getProvider()} with dimension: ${ibthinkEmbedding.getDimension()}`);

        try {
            // Import OpenAI embedding temporarily
            const { OpenAIEmbedding } = await import("@zilliz/claude-context-core");

            // Create a temporary OpenAI embedding instance that will use IbthinkEmbedding under the hood
            const tempEmbedding = new OpenAIEmbedding({
                apiKey: 'temp',  // Will be overridden
                model: ibthinkEmbedding.getModel()
            });

            // Create a proxy that intercepts embedding calls and redirects to IbthinkEmbedding
            const proxyEmbedding = new Proxy(tempEmbedding, {
                get: (target, prop) => {
                    // Intercept embed and embedBatch calls
                    if (prop === 'embed') {
                        return (text: string) => ibthinkEmbedding.embed(text);
                    }
                    if (prop === 'embedBatch') {
                        return (texts: string[]) => ibthinkEmbedding.embedBatch(texts);
                    }
                    if (prop === 'getDimension') {
                        return () => ibthinkEmbedding.getDimension();
                    }
                    if (prop === 'getProvider') {
                        return () => ibthinkEmbedding.getProvider();
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
            const result = await super.indexCodebase(codebasePath, progressCallback, forceReindex);

            // Restore original embedding
            console.log(`[CUSTOM-INDEX] 🔄 Restoring original IbthinkEmbedding`);
            this.updateEmbedding(originalEmbedding);

            console.log(`[CUSTOM-INDEX] ✅ IbthinkEmbedding workaround completed!`);
            return result;

        } catch (error) {
            console.error(`[CUSTOM-INDEX] ❌ IbthinkEmbedding workaround failed:`, error);
            // Restore original embedding in case of error
            if (this.originalIbthinkEmbedding) {
                this.updateEmbedding(this.originalIbthinkEmbedding);
            }
            throw error;
        }
    }
}