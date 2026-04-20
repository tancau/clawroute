# HopLLM 视频背景音乐建议

## 一、BGM 风格定位

### 适合开发者工具的音乐特点

| 特点 | 说明 |
|------|------|
| **节奏** | 中等偏快（90-120 BPM），不拖沓 |
| **氛围** | 科技感、现代感、轻松积极 |
| **音色** | 电子音色、合成器、简洁鼓点 |
| **情绪** | 专业、可信赖、创新感 |
| **音量** | 背景衬底，不抢配音（15-20% 音量） |

### 避免的音乐类型

- ❌ 激昂摇滚（太吵）
- ❌ 悲伤抒情（情绪不对）
- ❌ 嘈杂电子（干扰配音）
- ❌ 儿童风格（不专业）

---

## 二、免费版权音乐来源

### 国际平台（推荐）

| 平台 | 网址 | 特点 |
|------|------|------|
| **YouTube Audio Library** | studio.youtube.com | 免费无版权，YouTube 官方 |
| **Epidemic Sound** | epidemicsound.com | 订阅制，30 天免费试用 |
| **Artlist** | artlist.io | 订阅制，高质量 |
| **Pixabay Music** | pixabay.com/music | 完全免费 |
| **Bensound** | bensound.com | 免费需署名，付费免署名 |
| **Mixkit** | mixkit.co/free-stock-music | 完全免费 |

### 国内平台

| 平台 | 网址 | 特点 |
|------|------|------|
| **耳聆网** | ear0.com | 中文音效/音乐 |
| **爱给网** | aigei.com/sound | 免费/付费混合 |
| **听见音乐** | tingshu.com | 版权音乐平台 |

---

## 三、推荐曲目风格

### 风格 A：现代科技感（推荐）

**适合场景**：产品演示、功能介绍
**BPM**：100-120
**音色**：合成器、电子鼓、简约旋律

**搜索关键词**：
```
- corporate tech
- modern innovation
- business upbeat
- technology background
- minimal electronic
```

**推荐曲目示例**：
- "Innovation" - Tesla (YouTube Audio Library)
- "The Future" - Bensound
- "Tech Vibes" - Mixkit

### 风格 B：轻松积极

**适合场景**：成本节省、应用场景展示
**BPM**：90-110
**音色**：吉他、轻鼓点、简单旋律

**搜索关键词**：
```
- happy corporate
- optimistic
- bright background
- cheerful business
```

### 风格 C：简约氛围

**适合场景**：功能深度讲解、技术细节
**BPM**：70-90
**音色**：氛围垫音、轻拍子

**搜索关键词**：
```
- ambient corporate
- minimal background
- soft tech
- calm innovation
```

---

## 四、30秒 / 60秒 / 2分钟 版本 BGM 建议

### 30秒版本

**推荐结构**：
```
0:00-0:05  前奏淡入
0:05-0:25  主体音乐
0:25-0:30  尾奏淡出
```

**风格**：节奏明快，快速进入主题
**音量**：前奏/尾奏 10%，主体 15-18%

### 60秒版本

**推荐结构**：
```
0:00-0:08  前奏渐入
0:08-0:50  主体音乐（可有小变化）
0:50-1:00  尾奏渐出
```

**风格**：完整音乐结构，有层次感
**音量**：前奏/尾奏 10%，主体 15-18%

### 2分钟版本

**推荐结构**：
```
0:00-0:15  前奏
0:15-0:45  主题 A
0:45-1:15  主题 B（变化）
1:15-1:45  主题 A（回归）
1:45-2:00  尾奏
```

**风格**：需要有变化，避免单调
**音量**：动态调整，重要配音时 BGM 降低

---

## 五、音量与混音建议

### 音量比例

| 元素 | 音量 | 说明 |
|------|------|------|
| **配音** | 0 dB (基准) | 主音量 |
| **BGM** | -12 ~ -15 dB | 背景衬底 |
| **音效** | -6 ~ -9 dB | 点击、转场等 |

### 混音技巧

```bash
# FFmpeg 混音命令
ffmpeg -i voice.mp3 -i bgm.mp3 \
  -filter_complex "[1:a]volume=0.15[bgm];[0:a][bgm]amix=inputs=2:duration=longest" \
  output.mp3

# 配音音量提升 + BGM 降低
ffmpeg -i voice.mp3 -i bgm.mp3 \
  -filter_complex "[0:a]volume=1.2[voice];[1:a]volume=0.12[bgm];[voice][bgm]amix=inputs=2:duration=longest" \
  output.mp3
```

### 淡入淡出

| 场景 | 淡入时长 | 淡出时长 |
|------|----------|----------|
| 片头 | 0.5-1s | - |
| 片尾 | - | 1-2s |
| 配音开始时 BGM 降低 | 0.3s | - |
| 配音结束时 BGM 恢复 | - | 0.5s |

---

## 六、音效建议

### 适合添加的音效

| 音效 | 场景 | 来源 |
|------|------|------|
| **鼠标点击** | 演示操作 | Freesound.org |
| **界面弹出** | 弹窗/动画 | Mixkit |
| **成功提示** | 节省金额显示 | YouTube Audio Library |
| **转场 Whoosh** | 场景切换 | Pixabay |
| **数字滚动** | 成本计算 | 耳聆网 |

### 音效音量

- 不要超过配音音量
- 简短、精准，不拖沓
- 风格统一（科技感/现代感）

---

## 七、具体推荐曲目列表

### YouTube Audio Library（免费）

| 曲目名 | 风格 | 时长 | BPM |
|--------|------|------|-----|
| "Innovation" | Tech Corporate | 2:00 | 110 |
| "The Future" | Modern | 1:45 | 100 |
| "Business Growth" | Corporate | 2:15 | 115 |
| "Technology" | Electronic | 1:30 | 120 |
| "Startup" | Upbeat | 2:00 | 105 |

### Bensound（免费需署名）

| 曲目名 | 风格 | 时长 | BPM |
|--------|------|------|-----|
| "Energy" | Corporate | 2:30 | 110 |
| "Tomorrow" | Tech | 2:45 | 100 |
| "A New Beginning" | Inspirational | 2:00 | 95 |

### Mixkit（完全免费）

| 曲目名 | 风格 | 时长 | BPM |
|--------|------|------|-----|
| "Tech Vibes" | Electronic | 2:00 | 120 |
| "Modern Innovation" | Corporate | 1:45 | 105 |
| "Digital Dreams" | Tech | 2:30 | 110 |

---

## 八、下载与使用流程

### YouTube Audio Library

1. 访问 [YouTube Studio](https://studio.youtube.com)
2. 左侧菜单 → 音频库
3. 搜索 "corporate tech" 或 "innovation"
4. 下载并确认许可（免费无需署名）

### Pixabay Music

1. 访问 [pixabay.com/music](https://pixabay.com/music)
2. 搜索 "corporate" 或 "technology"
3. 免费下载，无需署名

### Bensound

1. 访问 [bensound.com](https://www.bensound.com)
2. 搜索 "corporate" 或 "tech"
3. 免费版需在描述中署名
4. 付费版可免署名

---

## 九、版权注意事项

### ✅ 安全使用

- 使用明确标注 "免版权" 或 "Creative Commons 0" 的音乐
- 订阅正版音乐平台（Epidemic Sound、Artlist）
- 购买商业授权

### ❌ 避免风险

- 不使用流行歌曲片段
- 不使用未授权的音乐
- 不假设 "仅个人使用" 就能商用

### 署名示例

```
Music by Bensound.com
"Energy" - https://www.bensound.com
```

---

*背景音乐建议 v1.0 | 更新日期：2026-04-19*