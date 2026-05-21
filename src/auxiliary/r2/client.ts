import { S3Client } from "@aws-sdk/client-s3";

function requireEnv(name: string): string {
	const value = process.env[name];
	if (!value) throw new Error(`Missing required env var: ${name}`);
	return value;
}

function getEnv(name: string, fallback?: string): string | undefined {
	return process.env[name] ?? fallback;
}

export type R2Config = {
	endpoint: string;
	region: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucket: string;
};

/** Load R2 configuration from environment variables. */
export function loadConfig(): R2Config {
	const endpoint = requireEnv("R2_ENDPOINT");
	return {
		endpoint,
		region: getEnv("R2_REGION") ?? "auto",
		accessKeyId: requireEnv("R2_ACCESS_KEY_ID"),
		secretAccessKey: requireEnv("R2_SECRET_ACCESS_KEY"),
		bucket: requireEnv("R2_BUCKET"),
	};
}

/** Create an S3 client pointed at the R2 endpoint. */
export function createClient(config: R2Config) {
	return new S3Client({
		endpoint: config.endpoint,
		region: config.region,
		credentials: {
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey,
		},
	});
}
