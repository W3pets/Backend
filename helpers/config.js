import { SecretManagerServiceClient } from '@google-cloud/secret-manager';
import { config as loadEnv, parse } from 'dotenv';

const client = new SecretManagerServiceClient();

export async function loadConfig() {
  if (process.env.NODE_ENV === 'production') {
    console.log('🔐 Loading config from GCP Secret Manager');

    // Use GCP_PROJECT_ID from environment (local or prod)
    const projectId = process.env.GCP_PROJECT_ID;

    if (!projectId) {
      throw new Error('Missing GCP_PROJECT_ID env variable');
    }

    const [secret] = await client.accessSecretVersion({
      name: `projects/${projectId}/secrets/w3pets/versions/latest`,
    });

    const rawEnv = secret.payload.data.toString();
    const parsed = parse(rawEnv); // parses like dotenv

    for (const [key, value] of Object.entries(parsed)) {
      process.env[key] = value;
    }
  } else {
    console.log('💻 Loading config from .env file');
    loadEnv(); // loads from local .env
  }

  // Update this array to include all your required keys
  const requiredVars = [
    'DATABASE_URL',
    'PORT',
    'FRONTEND_URLS',
    'JWT_SECRET',
    'NODE_ENV',
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_SECURE',
    'SMTP_USER',
    'SMTP_PASS',
    'AWS_REGION',
    'AWS_ACCESS_KEY_ID',
    'AWS_SECRET_ACCESS_KEY',
    'AWS_S3_BUCKET',
  ];

  for (const key of requiredVars) {
    if (!process.env[key]) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
  }
}
