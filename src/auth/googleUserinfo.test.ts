import assert from 'node:assert/strict';
import { test } from 'node:test';
import { fetchGoogleIdentity, USERINFO_ENDPOINT } from './googleUserinfo.ts';

/**
 * Reading an identity from an access token.
 *
 * Google's popup belongs to Google and cannot be driven from a unit test. What
 * is tested here is everything around it: the request that is made, what comes
 * back, and what happens when nothing usable does.
 */

function respondWith(payload: unknown, ok = true) {
  const calls: Array<{ url: string; headers?: Record<string, string> }> = [];
  const fetchImpl = async (url: string, init?: { headers?: Record<string, string> }) => {
    calls.push({ url, headers: init?.headers });
    return { ok, json: async () => payload };
  };
  return { fetchImpl, calls };
}

test('a full response gives back every field the interface needs', async () => {
  const { fetchImpl } = respondWith({ sub: '1234', name: 'Tanmay', email: 'student@example.com', picture: 'https://example/p.jpg' });
  assert.deepEqual(await fetchGoogleIdentity('token-abc', fetchImpl), {
    sub: '1234', name: 'Tanmay', email: 'student@example.com', picture: 'https://example/p.jpg',
  });
});

test('the token is sent to Google as a bearer token, and nowhere else', async () => {
  const { fetchImpl, calls } = respondWith({ sub: '1' });
  await fetchGoogleIdentity('token-abc', fetchImpl);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, USERINFO_ENDPOINT);
  assert.equal(calls[0].headers?.Authorization, 'Bearer token-abc');
});

test('a response with no email or name still identifies the account', async () => {
  const { fetchImpl } = respondWith({ sub: '42' });
  const identity = await fetchGoogleIdentity('t', fetchImpl);
  assert.equal(identity?.sub, '42');
  assert.equal(identity?.name, undefined);
  assert.equal(identity?.email, undefined);
});

test('a response without a subject is refused', async () => {
  const { fetchImpl } = respondWith({ name: 'Nobody', email: 'a@b.c' });
  assert.equal(await fetchGoogleIdentity('t', fetchImpl), null);
});

test('an error response is refused', async () => {
  const { fetchImpl } = respondWith({ sub: '1' }, false);
  assert.equal(await fetchGoogleIdentity('t', fetchImpl), null);
});

test('a network failure gives null rather than throwing', async () => {
  const failing = async () => { throw new Error('offline'); };
  assert.equal(await fetchGoogleIdentity('t', failing as never), null);
});

test('a payload that is not an object is refused', async () => {
  for (const payload of ['a string', 42, null, [1, 2]]) {
    const { fetchImpl } = respondWith(payload);
    assert.equal(await fetchGoogleIdentity('t', fetchImpl), null);
  }
});

test('an empty token is refused without calling Google at all', async () => {
  const { fetchImpl, calls } = respondWith({ sub: '1' });
  assert.equal(await fetchGoogleIdentity('', fetchImpl), null);
  assert.equal(calls.length, 0);
});

test('only the four fields the interface needs are kept', async () => {
  const { fetchImpl } = respondWith({ sub: '1', name: 'A', email: 'a@b.c', picture: 'p', email_verified: true, hd: 'example.com', locale: 'en' });
  const identity = await fetchGoogleIdentity('t', fetchImpl);
  assert.deepEqual(Object.keys(identity!).sort(), ['email', 'name', 'picture', 'sub']);
});
