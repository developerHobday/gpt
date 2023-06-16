import { PlaywrightCrawler } from 'crawlee';
import { router } from './routes.js';
import { exit } from 'process';

const startUrls = [
    'https://chat.openai.com',
];

const launchContext = {
    useChrome: true,
    userDataDir: 'context/', 
}

const crawler = new PlaywrightCrawler({ 
    requestHandler: router,
    headless: false,
    // keepAlive: true,
    requestHandlerTimeoutSecs: 600 * 10,
    maxRequestRetries: 1,
    launchContext: launchContext,
    preNavigationHooks: [
        async (crawlingContext) => {
            const { page } = crawlingContext;
            await page.setViewportSize({ width: 1200, height: 800 });
        },
    ]
});

// await read()
// exit(0)
await crawler.run(startUrls);
