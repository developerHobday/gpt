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

Cron job 


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
1. 

2. `npm install`

3. Install libraries for playwright  `npx playwright install-deps`


## TroubleShooting

* If there are no logs on the console for some time, the program may have hanged.
Press Ctrl-C to terminate the program.
Restarting it (`npm start`) should resume the program

* If ChatGPT doesn't log out
Remove all browser data (`rm -rf context`)

* If running in headful mode (browser showing),
do not restore old tabs
