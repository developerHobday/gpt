import { promises } from 'fs'
const fs = promises
import * as path from 'path'
import * as process from 'process'
import { authenticate } from '@google-cloud/local-auth'
import { google } from 'googleapis'
import { config } from './config.js'
import { OAuth2Client } from 'google-auth-library';
import { logger } from './logger.js'

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
const TOKEN_PATH = path.join(process.cwd(), 'token.json');
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');

/**
 * Reads previously authorized credentials from the save file.
 *
 * @return {Promise<OAuth2Client|null>}
 */
async function loadSavedCredentialsIfExist() {
  try {
    const content = await fs.readFile(TOKEN_PATH);
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file comptible with GoogleAUth.fromJSON.
 *
 * @param {OAuth2Client} client
 * @return {Promise<void>}
 */
async function saveCredentials(client) {
  const content = await fs.readFile(CREDENTIALS_PATH);
  const keys = JSON.parse(content);
  const key = keys.installed || keys.web;
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: key.client_id,
    client_secret: key.client_secret,
    refresh_token: client.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or request or authorization to call APIs.
 *
 */
async function authorize() {
  const jsonClient = await loadSavedCredentialsIfExist();
  if (jsonClient) {
    return jsonClient;
  }
  const oauth2client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (oauth2client.credentials) {
    await saveCredentials(oauth2client);
  }
  return oauth2client;
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
async function listMajors(auth: OAuth2Client) {
  const sheets = google.sheets({version: 'v4', auth});
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    range: 'Class Data!A2:E',
  });
  const rows = res.data.values;
  if (!rows || rows.length === 0) {
    console.log('No data found.');
    return;
  }
  console.log('Name, Major:');
  rows.forEach((row) => {
    // Print columns A and E, which correspond to indices 0 and 4.
    console.log(`${row[0]}, ${row[4]}`);
    console.log(row)
  });
}

async function readAutomationSheet(auth: OAuth2Client): Promise<string[][]> {
  const sheetsApi = google.sheets({version: 'v4', auth});
  const columnRange = `${config.googleSheets.columns.first}1:${config.googleSheets.columns.last}`
  const res = await sheetsApi.spreadsheets.values.get({
    spreadsheetId: config.googleSheets.workbookId,
    range: `${config.googleSheets.sheetName}!${columnRange}`,
  });
  const rows = res.data.values;
  if (!rows || rows.length === 0) {
    throw Error('No data found in Google Sheet.')
  }
  return rows
}

const authClient = await authorize() as OAuth2Client


export const updatePrompt = async (range:string, value:string ) => {
  try {
    const sheetsApi = google.sheets({version: 'v4', auth:authClient});
    const res = await sheetsApi.spreadsheets.values.update({
        spreadsheetId: config.googleSheets.workbookId,
        range,
        valueInputOption: "RAW",
        requestBody: {
          range,
          values: [[value]]
        }
      }
    )
    const response = res.data
    logger.silly(`updatePrompt done ${JSON.stringify(response, null, 2)}`)

  } catch(e) {
    logger.error(e)
    throw e
  }
}

export interface PromptObj {
  row: number
  start: string
  middle: string
  end: string
  rowNum: string
  output: string
}

const checkColumns = (row: string[]) => {
  let check = true
  if (row[config.googleSheets.columns.rowNum.number] !=
    config.googleSheets.columns.rowNum.header) {
      check = false
      logger.warn(`Unexpected header found for rowNum: ${row[config.googleSheets.columns.rowNum.number]}`)
  }
  if (row[config.googleSheets.columns.status.number] !=
    config.googleSheets.columns.status.header) {
      check = false
      logger.warn(`Unexpected header found for status: ${row[config.googleSheets.columns.status.number]}`)
  }
  if (row[config.googleSheets.columns.startPrompt.number] !=
    config.googleSheets.columns.startPrompt.header) {
      check = false
      logger.warn(`Unexpected header found for startPrompt: ${row[config.googleSheets.columns.startPrompt.number]}`)
  }
  if (row[config.googleSheets.columns.endPrompt.number] !=
    config.googleSheets.columns.endPrompt.header) {
      check = false
      logger.warn(`Unexpected header found for endPrompt: ${row[config.googleSheets.columns.endPrompt.number]}`)
  }
  if (row[config.googleSheets.columns.output.number] !=
    config.googleSheets.columns.output.header) {
      check = false
      logger.warn(`Unexpected header found for output: ${row[config.googleSheets.columns.output.number]}`)
  }  
  if (!check) {
    throw Error('Invalid Columns')
  }
}

export const readNextPrompt = async () => {
  try {
    const rows = await readAutomationSheet(authClient)
    let i = 0
    for (const row of rows) {
      i += 1
      // console.log(i, row)
      if (i == 1) {
        checkColumns(row)
        continue
      }

      const status = row[config.googleSheets.columns.status.number] as string
      if (status.toUpperCase().includes('DONE')) {
        continue
      }
      console.debug(`Next prompt is at row ${i}`)
      const prompt: PromptObj = {
        row : i,
        rowNum: row[config.googleSheets.columns.rowNum.number],
        start: row[config.googleSheets.columns.startPrompt.number],
        middle: config.middlePrompt,
        end: row[config.googleSheets.columns.endPrompt.number],
        output: row[config.googleSheets.columns.output.number]
      }
      // console.log(output)
      return prompt
    }
    return false
  } catch(e) {
    logger.error(e)
    throw e
  }
}


