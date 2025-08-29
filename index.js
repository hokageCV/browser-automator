import { run } from '@openai/agents';
import websiteAutomationAgent from './agent.js';

let database = []

async function main() {
  const user_query = `
    user_details:
      - first name: Levi
      - last name: Ackerman
      - email: levi@scouts.aot
      - password: bringMeZeke

    Go to site https://ui.chaicode.com .
    and then navigate to sign up page. There you will see a sign up form.
    type the above details in appropriate input boxes of the form. do confirm the password if needed. then create account. that's it.
  `;

  const result = await run(
    websiteAutomationAgent,
    database.concat({ role: 'user', content: user_query }),
    {
      maxTurns: 20,
    }
  )
}

main()
