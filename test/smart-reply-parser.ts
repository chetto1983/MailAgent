/**
 * Quick regression harness to ensure smart-reply parsing keeps working.
 * Run with: cd backend && npx ts-node ../test/smart-reply-parser.ts
 */

import { EmailInsightsService } from '../backend/src/modules/ai/services/email-insights.service';
import { parseArrayFromAiPayload } from '../backend/src/modules/ai/utils/ai-output.utils';

interface ParsingCase {
  name: string;
  payload: string;
  expectedLength: number;
  expectedFragments: string[];
}

const parsingCases: ParsingCase[] = [
  {
    name: 'Structured JSON array with reply objects',
    payload: `{
      "replies": [
        {
          "subject": "Re: Pricing follow-up",
          "body": "Thanks for the quote. I'll confirm with finance and reply by tomorrow."
        },
        {
          "reply": "Appreciate the update—let's sync on Wednesday if that works."
        }
      ]
    }`,
    expectedLength: 2,
    expectedFragments: ['Pricing follow-up', 'sync on Wednesday'],
  },
  {
    name: 'Payload wrapped in prose with markdown fence',
    payload: `Sure thing:
    \`\`\`json
    {
      "subject": "Next steps",
      "replies": [
        "Thanks for the heads up. I'll review the contract and reply by EOD.",
        "Let's schedule a call tomorrow to clarify the open items."
      ]
    }
    \`\`\`
    `,
    expectedLength: 2,
    expectedFragments: ['review the contract', 'schedule a call'],
  },
  {
    name: 'Array emitted inline without closing prose',
    payload: `"replies": [
      {
        "message": "Appreciate the reminder—consider it handled."
      },
      "Thanks, I just processed the invoice. Let me know if you need anything else."
    ]`,
    expectedLength: 2,
    expectedFragments: ['reminder', 'processed the invoice'],
  },
];

type FormatCase = {
  name: string;
  input: string[];
  expectedFragments: string[];
};

const formatCases: FormatCase[] = [
  {
    name: 'JSON fragments converted to human text',
    input: [
      `"subject": "Timeline update"\\n"body": "We can deliver the beta next Monday if the API keys arrive today."`,
      `{
        "reply": "Understood. I'll loop the legal team in and share the signed agreement ASAP."
      }`,
      'Thanks! I received the PO and will ship once accounting gives me the go-ahead.',
    ],
    expectedFragments: ['Timeline update', 'legal team', 'received the PO'],
  },
  {
    name: 'Duplicate replies collapsed',
    input: [
      'Perfect, I will publish the campaign tomorrow morning.',
      'perfect, I will publish the campaign tomorrow morning.',
    ],
    expectedFragments: ['publish the campaign'],
  },
];

const service = new EmailInsightsService({} as any, {} as any);
const formatSmartReplyCandidates = (service as any).formatSmartReplyCandidates.bind(service) as (
  value: string[],
) => string[];

const assert = (condition: unknown, message: string) => {
  if (!condition) {
    throw new Error(message);
  }
};

parsingCases.forEach((testCase) => {
  const parsed = parseArrayFromAiPayload(testCase.payload, 'replies');
  assert(
    parsed.length === testCase.expectedLength,
    `[parse] ${testCase.name}: expected length ${testCase.expectedLength}, received ${parsed.length}`,
  );

  const formatted = formatSmartReplyCandidates(parsed);
  testCase.expectedFragments.forEach((fragment) => {
    assert(
      formatted.some((reply) => reply.toLowerCase().includes(fragment.toLowerCase())),
      `[parse] ${testCase.name}: fragment "${fragment}" missing in ${JSON.stringify(formatted)}`,
    );
  });
  // eslint-disable-next-line no-console
  console.log(`✅ ${testCase.name}`);
});

formatCases.forEach((testCase) => {
  const formatted = formatSmartReplyCandidates(testCase.input);
  testCase.expectedFragments.forEach((fragment) => {
    assert(
      formatted.some((reply) => reply.toLowerCase().includes(fragment.toLowerCase())),
      `[format] ${testCase.name}: fragment "${fragment}" missing in ${JSON.stringify(formatted)}`,
    );
  });
  // eslint-disable-next-line no-console
  console.log(`✅ ${testCase.name}`);
});

// eslint-disable-next-line no-console
console.log('Smart reply parser harness completed successfully.');
