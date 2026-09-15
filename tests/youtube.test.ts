import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseYouTubeId } from '../src/lib/youtube';

test('reads the id from every link shape the creator actually pastes', () => {
  const id = 'dQw4w9WgXcQ';
  for (const link of [
    id,
    `https://www.youtube.com/watch?v=${id}`,
    `https://youtube.com/watch?v=${id}&t=42s`,
    `https://m.youtube.com/watch?v=${id}`,
    `https://youtu.be/${id}`,
    `https://youtu.be/${id}?si=abc123`,
    `https://www.youtube.com/shorts/${id}`,
    `https://www.youtube.com/embed/${id}`,
    `https://www.youtube.com/live/${id}`,
    `  https://www.youtube.com/watch?v=${id}  `,
    `youtube.com/watch?v=${id}`,
  ]) {
    assert.equal(parseYouTubeId(link), id, `falhou em: ${link}`);
  }
});

test('refuses anything that is not a YouTube video link', () => {
  for (const link of [
    '',
    '   ',
    'não é um link',
    'https://vimeo.com/123456789',
    'https://www.youtube.com/@KauaArtx',
    'https://www.youtube.com/watch?v=curto',
    'https://www.youtube.com/watch?list=PLabcdefghij',
    'https://evil.example/youtube.com/watch?v=dQw4w9WgXcQ',
    'https://youtu.be/',
  ]) {
    assert.equal(parseYouTubeId(link), null, `deveria recusar: ${link}`);
  }
});

test('ids are exactly eleven safe characters', () => {
  assert.equal(parseYouTubeId('https://youtu.be/abc-DEF_123'), 'abc-DEF_123');
  assert.equal(parseYouTubeId('https://youtu.be/abc-DEF_1234'), null);
  assert.equal(parseYouTubeId('https://youtu.be/abc DEF_123'), null);
});
