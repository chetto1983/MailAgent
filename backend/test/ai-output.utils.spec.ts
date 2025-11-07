import { parseArrayFromAiPayload } from '../src/modules/ai/utils/ai-output.utils';

describe('AI output utils', () => {
  it('parses plain JSON payload', () => {
    const payload = '{"replies":["Thanks for the update","I will review it"]] }';
    const result = parseArrayFromAiPayload(payload, 'replies');
    expect(result).toEqual(['Thanks for the update', 'I will review it']);
  });

  it('parses fenced JSON payload with chatter', () => {
    const payload = `
Great question! Here are some potential replies:

\`\`\`json
{
  "replies": [
    "Grazie, ho ricevuto tutte le informazioni.",
    "Perfetto, procediamo.",
    "Possiamo fare un punto domani mattina?"
  ]
}
\`\`\`

Let me know if you need more help.
`;

    const result = parseArrayFromAiPayload(payload, 'replies');
    expect(result).toEqual([
      'Grazie, ho ricevuto tutte le informazioni.',
      'Perfetto, procediamo.',
      'Possiamo fare un punto domani mattina?',
    ]);
  });

  it('parses replies returned as objects', () => {
    const payload = `{
      "replies": [
        { "subject": "Re: New sign-in detected", "body": "Thanks, I just logged in from a new device." },
        { "body": "This looks suspicious, please block the attempt." }
      ]
    }`;

    const result = parseArrayFromAiPayload(payload, 'replies');
    expect(result).toEqual([
      'Re: New sign-in detected\n\nThanks, I just logged in from a new device.',
      'This looks suspicious, please block the attempt.',
    ]);
  });

  it('falls back to empty array when JSON missing', () => {
    const payload = 'No structured data here.';
    const result = parseArrayFromAiPayload(payload, 'replies');
    expect(result).toEqual([]);
  });
});
