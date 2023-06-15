import * as fs from 'fs'
import * as yaml from 'js-yaml'


interface Config {
    prompts: Array<string>
    waitResponseMilliseconds: number
    env: string
    login: {
        type: string
        user: string
        password: string
    }
    typeDelay: number
    responseWaitDelay: number
    googleSheetId: string
}

let config:Config = {
    prompts: ['hello'],
    waitResponseMilliseconds: 60*1000,
    env: 'development',
    login: {
        type: 'gpt',
        user: 'test',
        password: 'test',
    },
    typeDelay: 500,
    responseWaitDelay: 2000,
    googleSheetId: ''
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