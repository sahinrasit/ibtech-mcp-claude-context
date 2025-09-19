FROM node:20-slim
 
WORKDIR /app
# RUN npm config set registry https://repo.finansbank.com.tr/artifactory/api/npm/npm/
RUN npm install -g pnpm@latest
COPY package.json pnpm-lock.yaml* ./
# Try without build tools first
RUN pnpm install --no-frozen-lockfile
COPY . .
RUN pnpm build
ENV MCP_TRANSPORT_TYPE=http
ENV MCP_HTTP_PORT=3000
ENV MCP_HTTP_HOST=0.0.0.0
ENV EMBEDDING_PROVIDER=Ibthink
ENV EMBEDDING_MODEL=text-embedding-ada-002
ENV IBTHINK_API_KEY=Cash_Management_Payments_Ae_zy7he5
ENV IBTHINK_BASE_URL=https://smg-llm-api.seip-vip-prd-ocpgen11.qnb.com.tr/v1
ENV MILVUS_ADDRESS=https://in03-f69fdb078f68f9c.serverless.aws-eu-central-1.cloud.zilliz.com
ENV MILVUS_TOKEN=3acc3c2026012977e341cce136336fd6d4643abd97c7523aafc0141c5fbef8a7ba21a89138aa16977e84d2ca9e8d83cca55ec2df
ENV DEFAULT_PROJECT=mobilebanking
ENV DEFAULT_BRANCH=prod
EXPOSE 3000
CMD ["pnpm", "start"]