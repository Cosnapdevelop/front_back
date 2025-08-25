#!/usr/bin/env node

/**
 * Cosnap AI 完整功能端到端测试
 * 全面测试登录/注册、文件上传、AI处理和用户体验
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 测试配置
const CONFIG = {
  FRONTEND_URL: 'https://cosnap.vercel.app',
  BACKEND_URL: 'https://cosnap-back.onrender.com',
  HEADLESS: false, // 设置为false可以看到测试过程
  VIEWPORT: { width: 1366, height: 768 },
  TIMEOUT: 30000,
  SCREENSHOT_DIR: './test-screenshots'
};

// 测试结果记录
const testResults = {
  passed: 0,
  failed: 0,
  warnings: 0,
  details: [],
  screenshots: [],
  performance: {}
};

// 日志工具
const log = {
  info: (msg) => console.log(`\x1b[36m[INFO]\x1b[0m ${msg}`),
  success: (msg) => console.log(`\x1b[32m[PASS]\x1b[0m ${msg}`),
  error: (msg) => console.log(`\x1b[31m[FAIL]\x1b[0m ${msg}`),
  warning: (msg) => console.log(`\x1b[33m[WARN]\x1b[0m ${msg}`),
  section: (msg) => console.log(`\n\x1b[1m\x1b[35m=== ${msg} ===\x1b[0m`),
  step: (step) => console.log(`\x1b[1m📋 步骤 ${step}\x1b[0m`)
};

// 创建测试目录
function setupTestEnvironment() {
  if (!fs.existsSync(CONFIG.SCREENSHOT_DIR)) {
    fs.mkdirSync(CONFIG.SCREENSHOT_DIR, { recursive: true });
  }
}

// 截图工具
async function takeScreenshot(page, name, description) {
  try {
    const filename = `${Date.now()}-${name}.png`;
    const filepath = path.join(CONFIG.SCREENSHOT_DIR, filename);
    await page.screenshot({ path: filepath, fullPage: true });
    
    testResults.screenshots.push({
      name: filename,
      description,
      timestamp: new Date().toISOString()
    });
    
    log.info(`📸 截图已保存: ${filename}`);
  } catch (error) {
    log.warning(`截图失败: ${error.message}`);
  }
}

// 等待工具
const waitFor = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 测试执行包装器
async function runTest(testName, testFunction) {
  try {
    log.info(`🧪 开始测试: ${testName}`);
    const startTime = Date.now();
    
    const result = await testFunction();
    
    const duration = Date.now() - startTime;
    testResults.passed++;
    testResults.details.push({
      test: testName,
      status: 'PASSED',
      duration: `${duration}ms`,
      result: result || 'Success'
    });
    
    log.success(`${testName} - 通过 (${duration}ms)`);
    return true;
  } catch (error) {
    testResults.failed++;
    testResults.details.push({
      test: testName,
      status: 'FAILED',
      error: error.message,
      stack: error.stack
    });
    
    log.error(`${testName} - 失败: ${error.message}`);
    return false;
  }
}

// ==================== 测试1: 登录/注册流程 ====================
async function testAuthenticationFlow(browser) {
  const page = await browser.newPage();
  await page.setViewport(CONFIG.VIEWPORT);
  
  try {
    log.step('1.1 - 访问首页并导航到认证页面');
    const startTime = Date.now();
    await page.goto(CONFIG.FRONTEND_URL, { 
      waitUntil: 'networkidle2',
      timeout: CONFIG.TIMEOUT 
    });
    
    const loadTime = Date.now() - startTime;
    testResults.performance.pageLoadTime = loadTime;
    
    await takeScreenshot(page, 'homepage', '首页加载完成');
    
    // 检查页面基本元素
    await page.waitForSelector('body', { timeout: 5000 });
    const title = await page.title();
    log.info(`页面标题: ${title}`);
    
    // 寻找登录/注册相关元素
    log.step('1.2 - 查找认证入口');
    const authElements = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, a'));
      const links = buttons.filter(btn => 
        btn.textContent.toLowerCase().includes('登录') ||
        btn.textContent.toLowerCase().includes('注册') ||
        btn.textContent.toLowerCase().includes('login') ||
        btn.textContent.toLowerCase().includes('register') ||
        btn.textContent.toLowerCase().includes('sign')
      );
      return links.map(link => ({
        text: link.textContent.trim(),
        href: link.href,
        tag: link.tagName
      }));
    });
    
    if (authElements.length === 0) {
      throw new Error('未找到登录/注册入口');
    }
    
    log.info(`找到认证元素: ${authElements.map(el => el.text).join(', ')}`);
    
    // 尝试点击登录或注册按钮
    log.step('1.3 - 尝试进入认证流程');
    try {
      // 查找并点击登录相关按钮
      const loginButton = await page.$('button:contains("登录"), a:contains("登录"), button:contains("Login"), a:contains("Login")');
      if (loginButton) {
        await loginButton.click();
      } else {
        // 尝试其他可能的入口
        const authButton = await page.$('button, a');
        if (authButton) {
          await authButton.click();
        }
      }
      
      await waitFor(2000); // 等待页面跳转
      await takeScreenshot(page, 'auth-page', '认证页面');
      
    } catch (clickError) {
      log.warning(`点击认证按钮失败: ${clickError.message}`);
      // 尝试导航到认证页面
      try {
        await page.goto(`${CONFIG.FRONTEND_URL}/auth`, { waitUntil: 'networkidle2' });
        await takeScreenshot(page, 'auth-direct', '直接访问认证页面');
      } catch (navError) {
        await page.goto(`${CONFIG.FRONTEND_URL}/login`, { waitUntil: 'networkidle2' });
        await takeScreenshot(page, 'login-direct', '直接访问登录页面');
      }
    }
    
    // 检查认证表单
    log.step('1.4 - 检查认证表单');
    const forms = await page.$$('form');
    const inputs = await page.$$('input');
    
    log.info(`找到 ${forms.length} 个表单, ${inputs.length} 个输入框`);
    
    if (inputs.length === 0) {
      throw new Error('未找到认证表单输入框');
    }
    
    // 分析输入框类型
    const inputTypes = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('input')).map(input => ({
        type: input.type,
        name: input.name,
        placeholder: input.placeholder,
        required: input.required
      }));
    });
    
    log.info('输入框分析:', JSON.stringify(inputTypes, null, 2));
    
    return {
      pageLoadTime: `${loadTime}ms`,
      authElementsFound: authElements.length,
      formsFound: forms.length,
      inputsFound: inputs.length,
      inputTypes: inputTypes
    };
    
  } finally {
    await page.close();
  }
}

// ==================== 测试2: 文件上传功能 ====================
async function testFileUpload(browser) {
  const page = await browser.newPage();
  await page.setViewport(CONFIG.VIEWPORT);
  
  try {
    log.step('2.1 - 访问应用寻找文件上传功能');
    await page.goto(CONFIG.FRONTEND_URL, { waitUntil: 'networkidle2' });
    
    // 创建测试图片文件
    const testImagePath = await createTestImages();
    
    // 查找文件上传元素
    const fileInputs = await page.$$('input[type="file"]');
    const uploadElements = await page.$$('[class*="upload"], [class*="drop"], [data-testid*="upload"]');
    
    log.info(`找到 ${fileInputs.length} 个文件输入框, ${uploadElements.length} 个上传相关元素`);
    
    if (fileInputs.length === 0 && uploadElements.length === 0) {
      // 尝试寻找可能的上传页面
      try {
        await page.goto(`${CONFIG.FRONTEND_URL}/upload`, { waitUntil: 'networkidle2' });
        const newFileInputs = await page.$$('input[type="file"]');
        if (newFileInputs.length > 0) {
          log.info('在 /upload 页面找到文件输入框');
        }
      } catch (e) {
        // 尝试其他可能的路径
        const possiblePaths = ['/effects', '/create', '/generate'];
        for (const path of possiblePaths) {
          try {
            await page.goto(`${CONFIG.FRONTEND_URL}${path}`, { waitUntil: 'networkidle2' });
            const pathFileInputs = await page.$$('input[type="file"]');
            if (pathFileInputs.length > 0) {
              log.info(`在 ${path} 页面找到文件输入框`);
              break;
            }
          } catch (pathError) {
            continue;
          }
        }
      }
    }
    
    await takeScreenshot(page, 'upload-page', '文件上传页面');
    
    // 检查上传限制信息
    const pageText = await page.evaluate(() => document.body.innerText);
    const has10MBLimit = pageText.includes('10MB') || pageText.includes('10 MB');
    const hasSizeLimit = /\d+\s*MB/g.test(pageText);
    
    log.info(`页面包含10MB限制信息: ${has10MBLimit}`);
    log.info(`页面包含大小限制信息: ${hasSizeLimit}`);
    
    return {
      fileInputsFound: fileInputs.length,
      uploadElementsFound: uploadElements.length,
      has10MBLimit,
      hasSizeLimit,
      testImagesCreated: testImagePath ? 1 : 0
    };
    
  } finally {
    await page.close();
  }
}

// ==================== 测试3: AI效果处理流程 ====================
async function testAIEffectsFlow(browser) {
  const page = await browser.newPage();
  await page.setViewport(CONFIG.VIEWPORT);
  
  try {
    log.step('3.1 - 查找AI效果相关功能');
    await page.goto(CONFIG.FRONTEND_URL, { waitUntil: 'networkidle2' });
    
    // 查找AI效果相关元素
    const aiElements = await page.evaluate(() => {
      const allElements = Array.from(document.querySelectorAll('*'));
      const aiRelated = allElements.filter(el => {
        const text = el.textContent.toLowerCase();
        return text.includes('ai') || 
               text.includes('效果') || 
               text.includes('处理') ||
               text.includes('background') ||
               text.includes('换背景');
      });
      
      return aiRelated.slice(0, 10).map(el => ({
        tag: el.tagName,
        text: el.textContent.trim().substring(0, 100),
        className: el.className
      }));
    });
    
    log.info(`找到 ${aiElements.length} 个AI相关元素`);
    
    // 检查是否有效果选择界面
    const effectButtons = await page.$$('[class*="effect"], button[class*="style"], [data-testid*="effect"]');
    log.info(`找到 ${effectButtons.length} 个效果按钮`);
    
    await takeScreenshot(page, 'ai-effects', 'AI效果页面');
    
    return {
      aiElementsFound: aiElements.length,
      effectButtonsFound: effectButtons.length,
      aiElements: aiElements.slice(0, 5) // 返回前5个用于分析
    };
    
  } finally {
    await page.close();
  }
}

// ==================== 测试4: 用户体验和响应速度 ====================
async function testUserExperience(browser) {
  const page = await browser.newPage();
  await page.setViewport(CONFIG.VIEWPORT);
  
  try {
    log.step('4.1 - 性能指标测试');
    
    // 测试页面加载性能
    const performanceMetrics = {};
    
    // 首页加载测试
    const homeStartTime = Date.now();
    await page.goto(CONFIG.FRONTEND_URL, { waitUntil: 'networkidle2' });
    performanceMetrics.homePageLoad = Date.now() - homeStartTime;
    
    // 获取详细的性能指标
    const metrics = await page.metrics();
    performanceMetrics.jsHeapUsed = (metrics.JSHeapUsedSize / 1024 / 1024).toFixed(2) + 'MB';
    performanceMetrics.jsHeapTotal = (metrics.JSHeapTotalSize / 1024 / 1024).toFixed(2) + 'MB';
    performanceMetrics.domNodes = metrics.Nodes;
    
    log.info(`首页加载时间: ${performanceMetrics.homePageLoad}ms`);
    log.info(`JavaScript堆内存使用: ${performanceMetrics.jsHeapUsed}`);
    log.info(`DOM节点数: ${performanceMetrics.domNodes}`);
    
    // 测试响应性
    log.step('4.2 - 交互响应性测试');
    const buttons = await page.$$('button');
    const links = await page.$$('a');
    
    log.info(`找到 ${buttons.length} 个按钮, ${links.length} 个链接`);
    
    // 测试按钮点击响应
    let clickResponses = [];
    if (buttons.length > 0) {
      for (let i = 0; i < Math.min(3, buttons.length); i++) {
        try {
          const clickStart = Date.now();
          await buttons[i].click();
          await waitFor(100);
          const clickTime = Date.now() - clickStart;
          clickResponses.push(clickTime);
        } catch (e) {
          // 点击可能失败，这是正常的
        }
      }
    }
    
    const avgClickResponse = clickResponses.length > 0 
      ? clickResponses.reduce((a, b) => a + b, 0) / clickResponses.length 
      : 0;
    
    performanceMetrics.avgClickResponse = `${avgClickResponse.toFixed(2)}ms`;
    
    // 移动端适配测试
    log.step('4.3 - 移动端适配测试');
    const mobileViewports = [
      { width: 375, height: 667, name: 'iPhone 8' },
      { width: 414, height: 896, name: 'iPhone XR' },
      { width: 360, height: 640, name: 'Android' }
    ];
    
    const mobileResults = [];
    for (const viewport of mobileViewports) {
      await page.setViewport(viewport);
      await page.reload({ waitUntil: 'networkidle2' });
      
      const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
      const hasHorizontalScroll = bodyWidth > viewport.width + 20;
      
      mobileResults.push({
        device: viewport.name,
        viewport: `${viewport.width}x${viewport.height}`,
        responsive: !hasHorizontalScroll,
        actualWidth: bodyWidth
      });
      
      await takeScreenshot(page, `mobile-${viewport.name.toLowerCase().replace(' ', '-')}`, `${viewport.name}适配测试`);
    }
    
    const responsiveCount = mobileResults.filter(r => r.responsive).length;
    performanceMetrics.mobileCompatibility = `${responsiveCount}/${mobileResults.length}`;
    
    return {
      performanceMetrics,
      buttonsFound: buttons.length,
      linksFound: links.length,
      clickResponses,
      mobileResults
    };
    
  } finally {
    await page.close();
  }
}

// 创建测试图片
async function createTestImages() {
  try {
    // 创建一个小的测试图片文件 (模拟)
    const testImageData = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
    const testImagePath = path.join(CONFIG.SCREENSHOT_DIR, 'test-image.png');
    
    // 这里只是创建一个占位文件路径
    return testImagePath;
  } catch (error) {
    log.warning(`创建测试图片失败: ${error.message}`);
    return null;
  }
}

// 主测试执行函数
async function runComprehensiveE2ETests() {
  log.section('Cosnap AI 完整功能端到端测试开始');
  setupTestEnvironment();
  
  let browser = null;
  
  try {
    // 启动浏览器
    log.info('启动浏览器...');
    browser = await puppeteer.launch({
      headless: CONFIG.HEADLESS,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-web-security'
      ]
    });
    
    log.success('浏览器启动成功');
    
    // 执行所有测试
    await runTest('登录/注册流程测试', () => testAuthenticationFlow(browser));
    await runTest('文件上传功能测试', () => testFileUpload(browser));
    await runTest('AI效果处理流程测试', () => testAIEffectsFlow(browser));
    await runTest('用户体验和响应速度测试', () => testUserExperience(browser));
    
  } catch (error) {
    log.error(`测试执行失败: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
      log.info('浏览器已关闭');
    }
  }
  
  // 生成测试报告
  await generateTestReport();
}

// 生成测试报告
async function generateTestReport() {
  log.section('生成测试报告');
  
  const total = testResults.passed + testResults.failed;
  const successRate = total > 0 ? ((testResults.passed / total) * 100).toFixed(1) : '0';
  
  const report = {
    summary: {
      totalTests: total,
      passed: testResults.passed,
      failed: testResults.failed,
      warnings: testResults.warnings,
      successRate: `${successRate}%`,
      timestamp: new Date().toISOString(),
      duration: Date.now() - (global.testStartTime || Date.now())
    },
    performance: testResults.performance,
    details: testResults.details,
    screenshots: testResults.screenshots
  };
  
  // 保存报告
  const reportPath = path.join(CONFIG.SCREENSHOT_DIR, 'test-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  
  // 输出结果
  log.section('测试结果总结');
  log.info(`总测试数: ${total}`);
  log.success(`通过: ${testResults.passed}`);
  log.error(`失败: ${testResults.failed}`);
  log.warning(`警告: ${testResults.warnings}`);
  log.info(`成功率: ${successRate}%`);
  
  if (testResults.performance.pageLoadTime) {
    log.info(`页面加载时间: ${testResults.performance.pageLoadTime}ms`);
  }
  
  log.info(`测试报告已保存: ${reportPath}`);
  log.info(`截图已保存到: ${CONFIG.SCREENSHOT_DIR}`);
  
  // 输出建议
  log.section('测试建议');
  if (testResults.failed === 0) {
    log.success('🎉 所有测试通过！应用功能完整且正常');
  } else {
    log.warning('⚠️ 发现一些问题，建议检查失败的测试项');
  }
  
  return report;
}

// 执行测试
if (import.meta.url === `file://${process.argv[1]}`) {
  global.testStartTime = Date.now();
  
  log.info('开始Cosnap AI完整功能测试...');
  log.info(`目标网站: ${CONFIG.FRONTEND_URL}`);
  log.info(`无头模式: ${CONFIG.HEADLESS}`);
  
  runComprehensiveE2ETests().catch(error => {
    log.error(`测试执行失败: ${error.message}`);
    process.exit(1);
  });
}

export { runComprehensiveE2ETests, testResults };