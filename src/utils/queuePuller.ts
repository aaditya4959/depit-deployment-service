import { ReceiveMessageCommand, DeleteMessageCommand, SQSClient } from "@aws-sdk/client-sqs";
import dotenv from "dotenv";
import { pullFilesFromS3 } from "./filesPuller.js";
import { projectBuilder } from "./projectBuilder.js";
import { copyFinalDist } from "./copyDist.js";

dotenv.config();

// ✅ Initialize SQS client
const sqsClient = new SQSClient({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

export const pollQueue = async () => {
  if (!process.env.SQS_QUEUE_URL) {
    throw new Error("❌ SQS_QUEUE_URL is not defined in environment variables");
  }

  console.log("🚀 Starting SQS polling...");

  while (true) {
    try {
      const params = {
        QueueUrl: process.env.SQS_QUEUE_URL,
        MaxNumberOfMessages: 5, // up to 10
        WaitTimeSeconds: 10,    // long polling
        VisibilityTimeout: 60,  // allow time for file pull + build
      };

      const command = new ReceiveMessageCommand(params);
      const response = await sqsClient.send(command);

      if (response.Messages && response.Messages.length > 0) {
        for (const message of response.Messages) {
          console.log("📩 Received message:", message.Body);

          const deploymentId = message.Body?.trim();
          if (!deploymentId) {
            console.warn("⚠️ Message body is empty or invalid, skipping...");
            continue;
          }

          try {
            // 1️⃣ Pull project files from S3
            console.log(`⬇️ Pulling files for deployment: ${deploymentId}`);
            await pullFilesFromS3(deploymentId);

            // 2️⃣ Build the project
            console.log(`🏗️ Building project for deployment: ${deploymentId}`);
            await projectBuilder(deploymentId);

            console.log(`Copying Build Files to S3 for deployment: ${deploymentId}`);
            await copyFinalDist(deploymentId);

            // 3️⃣ Delete message only if everything succeeded
            if (message.ReceiptHandle) {
              await sqsClient.send(
                new DeleteMessageCommand({
                  QueueUrl: process.env.SQS_QUEUE_URL,
                  ReceiptHandle: message.ReceiptHandle,
                })
              );
              console.log(`✅ Successfully processed and deleted message: ${message.MessageId}`);
            }
          } catch (processError) {
            console.error(`❌ Error processing deployment ${deploymentId}:`, processError);
            // Don't delete the message — allow for automatic retry
          }
        }
      } else {
        console.log("⏳ No new messages... waiting for next poll.");
      }
    } catch (error) {
      console.error("💥 Error while polling SQS:", error);
      // brief delay before retrying (prevents rate-limiting)
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};


