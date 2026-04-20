#!/usr/bin/env python3
"""
HopLLM Demo Video Generator
使用 Playwright 截图并生成演示视频
"""

import asyncio
from pathlib import Path
from playwright.async_api import async_playwright

# 输出目录
OUTPUT_DIR = Path(__file__).parent

# 页面配置
PAGES = [
    {"url": "https://hopllm.com", "name": "首页", "wait": 5, "scroll": False},
    {"url": "https://hopllm.com/auth/register", "name": "注册页", "wait": 4, "scroll": False},
    {"url": "https://hopllm.com/dashboard", "name": "Dashboard", "wait": 5, "scroll": False},
    {"url": "https://hopllm.com/configure", "name": "配置页", "wait": 4, "scroll": False},
    {"url": "https://hopllm.com/templates", "name": "模板市场", "wait": 4, "scroll": False},
    {"url": "https://hopllm.com", "name": "成本计算器", "wait": 5, "scroll": True, "scroll_to": "#calculator"},
]

# 截图尺寸
VIEWPORT = {"width": 1920, "height": 1080}


async def capture_screenshots():
    """使用 Playwright 截取页面截图"""
    screenshots = []
    
    async with async_playwright() as p:
        # 启动浏览器
        browser = await p.chromium.launch(
            headless=True,
            args=['--no-sandbox', '--disable-setuid-sandbox']
        )
        
        context = await browser.new_context(
            viewport=VIEWPORT,
            record_video_dir=None  # 不录制视频，我们用截图
        )
        
        page = await context.new_page()
        
        for i, page_config in enumerate(PAGES, 1):
            url = page_config["url"]
            name = page_config["name"]
            wait_time = page_config["wait"]
            scroll = page_config.get("scroll", False)
            
            print(f"[{i}/{len(PAGES)}] 正在访问: {name} ({url})")
            
            try:
                # 访问页面
                await page.goto(url, wait_until="networkidle", timeout=30000)
                
                # 额外等待动画完成
                await asyncio.sleep(2)
                
                # 如果需要滚动到特定元素
                if scroll and "scroll_to" in page_config:
                    try:
                        element = await page.query_selector(page_config["scroll_to"])
                        if element:
                            await element.scroll_into_view_if_needed()
                            await asyncio.sleep(1)
                    except Exception as e:
                        print(f"  滚动失败: {e}")
                
                # 等待指定时间
                await asyncio.sleep(wait_time)
                
                # 截图
                screenshot_path = OUTPUT_DIR / f"frame-{i:02d}.png"
                await page.screenshot(path=str(screenshot_path), full_page=False)
                screenshots.append(screenshot_path)
                print(f"  ✅ 已保存: {screenshot_path.name}")
                
            except Exception as e:
                print(f"  ❌ 失败: {e}")
                # 创建一个空白截图作为占位符
                screenshot_path = OUTPUT_DIR / f"frame-{i:02d}.png"
                await page.screenshot(path=str(screenshot_path))
                screenshots.append(screenshot_path)
        
        await browser.close()
    
    return screenshots


async def main():
    print("=" * 50)
    print("HopLLM Demo Video Generator")
    print("=" * 50)
    print(f"输出目录: {OUTPUT_DIR}")
    print(f"截图尺寸: {VIEWPORT['width']}x{VIEWPORT['height']}")
    print()
    
    # 清理旧截图
    old_frames = list(OUTPUT_DIR.glob("frame-*.png"))
    if old_frames:
        print(f"清理 {len(old_frames)} 个旧截图...")
        for f in old_frames:
            f.unlink()
    
    # 截取新截图
    screenshots = await capture_screenshots()
    
    print()
    print("=" * 50)
    print(f"✅ 完成！共生成 {len(screenshots)} 张截图")
    print()
    print("下一步：使用 ffmpeg 生成视频")
    print("  ffmpeg -framerate 1 -i frame-%02d.png -c:v libx264 -pix_fmt yuv420p hopllm_demo.mp4")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(main())