const { chromium } = require('playwright');

(async () => {
    const browser = await chromium.launch();
    const page = await browser.newPage();
    
    page.on('console', msg => {
        if (msg.text().includes('[RegionModeSelectPopup]')) {
            console.log('BROWSER LOG:', msg.text());
        }
    });

    await page.goto('http://localhost:5173');
    
    // Start map
    await page.click('button:has-text("훈련 시작")');
    await page.click('button:has-text("1단계")');
    await page.waitForTimeout(1000);
    
    // Find Yongin-si by coordinates or by waiting for canvas
    // Or we can just evaluate a click event.
    // Since it's canvas or SVG, let's hover/click the center of Yongin-si.
    // Yongin-si code is 41460 (used to be 31190).
    const isClickable = await page.evaluate(() => {
        const svg = document.querySelector('svg');
        if (!svg) return false;
        // The g with class cursor-pointer
        const paths = Array.from(document.querySelectorAll('path.cursor-pointer'));
        const yongin = paths.find(p => p.__data__ && p.__data__.properties && p.__data__.properties.name === '용인시');
        if (yongin) {
             const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
             yongin.dispatchEvent(evt);
             return true;
        }
        return false;
    });

    console.log('Clicked Yongin: ', isClickable);
    await page.waitForTimeout(500);

    // Now popup should be visible. We click Basic mode.
    const basicBtn = await page.$('button:has-text("기본 코스")');
    if (basicBtn) {
        console.log('Found Basic Btn, clicking...');
        await basicBtn.click();
    } else {
        console.log('No basic btn found');
    }

    await page.waitForTimeout(500);
    await browser.close();
})();
