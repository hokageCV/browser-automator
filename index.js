import { Agent, run, tool } from '@openai/agents';
import { z } from 'zod';

import { chromium } from 'playwright';

let database = []

const browser = await chromium.launch({
  headless: false,
  chromiumSandbox: true,
  env: {},
  args: ['--disable-extensions', '--disable-file-system'],
});

let page = await browser.newPage()

const takeScreenShot = tool({
  name: 'take_screenshot',
  description: 'take screenshot of existing page, and send a base64 image. can be used to find location of selectors in screen.',
  parameters: z.object({}),
  async execute() {
    if (!page) throw new Error("No browser page open. Call 'open_browser' first.")
    console.log('Taking a screen shot');
    const base64Image = await page.screenshot({
      encoding: 'base64',
    });

    return `Returned base64 image: ${base64Image} `;
  }
});

const openBrowser = tool({
  name: 'open_browser',
  description: 'open a browser instance.',
  parameters: z.object({}),
  async execute(){
    console.log('Opening the browser page');
    page = await browser.newPage();
    return 'Browser opened';
   }
});

const closeBrowser = tool({
  name: 'close_browser',
  description: 'closes the opened browser instance',
  parameters: z.object({}),
  async execute() {
    console.log('Closing the browser');
    await browser.close();
    return 'Browser closed';
  }
})

const waiter = tool({
  name: 'wait_seconds',
  description: 'wait for N seconds',
  parameters: z.object({ seconds: z.number() }),
  async execute({ seconds }) {
    if (!page) throw new Error("No browser page open. Call 'open_browser' first.")
    console.log(`Waiting for ${seconds} seconds`);
    await page.waitForTimeout(seconds * 1000);
    return `Waited ${seconds} seconds`;
  }
});

const openUrl = tool({
  name: 'open_url',
  description: 'open given url',
  parameters: z.object({
    url: z.string(),
  }),
  async execute({ url }) {
    if (!page) throw new Error("No browser page open. Call 'open_browser' first.")
    console.log(`Navigating to ${url}.`);
    await page.goto(url);
    return `Navigated to ${url}`;
  }
});

const typeText = tool({
  name: 'type_text',
  description: 'Type text into a given selector, character by character. waiter tool must be called after this one.',
  parameters: z.object({
    selector: z.string(),
    text: z.string(),
  }),
  async execute({ selector, text }) {
    if (!page) throw new Error("No browser page open. Call 'open_browser' first.")
    console.log(`Typing ${text} into ${selector}.`);
    const delay = 80
    await page.type(selector, text, { delay });
    return `Typed "${text}" into ${selector}`;
  }
});

const clickByText = tool({
  name: 'click_by_text',
  description: 'Clicks an element by visible on-screen text.',
  parameters: z.object({
    text: z.string().describe('The visible text of the element to click'),
  }),
  async execute({ text }) {
    if (!page) throw new Error("No page is open. Call open_browser first.");

    const selector = `text=${text}`;
    await page.waitForSelector(selector, { state: 'visible' });
    console.log(`Clicking on element for ${text}`);
    await page.click(selector);

    return `Clicked element with text: "${text}"`;
  }
});

const discoverElements = tool({
  name: 'discover_form_elements',
  description: 'Discover input and button elements inside <form>, with their labels and best selectors',
  parameters: z.object({}),
  async execute({}) {
    if (!page) throw new Error("No page is open. Call open_browser first.");
    const limit = 50

    console.log("Parsing page's elements.");
    const elements = await page.$$eval(
      'form input, form button, form textarea, form select',
      nodes =>
        nodes.map(n => {
          const label =
            n.getAttribute('id') ||
            n.getAttribute('name') ||
            n.getAttribute('placeholder') ||
            n.getAttribute('aria-label') ||
            n.innerText?.trim() ||
            'unnamed';

          let selector = null;
          if (n.id) {
            selector = `#${n.id}`;
          } else if (n.getAttribute('name')) {
            selector = `[name="${n.getAttribute('name')}"]`;
          } else if (n.getAttribute('placeholder')) {
            selector = `[placeholder="${n.getAttribute('placeholder')}"]`;
          } else if (n.innerText?.trim()) {
            selector = `text=${n.innerText.trim().slice(0, 30)}`;
          }

          return {
            tag: n.tagName.toLowerCase(),
            type: n.getAttribute('type') || 'unknown',
            label,
            selector,
          };
        })
    );

    return JSON.stringify(elements.slice(0, limit), null, 2);
  }
});

const websiteAutomationAgent = new Agent({
  name: 'WebSite Automation Agent',
  model: process.env.MODEL,
  instructions: `
  You are a browser automation agent. You will be given a task by user. You have to finish the given task using available tools. Break down the tasks into actionable steps. Retry until you achieve the given task.

    Rules:
    - use waiter tool between each tool call. wait for 3 seconds.
    - think of each next actionable step carefully. no wasted actions.
    - for navigation, use elements present on screen.
    - once you reach target page, you can use parse the page to get the selectors.
    - once the task is achieved, close the browser.
    - Never call tools in parallel.
    - Always finish one tool call and wait for the result before planning the next.
  `,

  tools: [
    closeBrowser, waiter,
    openUrl, typeText, clickByText, discoverElements
  ]
});

async function main() {
  const user_query = `
    user_details:
      - first name: Levi
      - last name: Ackerman
      - email: levi@scouts.aot
      - password: bringMeZeke

    Go to site https://ui.chaicode.com .
    and then navigate to sign up page. There you will see a sign up form.
    type the above details in appropriate input boxes of the form. do confirm the password if needed. then create account.

  `;


  const result = await run(
    websiteAutomationAgent,
    database.concat({ role: 'user', content: user_query }),
    {
      maxTurns: 20,
    }
  )
  console.log('DBG:', result.history);
}

main()
