const { chromium } = require('playwright');

(async () => {
  // Launch browser
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000 // Slow down actions to see what's happening
  });
  
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  
  const page = await context.newPage();
  
  try {
    // Navigate to LinkedIn profile
    await page.goto('https://it.linkedin.com/in/filippotorrini', {
      waitUntil: 'networkidle'
    });
    
    // Wait a bit for content to load
    await page.waitForTimeout(3000);
    
    // Take screenshot
    await page.screenshot({ 
      path: 'filippo-torrini-linkedin.png', 
      fullPage: true 
    });
    
    // Try to extract visible information
    const profileInfo = await page.evaluate(() => {
      // Helper function to safely get text
      const getText = (selector) => {
        const element = document.querySelector(selector);
        return element ? element.innerText || element.textContent : null;
      };
      
      // Get all text from main content area
      const mainContent = document.querySelector('main');
      const allText = mainContent ? mainContent.innerText : 'Content not accessible';
      
      return {
        pageTitle: document.title,
        mainContent: allText.substring(0, 2000), // First 2000 chars
        h1Text: getText('h1'),
        metaDescription: document.querySelector('meta[name="description"]')?.content
      };
    });
    
    console.log('Profile Information:');
    console.log('==================');
    console.log('Page Title:', profileInfo.pageTitle);
    console.log('H1 Text:', profileInfo.h1Text);
    console.log('Meta Description:', profileInfo.metaDescription);
    console.log('\nMain Content Preview:');
    console.log(profileInfo.mainContent);
    
  } catch (error) {
    console.error('Error accessing LinkedIn:', error);
  } finally {
    await browser.close();
  }
})();