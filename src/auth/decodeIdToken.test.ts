import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decodeIdToken } from './decodeIdToken.ts';

/**
 * Reading an identity out of a Google credential.
 *
 * Nothing here verifies anything - that is the point of the module's warning,
 * and these tests only check that what is read back is what was put in, and
 * that anything malformed is refused rather than half-trusted.
 */

/** Builds a credential shaped like Google's, with no signature that means anything. */
function credentialFor(claims: Record<string, unknown>): string {
  const b64url = (value: string) =>
    Buffer.from(value, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64url(JSON.stringify({ alg: 'RS256' }))}.${b64url(JSON.stringify(claims))}.not-a-real-signature`;
}

test('a full payload gives back every field the interface needs', () => {
  const token = credentialFor({
    sub: '1234567890',
    name: 'Tanmay Jena',
    email: 'student@example.com',
    picture: 'https://lh3.googleusercontent.com/a/example',
    aud: 'client-id',
    iss: 'https://accounts.google.com',
  });
  assert.deepEqual(decodeIdToken(token), {
    sub: '1234567890',
    name: 'Tanmay Jena',
    email: 'student@example.com',
    picture: 'https://lh3.googleusercontent.com/a/example',
  });
});

test('a name outside Latin-1 survives the decode', () => {
  const token = credentialFor({ sub: '1', name: 'Ananya Sørensen 田中' });
  assert.equal(decodeIdToken(token)?.name, 'Ananya Sørensen 田中');
});

test('a payload with no email still identifies the account', () => {
  const token = credentialFor({ sub: '42', name: 'No Email' });
  const identity = decodeIdToken(token);
  assert.equal(identity?.sub, '42');
  assert.equal(identity?.name, 'No Email');
  assert.equal(identity?.email, undefined);
});

test('a payload with no name still identifies the account', () => {
  const token = credentialFor({ sub: '42', email: 'quiet@example.com' });
  const identity = decodeIdToken(token);
  assert.equal(identity?.sub, '42');
  assert.equal(identity?.name, undefined);
  assert.equal(identity?.email, 'quiet@example.com');
});

test('an empty string field is treated as absent rather than as an empty name', () => {
  const token = credentialFor({ sub: '42', name: '', picture: '' });
  const identity = decodeIdToken(token);
  assert.equal(identity?.name, undefined);
  assert.equal(identity?.picture, undefined);
});

test('a payload without a subject is refused', () => {
  // `sub` is the only field that identifies the account reliably; an email can
  // change hands, so a payload without a subject is of no use.
  assert.equal(decodeIdToken(credentialFor({ name: 'Nobody', email: 'a@b.c' })), null);
  assert.equal(decodeIdToken(credentialFor({ sub: 42 })), null, 'a non-string subject is not a subject');
});

test('a malformed credential is refused rather than half-read', () => {
  assert.equal(decodeIdToken(''), null);
  assert.equal(decodeIdToken('not-a-jwt'), null);
  assert.equal(decodeIdToken('only.two'), null);
  assert.equal(decodeIdToken('a.b.c.d'), null);
  assert.equal(decodeIdToken('header..signature'), null);
});

test('a payload that is not JSON, or not an object, is refused', () => {
  const b64url = (v: string) => Buffer.from(v, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  assert.equal(decodeIdToken(`x.${b64url('this is not json')}.y`), null);
  assert.equal(decodeIdToken(`x.${b64url('"a string"')}.y`), null);
  assert.equal(decodeIdToken(`x.${b64url('null')}.y`), null);
  assert.equal(decodeIdToken(`x.${b64url('[1,2,3]')}.y`), null);
});

test('anything that is not a string is refused', () => {
  assert.equal(decodeIdToken(undefined as unknown as string), null);
  assert.equal(decodeIdToken(null as unknown as string), null);
  assert.equal(decodeIdToken({} as unknown as string), null);
});

test('only the four fields the interface needs are kept', () => {
  const token = credentialFor({
    sub: '1', name: 'A', email: 'a@b.c', picture: 'p',
    // Everything else Google sends is deliberately dropped.
    iss: 'https://accounts.google.com', aud: 'client', exp: 1, iat: 1, hd: 'example.com', email_verified: true,
  });
  assert.deepEqual(Object.keys(decodeIdToken(token)!).sort(), ['email', 'name', 'picture', 'sub']);
});
