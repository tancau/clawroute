#!/bin/bash

# ClawRouter 开发环境启动脚本

echo "🚀 启动 ClawRouter 开发环境..."

# 检查是否已安装依赖
if [ ! -d "backend/node_modules" ]; then
    echo "📦 安装后端依赖..."
    cd backend && npm install && cd ..
fi

if [ ! -d "node_modules" ]; then
    echo "📦 安装前端依赖..."
    npm install
fi

# 启动后端
echo "🔧 启动后端服务..."
cd backend && npm run dev &
BACKEND_PID=$!
cd ..

# 等待后端启动
sleep 3

# 启动前端
echo "🎨 启动前端服务..."
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ ClawRouter 已启动!"
echo "   后端: http://localhost:3000 (PID: $BACKEND_PID)"
echo "   前端: http://localhost:3001 (PID: $FRONTEND_PID)"
echo ""
echo "按 Ctrl+C 停止所有服务"

# 等待进程
wait
