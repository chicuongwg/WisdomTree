import { test } from 'vitest';

import * as apiTest from '../../tests/integration/api.test';
import * as dbTest from '../../tests/integration/db.test';
import * as devLogin from '../../tests/integration/dev-login.test';
import * as postDevLogin from '../../tests/integration/post-dev-login.test';

test('integration: api', async () => {
  await apiTest.run();
});

test('integration: db', async () => {
  await dbTest.run();
});

test('integration: dev-login', async () => {
  await devLogin.run();
});

test('integration: post-dev-login', async () => {
  await postDevLogin.run();
});
