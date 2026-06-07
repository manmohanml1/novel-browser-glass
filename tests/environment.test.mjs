import test from 'node:test';
import assert from 'node:assert/strict';

import { ENVIRONMENTS, resolveEnvironment } from '../novel-browser/src/config/environment.js';

test('localhost defaults to development', function() {
  assert.equal(resolveEnvironment({ hostname: 'localhost' }).name, 'development');
  assert.equal(resolveEnvironment({ hostname: '127.0.0.1' }).name, 'development');
});

test('local environment overrides support staging and production validation', function() {
  assert.equal(resolveEnvironment({ hostname: 'localhost', search: '?env=staging' }).name, 'staging');
  assert.equal(resolveEnvironment({ hostname: 'localhost', search: '?env=production' }).name, 'production');
});

test('remote preview and production hostnames resolve safely', function() {
  assert.equal(resolveEnvironment({ hostname: 'novel-browser-preview.vercel.app' }).name, 'staging');
  assert.equal(resolveEnvironment({ hostname: 'novel-browser-glass-git-feature.vercel.app' }).name, 'staging');
  assert.equal(resolveEnvironment({ hostname: 'novel-browser-glass.vercel.app' }).name, 'production');
});

test('invalid overrides do not escape defined environments', function() {
  assert.equal(resolveEnvironment({ hostname: 'localhost', search: '?env=anything' }).name, 'development');
  assert.deepEqual(Object.keys(ENVIRONMENTS), ['development', 'staging', 'production']);
});

test('CI validates only a defined target environment', function() {
  var target = process.env.NOVEL_BROWSER_ENV;

  if (target) {
    assert.ok(ENVIRONMENTS[target], target + ' must be configured before deployment');
  }
});
