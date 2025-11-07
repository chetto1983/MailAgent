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

  it('falls back to empty array when JSON missing', () => {
    const payload = 'No structured data here.';
    const result = parseArrayFromAiPayload(payload, 'replies');
    expect(result).toEqual([]);
  });
});
