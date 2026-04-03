# Docker 部署指南

本文档介绍如何使用 Docker 部署 Image SaaS 项目。

## 前置要求

- Docker 20.10+
- Docker Compose 2.0+
- 已配置的 PostgreSQL 数据库（推荐使用 Neon）
- AWS S3 存储桶或兼容的对象存储
- OpenRouter API Key（用于 AI 功能）

## 快速开始

### 1. 配置环境变量

复制 `.env.example` 为 `.env` 并填写必要的配置：

```bash
cp .env.example .env
```

编辑 `.env` 文件，填写以下关键配置：

- `DATABASE_URL`: PostgreSQL 数据库连接字符串
- `NEXTAUTH_SECRET`: 使用 `openssl rand -base64 32` 生成
- `NEXTAUTH_URL`: 应用的公网访问地址
- OAuth 配置（GitHub/Google 等）
- AWS S3 配置
- `OPENROUTER_API_KEY`: AI 功能所需

### 2. 构建镜像

```bash
docker build -t image-saas:latest .
```

### 3. 运行容器

#### 使用 Docker 命令

```bash
docker run -d \
  --name image-saas \
  -p 3000:3000 \
  --env-file .env \
  image-saas:latest
```

#### 使用 Docker Compose（推荐）

```bash
docker-compose up -d
```

### 4. 访问应用

应用将在 `http://localhost:3000` 启动。

## 数据库迁移

首次部署时需要运行数据库迁移：

```bash
# 进入容器
docker exec -it image-saas sh

# 运行迁移（如果有迁移脚本）
pnpm drizzle-kit push
```

或者在本地运行迁移后再启动容器。

## 生产环境部署建议

### 1. 使用反向代理

建议在生产环境使用 Nginx 或 Caddy 作为反向代理：

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 2. 配置 HTTPS

使用 Let's Encrypt 配置 SSL 证书：

```bash
certbot --nginx -d your-domain.com
```

### 3. 资源限制

在 `docker-compose.yml` 中添加资源限制：

```yaml
services:
  app:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

### 4. 日志管理

配置日志驱动：

```yaml
services:
  app:
    logging:
      driver: 'json-file'
      options:
        max-size: '10m'
        max-file: '3'
```

### 5. 健康检查

Docker Compose 配置中已包含健康检查，确保应用正常运行。

## 常见问题

### 1. 镜像构建失败

- 确保 Node.js 版本兼容（需要 20+）
- 检查网络连接，可能需要配置 npm 镜像
- 确保有足够的磁盘空间

### 2. 容器启动失败

- 检查环境变量配置是否正确
- 查看容器日志：`docker logs image-saas`
- 确保数据库可访问

### 3. 性能优化

- 使用 CDN 加速静态资源
- 配置 Redis 缓存（如需要）
- 优化数据库查询和索引

## 监控和维护

### 查看日志

```bash
# 实时日志
docker-compose logs -f app

# 最近 100 行日志
docker-compose logs --tail=100 app
```

### 重启服务

```bash
docker-compose restart app
```

### 更新应用

```bash
# 拉取最新代码
git pull

# 重新构建镜像
docker-compose build

# 重启服务
docker-compose up -d
```

### 备份数据

定期备份数据库和 S3 存储桶数据。

## 扩展部署

### 多实例部署

使用 Docker Swarm 或 Kubernetes 进行多实例部署：

```bash
# Docker Swarm 示例
docker service create \
  --name image-saas \
  --replicas 3 \
  --publish 3000:3000 \
  --env-file .env \
  image-saas:latest
```

### 负载均衡

配置 Nginx 或云负载均衡器分发流量到多个实例。

## 安全建议

1. 不要在镜像中包含敏感信息
2. 使用 Docker secrets 管理敏感配置
3. 定期更新基础镜像和依赖
4. 限制容器权限，使用非 root 用户运行
5. 配置防火墙规则
6. 启用 HTTPS
7. 定期备份数据

## 支持

如有问题，请查看项目文档或提交 Issue。
