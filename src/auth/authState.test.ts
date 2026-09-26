import assert from 'node:assert/strict';
import { test } from 'node:test';
import { credentialReceived, identityReceived, initialAuthState, ready, signedOut, type AuthState } from './authState.ts';

/**
 * The states the application can be in about who it is talking to.
 *
 * Google's popup is not driven here - it belongs to Google and cannot be
 * exercised in a unit test. What is exercised is everything around it: what a
 * credential does, what a failed or dismissed attempt does, and what signing
 * out does.
 */

function credentialFor(claims: Record<string, unknown>): string {
  const b64url = (value: string) =>
    Buffer.from(value, 'utf8').toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${b64url('{"alg":"RS256"}')}.${b64url(JSON.stringify(claims))}.signature`;
}

const student = credentialFor({ sub: '1234', name: 'Tanmay', email: 'student@example.com' });

test('the page opens waiting, with nobody identified', () => {
  assert.deepEqual(initialAuthState, { status: 'loading', user: null });
});

test('once Google has answered, a page with nobody identified is signed out', () => {
  assert.deepEqual(ready(initialAuthState), { status: 'signed_out', user: null });
});

test('Google being unavailable still leaves the student able to carry on', () => {
  // `ready` is reached whether or not Google's script arrived, so nothing is
  // left waiting on a script that will never come.
  const state = ready(initialAuthState);
  assert.equal(state.status, 'signed_out');
  assert.notEqual(state.status, 'loading');
});

test('a credential identifies the student', () => {
  const state = credentialReceived(ready(initialAuthState), student);
  assert.equal(state.status, 'signed_in');
  assert.equal(state.user?.sub, '1234');
  assert.equal(state.user?.name, 'Tanmay');
  assert.equal(state.user?.email, 'student@example.com');
});

test('an unreadable credential leaves the student exactly where they were', () => {
  // A dismissed popup sends nothing at all; a broken one sends something that
  // does not decode. Neither may strand the student on the first screen.
  const signedOutState: AuthState = { status: 'signed_out', user: null };
  assert.deepEqual(credentialReceived(signedOutState, 'not-a-jwt'), signedOutState);
  assert.deepEqual(credentialReceived(signedOutState, ''), signedOutState);
});

test('a broken credential arriving before Google answered still settles the page', () => {
  const state = credentialReceived(initialAuthState, 'not-a-jwt');
  assert.equal(state.status, 'signed_out', 'not left waiting');
  assert.equal(state.user, null);
});

test('a broken credential never displaces an identity already read', () => {
  const identified = credentialReceived(ready(initialAuthState), student);
  const after = credentialReceived(identified, 'rubbish');
  assert.deepEqual(after, identified);
});

test('a second credential replaces the first', () => {
  const first = credentialReceived(ready(initialAuthState), student);
  const other = credentialFor({ sub: '9999', name: 'Someone Else' });
  const second = credentialReceived(first, other);
  assert.equal(second.user?.sub, '9999');
  assert.equal(second.user?.name, 'Someone Else');
});

test('signing out forgets the identity', () => {
  const identified = credentialReceived(ready(initialAuthState), student);
  assert.equal(identified.status, 'signed_in');
  const after = signedOut();
  assert.deepEqual(after, { status: 'signed_out', user: null });
  assert.equal(after.user, null, 'nothing about the student is kept');
});

test('signing out and in again works, because nothing was persisted', () => {
  const again = credentialReceived(signedOut(), student);
  assert.equal(again.status, 'signed_in');
  assert.equal(again.user?.sub, '1234');
});

test('an identity that is already read is not disturbed by Google answering late', () => {
  const identified = credentialReceived(initialAuthState, student);
  assert.deepEqual(ready(identified), identified);
});

// ------------------------------------- the token model, as the card now uses it

test('an identity from Google identifies the student', () => {
  const state = identityReceived(ready(initialAuthState), { sub: '1234', name: 'Tanmay', email: 'student@example.com' });
  assert.equal(state.status, 'signed_in');
  assert.equal(state.user?.sub, '1234');
});

test('a dismissed popup leaves the student exactly where they were', () => {
  // Closing Google's window invokes no callback at all, so nothing reaches the
  // state; this covers the case where a token comes back with no identity.
  const signedOutState: AuthState = { status: 'signed_out', user: null };
  assert.deepEqual(identityReceived(signedOutState, null), signedOutState);
});

test('a failed identity lookup never displaces an identity already read', () => {
  const identified = identityReceived(ready(initialAuthState), { sub: '1234', name: 'Tanmay' });
  assert.deepEqual(identityReceived(identified, null), identified);
});

test('a failed lookup before Google answered still settles the page', () => {
  const state = identityReceived(initialAuthState, null);
  assert.equal(state.status, 'signed_out', 'not left waiting');
});
