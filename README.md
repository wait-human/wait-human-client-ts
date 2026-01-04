# WaitHuman Client

Library to utilize WaitHuman's services.

## Installation

```bash
npm install @wait-human/client
```

## Usage

```typescript
import { WaitHuman } from "@wait-human/client";

const waitHuman = new WaitHuman({
    apiKey: "YOUR_API_KEY",
});

// Example: Multiple Choice Question
const answer = await waitHuman.askMultipleChoice({
    subject: "Send invoice?",
    body: "Customer asked for a 3-page website. is 500$ ok?",
    choices: ["yes, send", "no"],
});

if (answer == "yes, send") {
    console.log(`Send!`);
} else {
    console.log(`wait...`);
}
```

## Other Methods

### Free Text

You can also ask for open-ended input:

```typescript
const feedback = await waitHuman.askFreeText({
    subject: "User Feedback",
    body: "Please explain why you rejected the invoice.",
});
console.log(feedback);
```
