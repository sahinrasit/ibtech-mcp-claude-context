FROM node:20-slim
 
WORKDIR /app
# RUN npm config set registry https://repo.finansbank.com.tr/artifactory/api/npm/npm/
RUN npm install -g pnpm@latest
COPY package.json pnpm-lock.yaml* ./
# Try without build tools first
RUN pnpm install --no-frozen-lockfile
COPY . .
RUN pnpm build
EXPOSE 3000
CMD ["pnpm", "start"]