import assert from 'node:assert/strict';
import test from 'node:test';
import { sanitizeNoticeHtml } from '../src/sanitize.js';

if (process.env.REQUIRE_DATABASE !== 'true') process.env.DEMO_MODE = 'true';

test('sanitiza HTML de comunicado com allowlist', () => {
  const result = sanitizeNoticeHtml('<p onclick="alert(1)">Ok</p><script>alert(1)</script><a href="javascript:alert(1)">x</a>');
  assert.equal(result.includes('script'), false);
  assert.equal(result.includes('onclick'), false);
  assert.equal(result.includes('javascript:'), false);
  assert.match(result, /<p>Ok<\/p>/);
});
