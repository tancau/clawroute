#!/bin/bash
# 测试脚本：验证 API Route 功能

set -e

API_URL="${API_URL:-http://localhost:3000/api/v1/chat/completions}"
API_KEY="${API_KEY:-sk-test-key}"

echo "=== Testing Chat Completions API ==="
echo "API URL: $API_URL"
echo ""

# 测试 1: 非流式请求
echo "1. Testing non-streaming request..."
curl -s -X POST "$API_URL" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "Hello, how are you?"}]
  }' | jq -r '.choices[0].message.content // .error.message'

echo ""
echo ""

# 测试 2: 流式请求
echo "2. Testing streaming request..."
curl -s -X POST "$API_URL" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "Say hello"}],
    "stream": true
  }' | head -20

echo ""
echo ""

# 测试 3: 指定模型
echo "3. Testing with specific model (deepseek-chat)..."
curl -s -X POST "$API_URL" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "deepseek-chat",
    "messages": [{"role": "user", "content": "What is 2+2?"}]
  }' | jq -r '.choices[0].message.content // .error.message'

echo ""
echo ""

# 测试 4: OpenRouter 免费模型
echo "4. Testing OpenRouter free model..."
curl -s -X POST "$API_URL" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen/qwen3.5-plus:free",
    "messages": [{"role": "user", "content": "Hello"}]
  }' | jq -r '.choices[0].message.content // .error.message'

echo ""
echo ""

# 测试 5: 编码意图
echo "5. Testing coding intent..."
curl -s -X POST "$API_URL" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "auto",
    "messages": [{"role": "user", "content": "Write a Python function to calculate factorial"}]
  }' | jq -r '.choices[0].message.content // .error.message' | head -50

echo ""
echo ""

echo "=== Tests completed ==="