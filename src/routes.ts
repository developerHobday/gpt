import { Dataset, Log, createPlaywrightRouter } from 'crawlee';
import { Page } from 'playwright';
import { logger } from './logger.js'
import { config } from './config.js'
import { PromptObj, readNextPrompt, updatePrompt } from './google.js'

export const router = createPlaywrightRouter();

const loginIfNecessary = async(page: Page) => {
    await page.waitForTimeout(2000) // TODO how to get around this?
    const loginButtonLocator = page.getByRole('button', {name: 'Log in'})
    // const chatGPTheaderLocator = page.locator('h1').filter(
    //     {hasText: 'ChatGPT'}
    // )
    logger.debug(await loginButtonLocator.count())
    if (await loginButtonLocator.count() == 0) {
        logger.debug('logged in already')
        return    
    }
    logger.debug('start login')
    

    await loginButtonLocator.click() 
    switch(config.login.type) {
        case 'windows':
            await page.click( 'button[data-provider="windowslive"]')
            await page.waitForTimeout(2000)
            
            const emailFieldLocator = page.locator('input[type="email"]')
            if (await emailFieldLocator.count() != 0) {
                await emailFieldLocator.type( 
                    config.login.user, 
                    {delay: config.typeDelay}
                )
                await page.click( 'input[type="submit"]')
                logger.debug('typed email')    
            }

            const passwordFieldLocator = page.locator('input[type="password"]')
            await passwordFieldLocator.click()
            await passwordFieldLocator.type( 
                config.login.password, 
                {delay: 500}
            )
            await page.click( 'input[type="submit"]')

            await page.waitForTimeout(2000)
            const keepLoggedInButtonLocator = page.locator('input[type="submit"]')
            if (await keepLoggedInButtonLocator.count() != 0) {
                await page.getByLabel("Don't show").check()
                await keepLoggedInButtonLocator.click()
            }
            break;

        default:
            throw new Error('not handled')

    }   
    
    logger.debug('finish login')
}

const handleFirstTimeIfNecessary = async (page: Page) => {
    const firstTimeGptButton = page.locator('button.ml-auto')
    if (await firstTimeGptButton.count() == 0) {
        return
    }
    logger.debug('First time login') 
    await page.click('button.ml-auto') // Next
    await page.click('button.ml-auto') // Next
    await page.click('button.ml-auto') // Done
}

const getNumWordsInPrompt = (promptObj: PromptObj) => {
    let numWords = 0
    if (promptObj.start) {
        const startParts = promptObj.start.split(' ')
        numWords += startParts.length
    }
    if (promptObj.middle) {
        const midParts = promptObj.middle.split(' ')
        numWords += midParts.length
    }
    if (promptObj.end) {
        const endParts = promptObj.end.split(' ')
        numWords += endParts.length
    }
    return numWords
}

const getNumWords = (str: string): number => {
    const parts = str.split(' ')
    return parts.length
}

const promptChat = async (page: Page, promptObj: PromptObj): Promise<string> => {
    // await page.waitForTimeout(2000)
    const inputField = page.getByPlaceholder('Send a message')
    // await inputField.type(prompt, {delay: config.typeDelay})
    if (promptObj.start) {
        await inputField.type( promptObj.start, {
            delay: config.typeDelay,
            timeout: config.promptMaxLength * config.typeDelay,
        })
    }
    if (promptObj.middle) {
        await inputField.press('Shift+Enter')
        await inputField.type( promptObj.middle, {
            delay: config.typeDelay,
            timeout: config.promptMaxLength * config.typeDelay,
        })

    }
    if (promptObj.end) {
        await inputField.press('Shift+Enter')
        await inputField.type(promptObj.end, {
            delay: config.typeDelay,
            timeout: config.promptMaxLength * config.typeDelay,
        })
    }
    await inputField.press('Enter')
    

    // await page.waitForTimeout(config.waitResponseMilliseconds) // Wait for chat to reply
    await page.waitForTimeout(config.responseWaitDelay);

    // <div class="markdown prose w-full break-words dark:prose-invert light">
    const lastResponse = page.locator('div.group.w-full div.markdown.prose').last()

    let finished = false
    while (!finished) {
        await page.waitForTimeout(config.responseWaitDelay);
        const responseClass = await lastResponse.getAttribute('class')
        // logger.debug(responseClass)
        if (responseClass) {
            finished = !responseClass.includes('result-streaming')
        }
    }
    // const html = await lastResponse.evaluate(el => el.outerHTML)
    const output = await lastResponse.textContent()
    logger.debug(`response ${output}`)
    if (output) {
        return output
    } else {
        return ''
    }

    // await page.pause()
}

router.addDefaultHandler(async ({ enqueueLinks, page, log }) => {
    logger.info(`default handler`);
    await loginIfNecessary(page)
    await handleFirstTimeIfNecessary(page)

    let numInputWords = 0
    let numOutputWords = 0

    // let finished = false
    while(true) {
    // for (const prompt of prompts) {
        const promptObj = await readNextPrompt()
        if (promptObj == false) {
            logger.info('No outstanding prompt found in google sheets')
            const oneHour = 1000*60*60
            // finished = true
            break
        }
        logger.debug(JSON.stringify(promptObj))
        const statusRange = `B${promptObj.row}`
        await updatePrompt(statusRange, 'In Progress')
        // TODO option to get output from previous

        // const prompt = `${promptObj.start} ${config.middlePrompt} ${promptObj.end}`
        numInputWords += getNumWordsInPrompt(promptObj)
        logger.debug(`number of words input: ${numInputWords}`)
        
        promptObj.output = await promptChat(page, promptObj)
        await updatePrompt(`E${promptObj.row}`, promptObj.output)
        numOutputWords += getNumWords(promptObj.output)
        logger.debug(`number of words output: ${numOutputWords}`)

        
        // logger.debug(`finishing ${statusRange}`)
        await updatePrompt(statusRange, 'Done')
        await page.waitForTimeout(2*1000)
    }
    logger.info('Crawl finished')
});




router.addHandler('detail', async ({ request, page, log }) => {
    const title = await page.title();
    logger.info(`${title}`, { url: request.loadedUrl });

    await Dataset.pushData({
        url: request.loadedUrl,
        title,
    });
});

router.addHandler('rc', async ({ page, log }) => {
        // <div _ngcontent-ekp-c106="" id="nav-profile-button" role="button" aria-haspopup="true" aria-label="accountMenu" aria-controls="nav-profile-modal" tabindex="-1" class="nav-initials highlight__content ng-star-inserted" aria-expanded="true"><div _ngcontent-ekp-c106="" data-cs-mask="" class="nav-initials-text initials-menu ng-star-inserted">CH</div><!----><!----></div>
        const loginIcons = await page.locator('#rciHeaderUser').count()
        logger.debug(`login ${loginIcons}`)
    
    
    
        if (loginIcons > 0) {
            logger.info('logged in already')        
        } else {
            await page.click('a#rciHeaderSignIn')
            await page.getByLabel('Email address').type('colin.h.fun@hotmail.com', {delay: 100})
            await page.type('input#Password', 'a1singapore', {delay: 100})
            await page.getByRole('button', {name: 'sign in'}).click()
        } 
    
        await page.goto('https://www.royalcaribbean.com/sgp/en/cruises/?country=SGP&departureCode_SIN=true&itineraryPanel=SC04SIN-2921828537')    
        // await page.getByText(/3 Night Penang Cruise/i ).click()
    
        // extract text from .itinerary-panel-sailings-list-item
        const listItems = page.locator('.itinerary-panel-sailings-list div')
        for (var i=0; i < await listItems.count(); i=i+1) {
            const item = listItems.nth(i)
            const text = await item.textContent()
            logger.debug(`${i} ${text?text:'none'}`)
    
        }
})

router.addHandler('openai', async ({ request, page, log }) => {
    // login 
    await page.click('button.btn-primary')
    
    //input[type="email"]
    // windows live password
    await page.click( 'button[data-provider="windowslive"]')
    await page.type( 'input[type="email"]', 'colin.h.fun@hotmail.com')
    await page.click( 'input[type="submit"]')
    await page.type( 'input[type="password"]', 'Semantic2')
    await page.click( 'input[type="submit"]')
    await page.click( 'input[type="submit"]') // yes button to stay signed in

    const authFile = 'user.json';
    await page.context().storageState({ path: authFile });

    

    // for openai password
    // await page.type('input#username', 'colin.h.fun@hotmail.com')
    // await page.click('button[value="default"]')
    // await page.click('button[value="default"]')
    // await page.type('input#password', 'defineConfig')
    // await page.click('button[value="default"]')
    await page.click('button.btn-neutral') // Next
    await page.click('button.ml-auto') // Next
    await page.click('button.ml-auto') // Done

    await page.type( '#prompt-textarea', 'hello singapore!')

    // await Dataset.pushData({
    //     url: request.loadedUrl,
    //     title,
    // });
});
