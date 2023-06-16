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
    autoscaledPoolOptions: {
        autoscaleIntervalSecs: 20,
        desiredConcurrency: 1,
        maxConcurrency: 1,
    },
    headless: false,
    // keepAlive: true,
    requestHandlerTimeoutSecs: 60 * 30,
    maxRequestRetries: 0,
    navigationTimeoutSecs: 60,
    launchContext: launchContext,
    preNavigationHooks: [
        async (crawlingContext) => {
            const { page } = crawlingContext;
            await page.setViewportSize({ width: 1200, height: 800 });
        },
    ]
});

// exit(0)
await crawler.run(startUrls);
