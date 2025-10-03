const { chromium } = require('playwright');

class InstagramBot {
  constructor(config) {
    this.username = config.username;
    this.password = config.password;
    this.postUrl = config.postUrl;
    this.browser = null;
    this.page = null;
    this.context = null;
  }

  async wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async login() {
    try {
      console.log('🔄 Starting real browser...');
      
      this.browser = await chromium.launch({
        headless: false,
        slowMo: 100
      });
      
      this.context = await this.browser.newContext({
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        viewport: { width: 1280, height: 720 },
        locale: 'en-US'
      });
      
      this.page = await this.context.newPage();
      
      console.log('📱 Going to Instagram login page...');
      await this.page.goto('https://www.instagram.com/accounts/login/', {
        waitUntil: 'networkidle'
      });
      
      await this.page.waitForSelector('input[name="username"]', { timeout: 10000 });
      
      console.log('✍️ Entering credentials...');
      await this.page.fill('input[name="username"]', this.username);
      await this.wait(1000);
      
      await this.page.fill('input[name="password"]', this.password);
      await this.wait(1000);
      
      console.log('🔐 Logging in...');
      await this.page.click('button[type="submit"]');
      
      await this.page.waitForLoadState('networkidle');
      await this.wait(3000);
      
      // تخطي النوافذ المنبثقة
      try {
        const saveInfoButton = await this.page.locator('text="Not Now"').first();
        if (await saveInfoButton.isVisible({ timeout: 5000 })) {
          await saveInfoButton.click();
          console.log('⏭️ Skipped save login info popup');
          await this.wait(1000);
        }
      } catch (e) {
        console.log('No save info popup found');
      }
      
      try {
        const notificationButton = await this.page.locator('text="Not Now"').nth(1);
        if (await notificationButton.isVisible({ timeout: 5000 })) {
          await notificationButton.click();
          console.log('⏭️ Skipped notifications popup');
          await this.wait(1000);
        }
      } catch (e) {
        console.log('No notifications popup found');
      }
      
      console.log('✅ Login successful!');
      return true;
      
    } catch (error) {
      console.error('❌ Login failed:', error.message);
      throw error;
    }
  }

async postComment(text) {
    try {
      console.log('🔍 Checking if logged in...');
      
      // التحقق من تسجيل الدخول أولاً
      const currentUrl = this.page.url();
      if (currentUrl.includes('/accounts/login')) {
        console.log('❌ Not logged in! Current URL:', currentUrl);
        throw new Error('Not logged in - please check credentials');
      }
      
      console.log(`💬 Navigating to post...`);
      
      // تنظيف الرابط
      let cleanUrl = this.postUrl;
      if (cleanUrl.includes('?')) {
        cleanUrl = cleanUrl.split('?')[0];
      }
      console.log(`📍 Clean URL: ${cleanUrl}`);
      
      // الذهاب للمنشور
      await this.page.goto(cleanUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 15000
      });
      
      console.log('⏳ Waiting for page to load...');
      await this.wait(5000); // انتظار أطول
      
      // التحقق مرة أخرى من عدم ظهور صفحة تسجيل الدخول
      const afterNavigateUrl = this.page.url();
      if (afterNavigateUrl.includes('/accounts/login')) {
        console.log('❌ Redirected to login page!');
        throw new Error('Session expired or not logged in');
      }
      
      console.log('🔍 Looking for comment field...');
      
      let commentBox = null;
      
      // البحث عن حقل التعليق بطرق مختلفة
      const selectors = [
        'textarea[aria-label*="comment" i]',
        'textarea[placeholder*="comment" i]',
        'textarea[aria-label*="Add" i]',
        'textarea'
      ];
      
      for (const selector of selectors) {
        try {
          const elements = await this.page.$$(selector);
          if (elements.length > 0) {
            commentBox = elements[0];
            console.log(`✅ Found comment box using: ${selector}`);
            break;
          }
        } catch (e) {
          continue;
        }
      }
      
      // إذا لم نجد حقل التعليق، ربما نحتاج للنقر على زر أولاً
      if (!commentBox) {
        console.log('Trying to click comment button first...');
        try {
          // البحث عن زر التعليق
          const buttons = await this.page.$$('button');
          for (const button of buttons) {
            const text = await button.textContent();
            if (text && text.toLowerCase().includes('comment')) {
              await button.click();
              console.log('Clicked comment button');
              await this.wait(2000);
              break;
            }
          }
          
          // حاول مرة أخرى للعثور على textarea
          const textareas = await this.page.$$('textarea');
          if (textareas.length > 0) {
            commentBox = textareas[0];
            console.log('✅ Found comment box after clicking button');
          }
        } catch (e) {
          console.log('Could not click comment button');
        }
      }
      
      if (!commentBox) {
        // أخذ screenshot للتشخيص
        await this.page.screenshot({ 
          path: `no-comment-box-${Date.now()}.png`,
          fullPage: false 
        });
        console.log('📸 Screenshot saved for debugging');
        
        // طباعة HTML للتشخيص
        const bodyHTML = await this.page.evaluate(() => document.body.innerHTML);
        console.log('Page contains "comment":', bodyHTML.toLowerCase().includes('comment'));
        console.log('Page contains "textarea":', bodyHTML.includes('<textarea'));
        
        throw new Error('Could not find comment box - check screenshot');
      }
      
      console.log('📝 Clicking on comment field...');
      await commentBox.click();
      await this.wait(1000);
      
      // مسح أي نص موجود
      await this.page.keyboard.press('Control+A');
      await this.page.keyboard.press('Delete');
      await this.wait(500);
      
      console.log(`✍️ Typing comment: "${text}"`);
      await this.page.keyboard.type(text, { delay: 100 });
      await this.wait(1500);
      
      console.log('📤 Posting comment...');
      await this.page.keyboard.press('Enter');
      await this.wait(3000);
      
      console.log(`✅ Comment posted successfully: "${text}"`);
      return true;
      
    } catch (error) {
      console.error('❌ Failed to post comment:', error.message);
      
      try {
        const screenshotPath = `error-${Date.now()}.png`;
        await this.page.screenshot({ 
          path: screenshotPath,
          fullPage: false 
        });
        console.log(`📸 Screenshot saved: ${screenshotPath}`);
      } catch (e) {
        console.log('Could not save screenshot');
      }
      
      throw error;
    }
  }

  async close() {
    if (this.browser) {
      await this.browser.close();
      console.log('👋 Browser closed');
    }
  }
}

module.exports = InstagramBot;