// For more information, see https://crawlee.dev/
import { PlaywrightCrawler, ProxyConfiguration } from 'crawlee';
import { router } from './routes.js';
// import { read } from './google.js'
import { exit } from 'process';

const startUrls = [
    // 'https://www.royalcaribbean.com/sgp'
    // 'https://aws.amazon.com'
    'https://chat.openai.com',
];

const launchContext = {
    useChrome: true,
    userDataDir: 'context/', 
}

const crawler = new PlaywrightCrawler({ 
    // proxyConfiguration: new ProxyConfiguration({ proxyUrls: ['...'] }),
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
