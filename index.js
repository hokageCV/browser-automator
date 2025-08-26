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

// const takeScreenShot = tool({
//   name: 'take_screenshot',
//   // Return base64 image
// });

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

// const openURL = tool({
//   name: 'open_url',
// });

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
  tools: [openBrowser, closeBrowser, waiter ]
});

async function main() {
  const user_query = `
    Open broser instance, stay for 2 seconds and close the instance.
  `;

  await run(websiteAutomationAgent, user_query)
}

main()
