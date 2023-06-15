import { promises } from 'fs'
const fs = promises
import * as path from 'path'
import * as process from 'process'
import { authenticate } from '@google-cloud/local-auth'
import { google } from 'googleapis'
import { config } from './config.js'
import { JSONClient } from 'google-auth-library/build/src/auth/googleauth.js'
import { OAuth2Client } from 'google-auth-library';


// If modifying these scopes, delete token.json.
// const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
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
  const res = await sheetsApi.spreadsheets.values.get({
    spreadsheetId: config.googleSheetId,
    range: 'Sheet1!A2:E',
  });
  const rows = res.data.values;
  if (!rows || rows.length === 0) {
    console.log();
    throw Error('No data found in Google Sheet.')
  }
  return rows
}

const authClient = await authorize() as OAuth2Client


export const updatePrompt = async (range:string, value:string ) => {
  try {
    const sheetsApi = google.sheets({version: 'v4', auth:authClient});
    const res = await sheetsApi.spreadsheets.values.update({
        spreadsheetId: config.googleSheetId,
        range,
        valueInputOption: "RAW",
        requestBody: {
          range,
          values: [[value]]
        }
      }
    )
    const response = res.data
    console.log(JSON.stringify(response, null, 2))

  } catch(e) {
    console.error(e)
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

export const readNextPrompt = async () => {
  try {

    const rows = await readAutomationSheet(authClient)
    //TODO check the columns

    let i = 1
    for (const row of rows) {
      i += 1
      // console.log(i, row)
      const status = row[1] as string
      if (status.toUpperCase() == 'DONE') {
        continue
      }
      const prompt: PromptObj = {
        row : i,
        rowNum: row[0],
        start: row[2],
        middle: config.middlePrompt,
        end: row[3],
        output: undefined
      }
      // if (!prompt.start) {
      //   prompt.start = ''
      // }
      // if (!prompt.end) {
      //   prompt.end = ''
      // }
      // console.log(output)
      return prompt
    }
    return false
  } catch(e) {
    console.error(e)
    throw e
  }
}
// await read()
// authorize().then(listMajors).catch(console.error);

