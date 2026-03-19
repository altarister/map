import { chromium } from 'playwright';

(async () => {
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', msg => {
        if (msg.text().includes('[RegionModeSelectPopup]') || msg.text().includes('[GameLogic]')) {
            console.log('BROWSER LOG:', msg.text());
        }
    });

    try {
        await page.goto('http://localhost:5173');

        console.log('Waiting for Main Menu...');
        await page.waitForSelector('text="훈련 시작"');
        await page.click('text="훈련 시작"');

        console.log('Waiting for Level Select...');
        await page.waitForSelector('text="1단계: 지역 숙달"');
        await page.click('text="1단계: 지역 숙달"');

        console.log('Waiting for Map to load...');
        await page.waitForTimeout(2000); // let map load and render

        console.log('Clicking Yongin-si on the map...');
        // We evaluate directly in the browser context since SVG paths don't always click reliably via Playwright click()
        await page.evaluate(() => {
            const paths = Array.from(document.querySelectorAll('path.cursor-pointer'));
            console.log("Paths found:", paths.length);
            const yongin = paths.find(p => p.__data__ && p.__data__.properties && p.__data__.properties.name === '용인시');
            if (yongin) {
                const evt = new MouseEvent('click', { bubbles: true, cancelable: true, view: window });
                yongin.dispatchEvent(evt);
            } else {
                console.log("Yongin-si not found on map");
            }
        });

        await page.waitForTimeout(1000);

        console.log('Clicking Basic Course...');
        const basicBtn = await page.$('text="기본 코스"');
        if (basicBtn) {
            await basicBtn.click();
            console.log('Basic Course clicked.');
        } else {
            console.log('Basic Course button not found.');
        }

        await page.waitForTimeout(2000);
    } catch (e) {
        console.error("Test Error:", e);
    } finally {
        await browser.close();
    }
})();
