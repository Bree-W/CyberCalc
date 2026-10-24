import assert from 'node:assert/strict';
import test from 'node:test';
import { MAX_CONTENT_LENGTH, POLL_DEADLINE_MS, UPLOADS_PER_MINUTE } from './constants.ts';
import { detectAllowedImage, filenameForImage } from './magic-bytes.ts';
import { allowUpload, resetUploadLimits } from './rate-limit.ts';
import { redactSecret } from './redact.ts';
import { firstExtractedText, sanitizeResults } from './results.ts';
import { isSubmissionHash, pollExpired, rememberSubmission, resetSubmissions, submissionStartedAt } from './submissions.ts';

test('upload cap is the flask byte value', () => {
  assert.equal(MAX_CONTENT_LENGTH, 3145728);
});

test('magic-byte allowlist accepts the documented signatures and rejects others', () => {
  assert.equal(detectAllowedImage(Uint8Array.of(0x89, 0x50, 0x4e, 0x47, 0x0d)), 'png');
  assert.equal(detectAllowedImage(Uint8Array.of(0xff, 0xd8, 0xff, 0x00)), 'jpeg');
  assert.equal(detectAllowedImage(Uint8Array.of(0x47, 0x49, 0x46, 0x38, 0x39)), 'gif');
  const webp = new Uint8Array(12);
  webp.set([0x52, 0x49, 0x46, 0x46], 0);
  webp.set([0x57, 0x45, 0x42, 0x50], 8);
  assert.equal(detectAllowedImage(webp), 'webp');
  assert.equal(detectAllowedImage(Uint8Array.of(0x42, 0x4d, 0x00)), 'bmp');
  assert.equal(detectAllowedImage(Uint8Array.of(0x49, 0x49, 0x2a, 0x00)), 'tiff');
  assert.equal(detectAllowedImage(Uint8Array.of(0x4d, 0x4d, 0x00, 0x2a)), 'tiff');
  assert.equal(detectAllowedImage(Uint8Array.of(0x4d, 0x5a)), null);
  assert.equal(detectAllowedImage(new Uint8Array()), null);
  assert.equal(filenameForImage('../etc/passwd', 'png'), 'upload.png');
  assert.equal(filenameForImage('example1.png', 'png'), 'example1.png');
});

test('rate limit allows ten uploads per minute for one key', () => {
  resetUploadLimits();
  const start = 1_000_000;
  for (let i = 0; i < UPLOADS_PER_MINUTE; i++) {
    assert.equal(allowUpload('203.0.113.5', start + i), true);
  }
  assert.equal(allowUpload('203.0.113.5', start + 20), false);
  assert.equal(allowUpload('203.0.113.9', start + 20), true);
  assert.equal(allowUpload('203.0.113.5', start + 60_000), true);
});

test('password is stripped from messages', () => {
  assert.equal(redactSecret('failed for hunter2 and hunter2', 'hunter2'), 'failed for [redacted] and [redacted]');
  assert.equal(redactSecret('untouched', undefined), 'untouched');
  assert.equal(redactSecret('untouched', ''), 'untouched');
});

test('results drop file urls and keep text', () => {
  const clean = sanitizeResults({
    strings: { status: 'ok', output: ['flag'], download: '/download/abc/strings', image: '/image/x' },
    decomposer: { status: 'ok', images: { Red: ['/image/a'] }, output: '' },
  });
  assert.deepEqual(clean.strings, { status: 'ok', output: ['flag'] });
  assert.deepEqual(clean.decomposer, { status: 'ok', output: '' });
  assert.equal(firstExtractedText(clean), 'flag');
});

test('polling stops 120 seconds after a known submission', () => {
  resetSubmissions();
  assert.equal(isSubmissionHash('abc'), false);
  assert.equal(isSubmissionHash('a'.repeat(32)), true);
  const hash = 'b'.repeat(32);
  rememberSubmission(hash, 5000);
  assert.equal(submissionStartedAt(hash), 5000);
  assert.equal(pollExpired(5000, 5000 + POLL_DEADLINE_MS - 1), false);
  assert.equal(pollExpired(5000, 5000 + POLL_DEADLINE_MS), true);
});
