const requiredEnv = [
  "R2_ACCOUNT_ID",
  "R2_ACCESS_KEY_ID",
  "R2_SECRET_ACCESS_KEY",
  "R2_BUCKET_NAME",
] as const;

for (const key of requiredEnv) {
  if (!process.env[key]) {
    console.error(`Test failed: missing required environment variable ${key}`);
    process.exit(1);
  }
}

const endpoint =
  process.env.R2_ENDPOINT ??
  `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`;

const s3 = new Bun.S3Client({
  accessKeyId: process.env.R2_ACCESS_KEY_ID!,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  endpoint,
  region: "auto",
  bucket: process.env.R2_BUCKET_NAME!,
});

const objectKey = "test.txt";
const objectBody = "R2 working";
const shouldDelete = process.env.R2_DELETE_TEST_FILE !== "false";

try {
  console.log("Uploading...");
  await s3.write(objectKey, objectBody, {
    type: "text/plain",
  });
  console.log("Upload success");

  console.log("Listing objects...");
  const listResult = await s3.list({
    prefix: objectKey,
    maxKeys: 100,
  });

  const fileFound = (listResult.contents ?? []).some((item) => item.key === objectKey);

  if (!fileFound) {
    throw new Error(`Uploaded file not found in list response: ${objectKey}`);
  }

  console.log("File found");

  console.log("Fetching file...");
  const content = await s3.file(objectKey).text();
  console.log(`Content: ${content}`);

  if (content !== objectBody) {
    throw new Error(`Unexpected content for ${objectKey}`);
  }

  if (shouldDelete) {
    await s3.delete(objectKey);
  }

  console.log("Test passed");
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Test failed: ${message}`);
  process.exit(1);
}
