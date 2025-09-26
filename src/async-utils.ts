import { promises as fsPromises } from 'fs';
import fs from 'fs';

/**
 * Async utility functions for file operations to improve performance
 */
export class AsyncUtils {
    /**
     * Async wrapper for fs.existsSync
     */
    static async exists(path: string): Promise<boolean> {
        try {
            await fsPromises.access(path);
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Async wrapper for fs.statSync
     */
    static async stat(path: string) {
        return await fsPromises.stat(path);
    }

    /**
     * Async wrapper for fs.readFileSync
     */
    static async readFile(path: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
        return await fsPromises.readFile(path, encoding);
    }

    /**
     * Async wrapper for fs.writeFileSync
     */
    static async writeFile(path: string, data: string): Promise<void> {
        return await fsPromises.writeFile(path, data);
    }

    /**
     * Async wrapper for fs.mkdirSync with recursive option
     */
    static async mkdir(path: string, options: { recursive: boolean } = { recursive: true }): Promise<void> {
        await fsPromises.mkdir(path, options);
    }

    /**
     * Async wrapper for fs.readdirSync
     */
    static async readdir(path: string, options?: any): Promise<any> {
        return await fsPromises.readdir(path, options);
    }

    /**
     * Throttled file operations to prevent excessive I/O
     */
    private static throttledOperations = new Map<string, Promise<any>>();

    /**
     * Throttled read operation - prevents multiple simultaneous reads of same file
     */
    static async throttledReadFile(path: string, encoding: BufferEncoding = 'utf8'): Promise<string> {
        if (this.throttledOperations.has(path)) {
            return this.throttledOperations.get(path)!;
        }

        const operation = this.readFile(path, encoding).finally(() => {
            this.throttledOperations.delete(path);
        });

        this.throttledOperations.set(path, operation);
        return operation;
    }

    /**
     * Batch file existence checks
     */
    static async batchExists(paths: string[]): Promise<Record<string, boolean>> {
        const results: Record<string, boolean> = {};
        const promises = paths.map(async (path) => {
            results[path] = await this.exists(path);
        });

        await Promise.all(promises);
        return results;
    }

    /**
     * Sync fallback for critical operations
     */
    static existsSync(path: string): boolean {
        return fs.existsSync(path);
    }

    static statSync(path: string) {
        return fs.statSync(path);
    }

    static readFileSync(path: string, encoding: BufferEncoding = 'utf8'): string {
        return fs.readFileSync(path, encoding);
    }
}