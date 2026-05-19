import 'dotenv/config';
import { app } from './app.js';
import { assertDatabaseUrl } from './config.js';

const port = Number(process.env.PORT ?? 4000);

try {
  assertDatabaseUrl();
  app.listen(port, () => {
    console.info(`Melisa Mini ERP API listening on http://localhost:${port}`);
  });
} catch (error) {
  const message = error instanceof Error ? error.message : 'Backend baslatilamadi.';
  console.error(message);
  process.exitCode = 1;
}
