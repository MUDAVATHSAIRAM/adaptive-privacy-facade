import test from 'node:test';
import assert from 'node:assert/strict';
import { openingToAngle, motorCommand } from '../src/hardware/serial.js';

test('physical mapping is bounded and can reverse motor direction', () => {
  assert.equal(openingToAngle(0), 0);
  assert.equal(openingToAngle(50), 90);
  assert.equal(openingToAngle(100), 180);
  assert.equal(openingToAngle(0, true), 180);
  assert.equal(openingToAngle(100, true), 0);
  assert.equal(openingToAngle(-40), 0);
  assert.equal(openingToAngle(500), 180);
});

test('firmware command format and range validation', () => {
  assert.equal(motorCommand(1, 180), '1,180\n');
  assert.equal(motorCommand(4, 0), '4,0\n');
  assert.throws(() => motorCommand(5, 90));
  assert.throws(() => motorCommand(1, 181));
  assert.throws(() => motorCommand(1, 90.5));
});
