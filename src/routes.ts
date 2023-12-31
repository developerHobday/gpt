import { Dataset, Log, createPlaywrightRouter } from 'crawlee';
import { Page } from 'playwright';
import { logger } from './logger.js'
import { config } from './config.js'
import { PromptObj, readNextPrompt, updatePrompt } from './google.js'

export const router = createPlaywrightRouter();

const loginIfNecessary = async(page: Page) => {
    await page.waitForTimeout(2000) // Wait for page to load fully
    const loginButtonLocator = page.getByRole('button', {name: 'Log in'})
    logger.debug(await loginButtonLocator.count())
    if (await loginButtonLocator.count() == 0) {
        logger.info('logged in to ChatGPT already')
        return    
    }
    logger.info(`start login ${config.login.type}`)
    

    await loginButtonLocator.click() 
    switch(config.login.type) {
        case 'gpt':
            await page.waitForTimeout(2000)
            const emailFieldLocatorGpt = page.locator('input#username')
            logger.debug(await emailFieldLocatorGpt.count())    
            if (await emailFieldLocatorGpt.count() != 0) {
                await emailFieldLocatorGpt.type( 
                    config.login.user, 
                    {delay: config.typeDelay}
                )        
                await page.getByRole('button', {
                    name : /Continue$/ 
                },).click()
                logger.debug('typed email')    
            }
            
            const passwordFieldLocatorGpt = page.locator('input#password')
            await passwordFieldLocatorGpt.click()
            await passwordFieldLocatorGpt.type( 
                config.login.password, 
                {delay: 500}
            )
            await page.getByRole('button', { // 4 elements
                name : /Continue$/ 
            },).click()     
            break;
            // TODO test
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
    const inputField = page.getByPlaceholder('Send a message')
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
    await page.waitForTimeout(config.responseWaitDelay);

    // <div class="markdown prose w-full break-words dark:prose-invert light">
    const lastResponse = page.locator('div.group.w-full div.markdown.prose').last()

    let finished = false
    logger.debug('Waiting for prompt reply')
    while (!finished) {
        await page.waitForTimeout(config.responseWaitDelay);
        const responseClass = await lastResponse.getAttribute('class')
        logger.silly(responseClass)
        if (responseClass) {
            if (!responseClass.includes('result-streaming')) {
                
                const continueGeneratingButton = page.locator(
                    'button').filter({hasText: 'Continue generating'})
                logger.silly(await continueGeneratingButton.count())
                if (await continueGeneratingButton.count() == 1) {
                    await continueGeneratingButton.click()
                    logger.debug('Click continue generating')
                    await page.waitForTimeout(config.responseWaitDelay);
                } else {
                    finished = true
                }
            }

        }
    }
    // const html = await lastResponse.evaluate(el => el.outerHTML)
    const output = await lastResponse.textContent()
    logger.silly(`response ${output}`)
    if (output) {
        return output
    } else {
        return ''
    }

    // await page.pause()
}

router.addDefaultHandler(async ({ page }) => {
    logger.info(`default handler`);
    await loginIfNecessary(page)
    await handleFirstTimeIfNecessary(page)

    let numInputWords = 0
    let numOutputWords = 0

    while(true) {
        const promptObj = await readNextPrompt()
        if (promptObj == false) {
            logger.info('No outstanding prompt found in google sheets')
            break
        }
        logger.debug(JSON.stringify(promptObj))
        const statusRange = `B${promptObj.row}`
        await updatePrompt(statusRange, 'In Progress')
        // TODO option to get output from previous

        numInputWords += getNumWordsInPrompt(promptObj)
        logger.debug(`Prompting with number of words input: ${numInputWords}`)
        
        promptObj.output = await promptChat(page, promptObj)
        await updatePrompt(`E${promptObj.row}`, promptObj.output)
        numOutputWords += getNumWords(promptObj.output)
        logger.debug(`number of words output: ${numOutputWords}`)

        await updatePrompt(statusRange, `Done at ${new Date().toISOString()}`)
        await page.waitForTimeout(2*1000)
    }
    logger.info('Crawl finished')
});