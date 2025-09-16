import puppeteer from 'puppeteer';

async function testComposeButton() {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: false,
      args: ['--no-sandbox', '--disable-dev-shm-usage'],
      devtools: true
    });

    const page = await browser.newPage();

    // Log console messages and errors
    page.on('console', msg => {
      console.log('BROWSER CONSOLE:', msg.type().toUpperCase(), msg.text());
    });

    page.on('pageerror', error => {
      console.log('BROWSER ERROR:', error.message);
    });

    page.on('requestfailed', request => {
      console.log('REQUEST FAILED:', request.url(), request.failure().errorText);
    });

    console.log('Navigating to production inbox...');
    await page.goto('http://localhost:3005/inbox', { waitUntil: 'networkidle2' });

    // Wait for the page to load
    await page.waitForTimeout(3000);

    console.log('Looking for compose button...');

    // Look for the compose button
    const composeButton = await page.$('button:has-text("Compose")');
    if (!composeButton) {
      console.log('ERROR: Compose button not found!');
      // Try alternative selectors
      const editButton = await page.$('[data-testid="compose-button"]');
      const editIcon = await page.$('button svg.lucide-edit');
      const blueButton = await page.$('button.bg-blue-600');

      console.log('Alternative selectors:');
      console.log('- Edit button:', editButton ? 'FOUND' : 'NOT FOUND');
      console.log('- Edit icon:', editIcon ? 'FOUND' : 'NOT FOUND');
      console.log('- Blue button:', blueButton ? 'FOUND' : 'NOT FOUND');

      return;
    }

    console.log('Compose button found! Attempting to click...');

    try {
      await composeButton.click();
      console.log('Compose button clicked successfully!');

      // Wait for modal to appear
      await page.waitForTimeout(2000);

      // Check if compose modal appeared
      const modal = await page.$('[role="dialog"]');
      const composeModal = await page.$('.compose-modal');
      const modalContent = await page.$('.modal-content');

      console.log('Modal detection:');
      console.log('- Role dialog:', modal ? 'FOUND' : 'NOT FOUND');
      console.log('- Compose modal:', composeModal ? 'FOUND' : 'NOT FOUND');
      console.log('- Modal content:', modalContent ? 'FOUND' : 'NOT FOUND');

      if (!modal && !composeModal && !modalContent) {
        console.log('ERROR: No modal appeared after clicking compose button!');
      } else {
        console.log('SUCCESS: Compose modal opened!');
      }

    } catch (error) {
      console.log('ERROR clicking compose button:', error.message);
    }

    // Keep browser open for manual inspection
    console.log('Test completed. Browser will remain open for inspection...');
    await page.waitForTimeout(30000); // Wait 30 seconds for manual inspection

  } catch (error) {
    console.log('Test failed:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testComposeButton();