const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const OUT_DIR = '/Users/nelcome/.gemini/antigravity/brain/8e6b0a69-e2b3-47d6-839f-61b7b2640dcc';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Set viewport to a typical desktop size
  await page.setViewport({ width: 1280, height: 900 });

  console.log('Navigating to http://localhost:5173/newsfinder/ ...');
  await page.goto('http://localhost:5173/newsfinder/', { waitUntil: 'networkidle0' });

  // 1. Initial Idle State
  console.log('Taking screenshot 1: Idle state');
  await page.screenshot({ path: path.join(OUT_DIR, '01_idle_state.png'), fullPage: true });

  // 2. Grid Overlay Toggle
  console.log('Toggling Grid Overlay...');
  await page.evaluate(() => {
    document.body.classList.toggle('show-grid');
  });
  console.log('Taking screenshot 2: Grid overlay');
  await page.screenshot({ path: path.join(OUT_DIR, '02_grid_overlay.png'), fullPage: true });

  // Turn off grid
  await page.evaluate(() => {
    document.body.classList.remove('show-grid');
  });

  // 3. Search and Loading
  console.log('Searching for "삼성전자"...');
  await page.type('#company-input', '삼성전자', { delay: 50 });
  await page.click('#submit-btn');

  // Wait a brief moment for the loading panel to show
  await new Promise(r => setTimeout(r, 500));
  console.log('Taking screenshot 3: Loading state');
  await page.screenshot({ path: path.join(OUT_DIR, '03_loading_state.png'), fullPage: true });

  // 4. Wait for Results Panel
  console.log('Waiting for results panel to appear...');
  try {
    // We wait until the results-panel gets the 'active' class
    await page.waitForFunction(() => {
      const el = document.getElementById('results-panel');
      return el && el.classList.contains('active');
    }, { timeout: 30000 });
    
    // Give it a bit more time for any sub-renders or animations
    await new Promise(r => setTimeout(r, 1000));
    
    console.log('Taking screenshot 4: Results state');
    await page.screenshot({ path: path.join(OUT_DIR, '04_results_state.png'), fullPage: true });
    
    // Also test 3C tab
    console.log('Clicking 3C Tab...');
    await page.click('#tab-3c');
    await new Promise(r => setTimeout(r, 1000));
    console.log('Taking screenshot 5: 3C Tab state');
    await page.screenshot({ path: path.join(OUT_DIR, '05_3c_tab_state.png'), fullPage: true });
    
  } catch (err) {
    console.error('Error waiting for results:', err);
    await page.screenshot({ path: path.join(OUT_DIR, '04_error_state.png'), fullPage: true });
  }

  await browser.close();
  console.log('Done.');
})();
