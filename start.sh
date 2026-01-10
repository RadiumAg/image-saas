#!/bin/bash
# 清除 Windows 换行符
sed -i 's/\r$//' /web/.env
# 加载环境变量
export $(cat /web/.env | grep -v '^#' | xargs)
# 启动应用
cd /web/image-saas && NODE_ENV=production npx next start -H 0.0.0.0 -p 3000
