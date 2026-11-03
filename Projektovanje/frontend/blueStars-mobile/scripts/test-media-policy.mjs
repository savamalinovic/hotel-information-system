import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getMediaKind, requireMediaUrl, validateMediaPdf } from '../src/media/mediaPolicy.ts';

test('supported image and PDF MIME types are case-insensitive and accept parameters', () => {
  assert.equal(getMediaKind('Image/JPEG; charset=binary', 'photo'), 'image');
  assert.equal(getMediaKind('image/webp', 'photo'), 'image');
  assert.equal(getMediaKind('application/pdf', 'scan'), 'pdf');
});

test('unknown binary uploads may use a known extension; explicit active content remains external', () => {
  assert.equal(getMediaKind(null, 'Photo.PNG'), 'image');
  assert.equal(getMediaKind('application/octet-stream', 'scan.PDF'), 'pdf');
  assert.equal(getMediaKind('text/html', 'photo.jpg'), 'external');
  assert.equal(getMediaKind('image/svg+xml', 'photo.svg'), 'external');
  assert.equal(getMediaKind('application/zip', 'archive.zip'), 'external');
});

test('only HTTPS storage and explicit local development URLs are accepted', () => {
  const signed = 'https://storage.example.test/object?signature=temporary';
  assert.equal(requireMediaUrl(signed), signed);
  assert.equal(requireMediaUrl('http://127.0.0.1:9000/object'), 'http://127.0.0.1:9000/object');
  for (const unsafe of ['file:///private/file', 'javascript:alert(1)', 'http://public.example.test/file', 'https://user:password@example.test/file', 'not a URL']) {
    assert.throws(() => requireMediaUrl(unsafe));
  }
});

test('PDF download rejects storage error documents and oversized responses', () => {
  validateMediaPdf(new TextEncoder().encode('%PDF-1.7\ncontent').buffer);
  assert.throws(() => validateMediaPdf(new TextEncoder().encode('<Error>Expired</Error>').buffer));
  assert.throws(() => validateMediaPdf(new ArrayBuffer(0)));
  assert.throws(() => validateMediaPdf(new ArrayBuffer(10 * 1024 * 1024 + 1)));
});
