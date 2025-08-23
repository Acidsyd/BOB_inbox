import { test, expect } from '@playwright/test';

test('scrape LinkedIn profile', async ({ page }) => {
  // Navigate to the LinkedIn profile
  await page.goto('https://it.linkedin.com/in/filippotorrini');
  
  // Wait for the page to load
  await page.waitForLoadState('networkidle');
  
  // Take a screenshot for reference
  await page.screenshot({ path: 'linkedin-profile.png', fullPage: true });
  
  // Try to extract visible information
  const profileData = await page.evaluate(() => {
    const getText = (selector: string) => {
      const element = document.querySelector(selector);
      return element ? element.textContent?.trim() : null;
    };
    
    return {
      name: getText('h1'),
      headline: getText('.text-body-medium'),
      location: getText('.text-body-small.inline'),
      about: getText('[data-generated-suggestion-target]'),
      currentRole: getText('.experience-item:first-child .t-bold'),
      currentCompany: getText('.experience-item:first-child .t-normal')
    };
  });
  
  console.log('Profile Data:', profileData);
});