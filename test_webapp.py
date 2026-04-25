from playwright.sync_api import sync_playwright
import time

with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page()
    page.set_default_timeout(15000)
    
    issues = []
    
    # 1. 测试首页
    print("=== 1. 测试首页 ===")
    page.goto('http://localhost:3000/en', wait_until='domcontentloaded')
    time.sleep(2)
    page.screenshot(path='/tmp/01_homepage.png', full_page=True)
    print("✅ 首页截图已保存")
    
    # 检查价格显示
    price_texts = page.locator('text=/\\$[0-9]').all_inner_texts()
    print(f"首页价格显示: {len(price_texts)} 处")
    
    # 2. 测试配置页面
    print("\n=== 2. 测试配置页面 (/configure) ===")
    page.goto('http://localhost:3000/en/configure', wait_until='domcontentloaded')
    time.sleep(2)
    page.screenshot(path='/tmp/02_configure.png', full_page=True)
    print("✅ 配置页截图已保存")
    
    text = page.inner_text('body')
    if 'error' in text.lower() or '错误' in text:
        issues.append("配置页面显示错误")
    
    # 检查模型选择器
    selects = page.locator('select').all()
    print(f"选择器数量: {len(selects)}")
    
    # 3. 测试 Marketplace
    print("\n=== 3. 测试 Marketplace (/templates) ===")
    page.goto('http://localhost:3000/en/templates', wait_until='domcontentloaded')
    time.sleep(2)
    page.screenshot(path='/tmp/03_templates.png', full_page=True)
    print("✅ Marketplace截图已保存")
    
    # 4. 测试 Dashboard (需要登录)
    print("\n=== 4. 测试 Dashboard (/dashboard) ===")
    page.goto('http://localhost:3000/en/dashboard', wait_until='domcontentloaded')
    time.sleep(2)
    page.screenshot(path='/tmp/04_dashboard.png', full_page=True)
    
    url = page.url
    print(f"当前URL: {url}")
    if '/auth/login' in url:
        print("✅ 未登录用户正确重定向到登录页")
    else:
        issues.append("Dashboard 未正确重定向到登录页")
    
    # 5. 测试登录页
    print("\n=== 5. 测试登录页 (/auth/login) ===")
    page.goto('http://localhost:3000/en/auth/login', wait_until='domcontentloaded')
    time.sleep(2)
    page.screenshot(path='/tmp/05_login.png', full_page=True)
    print("✅ 登录页截图已保存")
    
    inputs = page.locator('input').all()
    print(f"输入框数量: {len(inputs)}")
    if len(inputs) < 2:
        issues.append("登录页输入框不足")
    
    # 6. 测试注册页
    print("\n=== 6. 测试注册页 (/auth/register) ===")
    page.goto('http://localhost:3000/en/auth/register', wait_until='domcontentloaded')
    time.sleep(2)
    page.screenshot(path='/tmp/06_register.png', full_page=True)
    print("✅ 注册页截图已保存")
    
    # 7. 测试 about 页
    print("\n=== 7. 测试 About 页 (/about) ===")
    page.goto('http://localhost:3000/en/about', wait_until='domcontentloaded')
    time.sleep(2)
    page.screenshot(path='/tmp/07_about.png', full_page=True)
    print("✅ About页截图已保存")
    
    # 8. 测试响应式
    print("\n=== 8. 测试移动端显示 ===")
    page.set_viewport_size({'width': 375, 'height': 667})
    page.goto('http://localhost:3000/en', wait_until='domcontentloaded')
    time.sleep(2)
    page.screenshot(path='/tmp/08_mobile.png', full_page=True)
    print("✅ 移动端截图已保存")
    
    # 汇总
    print("\n" + "="*50)
    print("测试完成，问题汇总:")
    print("="*50)
    if issues:
        for i, issue in enumerate(issues, 1):
            print(f"{i}. {issue}")
    else:
        print("✅ 未发现明显问题")
    
    browser.close()
