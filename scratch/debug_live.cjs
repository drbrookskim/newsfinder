const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Capture console logs
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', error => console.log('PAGE ERROR:', error.message));
  page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText));

  console.log('Navigating to https://drbrookskim.github.io/newsfinder/ ...');
  await page.goto('https://drbrookskim.github.io/newsfinder/', { waitUntil: 'networkidle0' });

  console.log('Typing query and submitting...');
  await page.type('#company-input', '삼성전자', { delay: 50 });
  await page.click('#submit-btn');

  // Wait 3 seconds to see what happens
  await new Promise(r => setTimeout(r, 3000));
  
  // Let's also check if there is an active loading panel
  const isLoadingActive = await page.evaluate(() => {
    const p = document.getElementById('loading-panel');
    return p ? p.classList.contains('active') : false;
  });
  console.log('Loading Panel Active?', isLoadingActive);

  // Take a screenshot of the live site!
  await page.screenshot({ path: 'scratch/live_site_after_click.png' });

  await browser.close();
  console.log('Done.');
})();
