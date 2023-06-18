# ChatGPT Automation

This project allows automation of GPT
1. Uses Playwright to launch Chrome browser and login to ChatGPT
2. Iteratively reads prompts from Google Sheets
3. Enters the prompt into ChatGPT
4. Uses Crawlee to wait for ChatGPT to give the full response and extract it
3. Update the result and status to Google Sheet 

*Requirements*
2GB Free RAM
Node.js v16+ - see installation instructions below
Chrome browser

## Running

`npm start`

For the first time running, Google will require you to allow access to Google Sheets.
The program will open a Google authorization web page.
Login and allow Google access to Google sheets.


*Cron job* 
crontab -e 
7 * * * * node /home/ubuntu/project/gpt/dist/main.js
to run on the 7th min every hour, every day


## Installation of Node.js on Windows 11

1. Install VsCode - https://code.visualstudio.com/docs/setup/windows
Download https://go.microsoft.com/fwlink/?LinkID=534107

2. Install WSL - https://learn.microsoft.com/en-us/windows/wsl/install
In Powershell as Admin, `wsl --install`

3. Install Node.js LTS using nvm - https://github.com/nvm-sh/nvm#installing-and-updating
```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.3/install.sh | bash
nvm install --lts
```
Playwright needs at least Node v16

4. Install chrome browser https://playwright.dev/docs/browsers#google-chrome--microsoft-edge
`npx playwright install --help`


## Installation of Node dependencies
1. Clone from git git@github.com:developerHobday/gpt.git

2. `npm install`

3. Install libraries for playwright  `npx playwright install-deps`

4. Update passwords
- config.yaml with GPT password
- Google credentials.json

5. Build `npm run build`


## Configuration

Configurations can be updated in config.yaml


## TroubleShooting

* If there are no logs on the console for some time, the program may have hanged.
Press Ctrl-C to terminate the program.
Restarting it (`npm start`) should resume the program

* If ChatGPT doesn't log out
Remove all browser data (`rm -rf context`)

* do not restore old tabs if browser crashes

* Getting 403 from chat.openai.com
Copy in the context into the dist folder

* ERROR PlaywrightCrawler: Request failed and reached maximum retries. requestHandler timed out after X seconds
Increase maxRuntimeSeconds in config.yaml
However, it should not be anywhere near 1 hour if it is regularly running on an hourly cron.