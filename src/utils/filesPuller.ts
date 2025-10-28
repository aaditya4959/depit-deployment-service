import { S3Client, ListObjectsV2Command, GetObjectCommand } from "@aws-sdk/client-s3";
import fs from "fs";
import path from "path";
import dotenv from "dotenv";

dotenv.config();

// Configure AWS S3
export const s3 = new S3Client({
  region: process.env.AWS_BUCKET_REGION || "eu-north-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

const bucketName = process.env.AWS_BUCKET_NAME || "depit-1";
const baseDownloadDir = "./downloads";

export const pullFilesFromS3 = async (deploymentId: string) => {
  try {
    const prefix = `outputs/${deploymentId}/`;

    // 1. List objects under prefix
    const listedObjects = await s3.send(
      // This will return all the objects under the specified prefix ( Can be made complex using some kind of promise )
      new ListObjectsV2Command({
        Bucket: bucketName,
        Prefix: prefix,
      })
    );

    if (!listedObjects.Contents || listedObjects.Contents.length === 0) {
      console.log(`❌ No files found for deploymentId: ${deploymentId}`);
      return;
    }

    // 2. Download each object
    for (const item of listedObjects.Contents) {
      if (!item.Key) continue;

      const relativePath = item.Key.replace(prefix, "");
      if (!relativePath) continue; // skip empty "folder" keys

      const localFilePath = path.join(baseDownloadDir, deploymentId, relativePath);

      // Ensure directory exists
      fs.mkdirSync(path.dirname(localFilePath), { recursive: true });

      console.log(`⬇️ Downloading: ${item.Key} -> ${localFilePath}`);

      const getObjectResponse = await s3.send(
        new GetObjectCommand({
          Bucket: bucketName,
          Key: item.Key,
        })
      );

      if (getObjectResponse.Body) {
        // Convert stream to buffer
        const chunks: Buffer[] = [];
        for await (const chunk of getObjectResponse.Body as any) {
          chunks.push(chunk as Buffer);
        }
        const fileBuffer = Buffer.concat(chunks);

        // Write file
        fs.writeFileSync(localFilePath, fileBuffer);
      }
    }

    console.log(`✅ All files for deploymentId ${deploymentId} downloaded.`);
  } catch (err) {
    console.error("Error downloading files:", err);
  }
};

// Example usage:
// await pullFilesFromS3("abc123");
