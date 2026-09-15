import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cascadeTimeline, changedBlocks, MIN_BLOCK_SECONDS } from '../src/lib/timeline';

const line = () => [
  { id: 'a', order: 0, startSeconds: 0, endSeconds: 30 },
  { id: 'b', order: 1, startSeconds: 30, endSeconds: 45 },
  { id: 'c', order: 2, startSeconds: 45, endSeconds: 60 },
];

const ranges = (blocks: { startSeconds: number; endSeconds: number }[]) =>
  blocks.map(block => [block.startSeconds, block.endSeconds]);

test('moving the end of a block pushes the following ones, keeping each duration', () => {
  const result = cascadeTimeline(line(), 'a', { endSeconds: 42 });
  assert.deepEqual(ranges(result), [[0, 42], [42, 57], [57, 72]]);
});

test('pulling an end backwards pulls the rest back too', () => {
  const result = cascadeTimeline(line(), 'a', { endSeconds: 10 });
  assert.deepEqual(ranges(result), [[0, 10], [10, 25], [25, 40]]);
});

test('editing a start moves the boundary with the previous block', () => {
  const result = cascadeTimeline(line(), 'b', { startSeconds: 20 });
  assert.deepEqual(ranges(result), [[0, 20], [20, 35], [35, 50]]);
});

test('the last block can grow without disturbing anyone', () => {
  const result = cascadeTimeline(line(), 'c', { endSeconds: 90 });
  assert.deepEqual(ranges(result), [[0, 30], [30, 45], [45, 90]]);
});

test('a block never collapses to zero or runs backwards', () => {
  assert.deepEqual(ranges(cascadeTimeline(line(), 'a', { endSeconds: 0 })), [[0, MIN_BLOCK_SECONDS], [1, 16], [16, 31]]);
  const squeezed = cascadeTimeline(line(), 'b', { startSeconds: 0 });
  assert.equal(squeezed[0].endSeconds, MIN_BLOCK_SECONDS);
  assert.equal(squeezed[1].startSeconds, MIN_BLOCK_SECONDS);
  assert.ok(squeezed.every(block => block.endSeconds > block.startSeconds));
});

test('negative, broken and fractional input never reaches the timeline', () => {
  assert.deepEqual(ranges(cascadeTimeline(line(), 'a', { endSeconds: -20 })), [[0, MIN_BLOCK_SECONDS], [1, 16], [16, 31]]);
  assert.deepEqual(ranges(cascadeTimeline(line(), 'a', { endSeconds: 20.7 })), [[0, 20], [20, 35], [35, 50]]);
  assert.deepEqual(ranges(cascadeTimeline(line(), 'a', { endSeconds: Number.NaN })), [[0, MIN_BLOCK_SECONDS], [1, 16], [16, 31]]);
});

test('the first block may start away from zero and drags the rest', () => {
  const result = cascadeTimeline(line(), 'a', { startSeconds: 5 });
  assert.deepEqual(ranges(result), [[5, 35], [35, 50], [50, 65]]);
});

test('blocks out of order are repaired by order, not by array position', () => {
  const shuffled = [
    { id: 'c', order: 2, startSeconds: 45, endSeconds: 60 },
    { id: 'a', order: 0, startSeconds: 0, endSeconds: 30 },
    { id: 'b', order: 1, startSeconds: 30, endSeconds: 45 },
  ];
  const result = cascadeTimeline(shuffled, 'a', { endSeconds: 40 });
  assert.deepEqual(result.map(block => block.id), ['a', 'b', 'c']);
  assert.deepEqual(ranges(result), [[0, 40], [40, 55], [55, 70]]);
});

test('an unknown id leaves the timeline untouched', () => {
  assert.deepEqual(ranges(cascadeTimeline(line(), 'sumiu', { endSeconds: 5 })), [[0, 30], [30, 45], [45, 60]]);
});

test('only the blocks that actually moved are written back', () => {
  const before = line();
  assert.deepEqual(changedBlocks(before, cascadeTimeline(before, 'c', { endSeconds: 90 })).map(b => b.id), ['c']);
  assert.deepEqual(changedBlocks(before, cascadeTimeline(before, 'a', { endSeconds: 42 })).map(b => b.id), ['a', 'b', 'c']);
  assert.deepEqual(changedBlocks(before, cascadeTimeline(before, 'a', { endSeconds: 30 })), []);
});
