FROM --platform=linux/amd64 node:18-slim

WORKDIR /app

# Install build dependencies for native modules
RUN apt-get update && apt-get install -y \
    python3 \
    make \
    g++ \
    git \
    && rm -rf /var/lib/apt/lists/*

RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml* ./

# Clear npm cache and install fresh
RUN pnpm install

# Clean any existing build artifacts
RUN rm -rf dist

COPY . .

RUN pnpm build

ENV MCP_TRANSPORT_TYPE=http
ENV MCP_HTTP_PORT=3000
ENV MCP_HTTP_HOST=0.0.0.0

EXPOSE 3000

CMD ["pnpm", "start"]