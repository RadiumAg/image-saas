# 使用多阶段构建优化镜像大小
FROM node:20-alpine AS base

# 安装 pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# 设置工作目录
WORKDIR /app

# 复制 package 文件
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

# ============================================
# 依赖安装阶段
# ============================================
FROM base AS deps

# 安装生产依赖
RUN pnpm install --frozen-lockfile --prod

# 安装所有依赖（包括 devDependencies）用于构建
FROM base AS deps-full
RUN pnpm install --frozen-lockfile

# ============================================
# 构建阶段
# ============================================
FROM base AS builder

# 复制所有依赖
COPY --from=deps-full /app/node_modules ./node_modules

# 复制源代码
COPY . .

# 设置环境变量
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production

# 构建应用
RUN pnpm build

# ============================================
# 运行阶段
# ============================================
FROM node:20-alpine AS runner

WORKDIR /app

# 设置环境变量
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# 创建非 root 用户
RUN addgroup --system --gid 1001 nodejs && \
    adduser --system --uid 1001 nextjs

# 复制必要的文件
COPY --from=builder /app/public ./public
COPY --from=builder /app/package.json ./package.json

# 复制 Next.js 构建产物
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

# 切换到非 root 用户
USER nextjs

# 暴露端口
EXPOSE 3000

# 启动应用
CMD ["node", "server.js"]
