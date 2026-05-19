export function getDatabaseUrl() {
  return process.env.DATABASE_URL?.trim();
}

export function assertDatabaseUrl() {
  if (!getDatabaseUrl()) {
    throw new Error('DATABASE_URL tanimli degil. backend/.env dosyasini backend/.env.example uzerinden olusturun.');
  }
}
