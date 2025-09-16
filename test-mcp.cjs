#!/usr/bin/env node

// Test script for MCP server
const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting MCP Server Test...\n');

// Test configuration
const testConfig = {
    // Basic configuration
    MCP_SERVER_NAME: "IBTech MCP Server",
    MCP_SERVER_VERSION: "1.0.0",
    
    // Embedding provider (OpenAI default)
    EMBEDDING_PROVIDER: "OpenAI",
    EMBEDDING_MODEL: "text-embedding-3-small",
    
    // Project structure (repos path is now fixed)
    DEFAULT_PROJECT: "mobilebanking",
    DEFAULT_BRANCH: "prod",
    
    // Vector database (local Milvus)
    MILVUS_ADDRESS: "localhost:19530",
    
    // API Keys (you need to set these)
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || "your-openai-api-key-here",
    MILVUS_TOKEN: process.env.MILVUS_TOKEN || "your-milvus-token-here"
};

console.log('📋 Test Configuration:');
console.log(`   Server Name: ${testConfig.MCP_SERVER_NAME}`);
console.log(`   Server Version: ${testConfig.MCP_SERVER_VERSION}`);
console.log(`   Embedding Provider: ${testConfig.EMBEDDING_PROVIDER}`);
console.log(`   Embedding Model: ${testConfig.EMBEDDING_MODEL}`);
console.log(`   Repos Base Path: ${path.join(process.cwd(), 'repos')} (fixed)`);
console.log(`   Default Project: ${testConfig.DEFAULT_PROJECT}`);
console.log(`   Default Branch: ${testConfig.DEFAULT_BRANCH}`);
console.log(`   Milvus Address: ${testConfig.MILVUS_ADDRESS}`);
console.log(`   OpenAI API Key: ${testConfig.OPENAI_API_KEY ? 'SET' : 'NOT SET'}`);
console.log(`   Milvus Token: ${testConfig.MILVUS_TOKEN ? 'SET' : 'NOT SET'}\n`);

// Check if repos directory exists
const fs = require('fs');
const reposPath = path.join(process.cwd(), 'repos');
if (!fs.existsSync(reposPath)) {
    console.log('❌ Repos directory does not exist!');
    console.log(`   Expected: ${reposPath}`);
    process.exit(1);
}

console.log('✅ Repos directory exists');
console.log('📁 Available projects:');
const projects = fs.readdirSync(reposPath, { withFileTypes: true })
    .filter(dirent => dirent.isDirectory())
    .map(dirent => dirent.name);

projects.forEach((project, index) => {
    console.log(`   ${index + 1}. ${project}`);
});

console.log('\n🔧 Starting MCP Server...\n');

// Start MCP server with test configuration
const env = { ...process.env, ...testConfig };
const server = spawn('node', ['dist/index.js'], { 
    env,
    stdio: 'inherit'
});

server.on('error', (error) => {
    console.error('❌ Failed to start MCP server:', error);
});

server.on('close', (code) => {
    console.log(`\n📊 MCP server exited with code ${code}`);
});

// Handle Ctrl+C
process.on('SIGINT', () => {
    console.log('\n🛑 Stopping MCP server...');
    server.kill('SIGINT');
    process.exit(0);
});

console.log('💡 Press Ctrl+C to stop the server');
console.log('💡 The server will run and wait for MCP client connections');
