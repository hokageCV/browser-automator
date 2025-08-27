import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

import { chromium } from 'playwright';

const browser = await chromium.launch({
  headless: false,
  chromiumSandbox: true,
  env: {},
  args: ['--disable-extensions', '--disable-file-system'],
});

let page = undefined;

const takeScreenShot = tool({
  name: 'take_screenshot',
  description: 'take screenshot of existing page, and send a base64 image',
  parameters: z.object({}),
  async execute() {
    const base64Image = await page.screenshot({
      encoding: 'base64',
      path: `${Date.now()}.png`,
    });

    return base64Image;
  }
});

const openBrowser = tool({
  name: 'open_browser',
  description: 'open a browser instance.',
  parameters: z.object({}),
  async execute(){
    page = await browser.newPage();
    return 'Browser opened';
   }
});

const closeBrowser = tool({
  name: 'close_browser',
  description: 'closes the opened browser instance',
  parameters: z.object({}),
  async execute() {
    await browser.close();
    return 'Browser closed';
  }
})

const waiter = tool({
  name: 'wait_seconds',
  description: 'wait for N seconds',
  parameters: z.object({ seconds: z.number() }),
  async execute({ seconds }) {
    await page.waitForTimeout(seconds * 1000);
    return `Waited ${seconds} seconds`;
  }
});

const goToAddressBar = tool({
  name: 'go_to_address_bar',
  description: 'go to address bar',
  parameters: z.object({}),
  async execute() {
    await page.keyboard.press('Control+K');
  }
})

const openUrl = tool({
  name: 'open_url',
  description: 'open given url',
  parameters: z.object({
    url: z.string(),
  }),
  async execute({ url }) {
    if (!page) throw new Error("No browser page open. Call 'open_browser' first.")
    await page.goto(url);
    return `Navigated to ${url}`;
  }
});

// const clickOnScreen = tool({
//   name: 'click_screen',
//   description: 'Clicks on the screen with specified co-ordinates',
//   parameters: z.object({
//     x: z.number().describe('x axis on the screen where we need to click'),
//     y: z.number().describe('Y axis on the screen where we need to click'),
//   }),
//   async execute(input) {
//     input.x;
//     input.y;
//     page.mouse.click(input.x, input.y);
//   },
// });

// const sendKeys = tool({
//   name: 'send_keys',
// });

// Double Click, Scroll

const websiteAutomationAgent = new Agent({
  name: 'WebSite Automation Agent',
  model: process.env.MODEL,
  instructions: `
  You are a browser automation agent. You work on finishing the given task using available tools.
  `,

  tools: [
    openBrowser, closeBrowser, waiter, takeScreenShot,
    goToAddressBar, openUrl,
  ]
});

async function main() {
  const user_query = `
    i want to go to site https://ui.chaicode.com/auth-sada/signup  .
    wait for 15s, then close the browser.
  `;

  const screenshot_instructions = `
    Rules:
    - Always call the 'take_screenshot' tool after each step to see what is happening on the screen.
    - After taking screenshot, plan the next action what needs to be done.
  `

  const result = await run(websiteAutomationAgent, user_query)
  // console.log('DBG:', result.history);
}

main()
