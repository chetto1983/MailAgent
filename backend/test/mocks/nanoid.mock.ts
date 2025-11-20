/**
 * Mock for nanoid ESM module
 * nanoid v5+ is pure ESM and doesn't work well with Jest/ts-jest
 * This mock provides a simple implementation for testing
 */

export const nanoid = jest.fn(() => {
  // Generate a random string similar to nanoid format
  // nanoid default length is 21 characters
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789_-';
  let id = '';
  for (let i = 0; i < 21; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
});

export const customAlphabet = jest.fn((alphabet: string, size: number) => {
  return jest.fn(() => {
    let id = '';
    for (let i = 0; i < size; i++) {
      id += alphabet.charAt(Math.floor(Math.random() * alphabet.length));
    }
    return id;
  });
});
