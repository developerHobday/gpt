import * as fs from 'fs'
import * as yaml from 'js-yaml'


interface GoogleSheetColumnObj {
    number: number
    letter: string
    header: string    
}
interface Config {
    middlePrompt: string
    promptMaxLength: number
    waitResponseMilliseconds: number
    env: string
    login: {
        type: string
        user: string
        password: string
    }
    typeDelay: number
    responseWaitDelay: number

    googleSheets: {
        workbookId: string
        sheetName: string
        columns: {
            first: string,
            last: string,
            rowNum: GoogleSheetColumnObj
            status: GoogleSheetColumnObj
            startPrompt: GoogleSheetColumnObj
            endPrompt: GoogleSheetColumnObj
            output: GoogleSheetColumnObj                                    
        }
    }
}

let config:Config = {
    promptMaxLength: 10000,
    middlePrompt: '',
    waitResponseMilliseconds: 60*1000,
    env: 'development',
    login: {
        type: 'gpt',
        user: 'test',
        password: 'test',
    },
    typeDelay: 500,
    responseWaitDelay: 2000,
    googleSheets: {
        workbookId: '',
        sheetName: 'Sheet1',
        columns: {
            first: 'A',
            last: 'E',
            rowNum: {
                number: 0,
                letter: 'A',
                header: 'No',
            },
            status: {
                number: 1,
                letter: 'B',
                header: 'Status',
            },            
            startPrompt: {
                number: 2,
                letter: 'C',
                header: 'Start Prompt',
            },
            endPrompt: {
                number: 3,
                letter: 'D',         
                header: 'End Prompt',
            },
            output: {
                number: 4,
                letter: 'E',
                header: 'Output',
            }, 
        }
    }
}
try {
    // TODO async?
    const file = fs.readFileSync('./config.yaml', 'utf8')
    config = yaml.load(file) as Config
    console.debug(`Config \n${JSON.stringify(config)}`)
} catch(e) {
    console.warn(e)
}

export { config }