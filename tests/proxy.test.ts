import assert from 'node:assert/strict';
import { test } from 'node:test';
import { normalizeProxyUrl, parseProxyServerEntry } from '../electron/proxy';

test('normalizeProxyUrl adds http:// to bare host:port', () => {
  assert.equal(normalizeProxyUrl('127.0.0.1:7897'), 'http://127.0.0.1:7897');
});

test('normalizeProxyUrl keeps existing schemes', () => {
  assert.equal(normalizeProxyUrl('https://127.0.0.1:7897'), 'https://127.0.0.1:7897');
  assert.equal(normalizeProxyUrl('socks5://127.0.0.1:7897'), 'socks5://127.0.0.1:7897');
});

test('parseProxyServerEntry handles plain proxy', () => {
  assert.equal(parseProxyServerEntry('127.0.0.1:7897'), 'http://127.0.0.1:7897');
});

test('parseProxyServerEntry prefers http= in compound ProxyServer', () => {
  assert.equal(
    parseProxyServerEntry('http=127.0.0.1:7897;https=127.0.0.1:7898'),
    'http://127.0.0.1:7897',
  );
});
