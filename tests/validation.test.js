import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isValidEmail, isStrongPassword, passwordChecks, normalizeEmail } from '../src/utils/validation.js';

test('email validation', ()=>{
  for(const ok of ['a@b.co', 'Jane.Doe+race@typer.app', '  user@example.com ']) assert.ok(isValidEmail(ok), ok);
  for(const bad of ['', 'plain', 'a@b', 'a@b.c', 'a b@c.com', '@c.com', 'a@.com']) assert.ok(!isValidEmail(bad), bad);
  assert.equal(normalizeEmail('  Jane@Example.COM '), 'jane@example.com');
});

test('password needs 8+ chars, a capital and a special character', ()=>{
  assert.ok(isStrongPassword('Racing#1'));
  assert.ok(isStrongPassword('Typer!!!'));
  assert.ok(!isStrongPassword('Racing1'));      // 7 chars, no special
  assert.ok(!isStrongPassword('racing#12'));    // no capital
  assert.ok(!isStrongPassword('Racing123'));    // no special
  assert.ok(!isStrongPassword('R#a'));          // too short
  assert.ok(!isStrongPassword('Racing  12'));   // a space is not a special character
  assert.deepEqual(passwordChecks('abc').map(c=>c.ok), [false,false,false]);
  assert.deepEqual(passwordChecks('Abcdefg!').map(c=>c.ok), [true,true,true]);
});
