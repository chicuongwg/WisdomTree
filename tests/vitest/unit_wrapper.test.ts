import { test, expect } from 'vitest';

import * as example from '../../tests/unit/example.test';
import * as auth from '../../tests/unit/auth.test';

test('unit: example', async () => {
  await example.run();
});

test('unit: auth', async () => {
  await auth.run();
});
