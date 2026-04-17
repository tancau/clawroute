#!/bin/bash

# ClawRouter 测试脚本

echo "🧪 运行 ClawRouter 测试..."

# 后端测试
echo "📦 测试后端..."
cd backend
if [ -f "package.json" ] && grep -q '"test"' package.json; then
    npm test
    BACKEND_RESULT=$?
else
    echo "⚠️  后端无测试脚本，跳过"
    BACKEND_RESULT=0
fi
cd ..

# 前端构建测试
echo "📦 测试前端构建..."
npm run build
FRONTEND_RESULT=$?

# 结果汇总
echo ""
echo "📊 测试结果:"
echo "   后端测试: $([ $BACKEND_RESULT -eq 0 ] && echo '✅ 通过' || echo '❌ 失败')"
echo "   前端构建: $([ $FRONTEND_RESULT -eq 0 ] && echo '✅ 通过' || echo '❌ 失败')"

# 返回失败码
if [ $BACKEND_RESULT -ne 0 ] || [ $FRONTEND_RESULT -ne 0 ]; then
    exit 1
fi
