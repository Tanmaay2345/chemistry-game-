import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  SIGN_IN_FAILURE_MESSAGE,
  credentialReceived,
  identityReceived,
  initialAuthState,
  ready,
  signInFailed,
  signInStarted,
  signedOut,
  type AuthState,
} from './authState.ts';

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
  assert.deepEqual(initialAuthState, { status: 'loading', user: null, error: null });
});

test('once Google has answered, a page with nobody identified is signed out', () => {
  assert.deepEqual(ready(initialAuthState), { status: 'signed_out', user: null, error: null });
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
  const signedOutState: AuthState = { status: 'signed_out', user: null, error: null };
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
  assert.deepEqual(after, { status: 'signed_out', user: null, error: null });
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
  const signedOutState: AuthState = { status: 'signed_out', user: null, error: null };
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

// ------------------------------------------------- when Google says no

/**
 * A refused attempt used to be discarded, which left the card looking like a
 * button that did nothing - and that is exactly what it looked like to every
 * account the project would not let in. These keep the reason visible, and
 * keep a failure from being mistaken for a sign-in.
 */

test('a refused attempt says so, and leaves the student able to try again', () => {
  const after = signInFailed(ready(initialAuthState), 'authorization');
  assert.equal(after.status, 'signed_out', 'still signed out, not stuck loading');
  assert.equal(after.user, null);
  assert.equal(after.error, SIGN_IN_FAILURE_MESSAGE.authorization);
});

test('an account that could not be read says something different', () => {
  // Authorised, then the identity fetch failed: a different thing to be told,
  // because trying again is likely to work.
  const after = signInFailed(ready(initialAuthState), 'identity');
  assert.equal(after.error, SIGN_IN_FAILURE_MESSAGE.identity);
  assert.notEqual(SIGN_IN_FAILURE_MESSAGE.identity, SIGN_IN_FAILURE_MESSAGE.authorization);
});

test('a failure never signs anybody in, so the flow cannot move on', () => {
  // `App` advances on `signed_in` alone. If a failure could reach it, a
  // refused student would be carried into the lesson.
  for (const failure of ['authorization', 'identity'] as const) {
    for (const from of [initialAuthState, ready(initialAuthState)]) {
      const after = signInFailed(from, failure);
      assert.notEqual(after.status, 'signed_in', `${failure} from ${from.status}`);
      assert.equal(after.user, null);
    }
  }
});

test('a failure while loading releases the card rather than leaving it disabled', () => {
  // The card is disabled while the status is `loading`; a failure that left it
  // there would be a button that can never be pressed again.
  assert.equal(signInFailed(initialAuthState, 'authorization').status, 'signed_out');
});

test('pressing again clears the last reason before the popup opens', () => {
  const failed = signInFailed(ready(initialAuthState), 'authorization');
  assert.ok(failed.error);
  const retrying = signInStarted(failed);
  assert.equal(retrying.error, null, 'the old reason is gone');
  assert.equal(retrying.status, failed.status, 'and nothing else moved');
});

test('starting again when nothing failed changes nothing at all', () => {
  // Called on every press, so it has to be a no-op when there is no reason to
  // clear - otherwise it would be a new state object on every render.
  const state = ready(initialAuthState);
  assert.equal(signInStarted(state), state);
});

test('signing in successfully clears a reason left by an earlier attempt', () => {
  const failed = signInFailed(ready(initialAuthState), 'authorization');
  const after = identityReceived(failed, { sub: '1234', name: 'Tanmay' });
  assert.equal(after.status, 'signed_in');
  assert.equal(after.error, null, 'the old reason is no longer true');
});

test('a successful sign-in is otherwise exactly what it always was', () => {
  const student = { sub: '1234', name: 'Tanmay', email: 'student@example.com' };
  assert.deepEqual(identityReceived(ready(initialAuthState), student), {
    status: 'signed_in',
    user: student,
    error: null,
  });
});

test('nothing in a message could identify anyone or anything', () => {
  // These are rendered on the card, so they must carry no token, address,
  // client id or anything Google said verbatim.
  for (const message of Object.values(SIGN_IN_FAILURE_MESSAGE)) {
    assert.equal(/googleusercontent|apps\.|token|@|client[_ ]?id|Bearer/i.test(message), false, message);
  }
});
