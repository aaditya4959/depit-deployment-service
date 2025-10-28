import { ReceiveMessageCommand, DeleteMessageCommand ,SQSClient} from "@aws-sdk/client-sqs";
import dotenv from "dotenv";
import { pullFilesFromS3 } from "./filesPuller.js";
// assuming you exported sqsClient from your earlier code

dotenv.config();

const sqsClient = new SQSClient({
    region: process.env.AWS_REGION || "us-east-1",
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
    }
})

export const pollQueue = async () => {
  if (!process.env.SQS_QUEUE_URL) {
    throw new Error("SQS_QUEUE_URL is not defined in environment variables");
  }

  console.log("🚀 Starting SQS polling...");

  while (true) {
    try {
      const params = {
        QueueUrl: process.env.SQS_QUEUE_URL,
        MaxNumberOfMessages: 5, // up to 10
        WaitTimeSeconds: 10,    // long polling (reduces API cost)
        VisibilityTimeout: 30,  // seconds a message is hidden until processed
      };

      const command = new ReceiveMessageCommand(params);
      const response = await sqsClient.send(command);

      if (response.Messages && response.Messages.length > 0) {
        for (const message of response.Messages) {
          console.log("📩 Received message:", message.Body);

          // ✅ Process message here
          // e.g., call your business logic ( The function of pulling files from s3 and building them will be called here )
          const deploymentId = message.Body; // assuming the message body contains the deployment ID
        
           await pullFilesFromS3(deploymentId !);

           // Building the project

          // ✅ Delete after processing
          if (message.ReceiptHandle) {
            await sqsClient.send(
              new DeleteMessageCommand({
                QueueUrl: process.env.SQS_QUEUE_URL!,
                ReceiptHandle: message.ReceiptHandle,
              })
            );
            console.log("✅ Deleted message:", message.MessageId);
          }
        }
      } else {
        console.log("⏳ No messages, waiting...");
      }
    } catch (error) {
      console.error("❌ Error while polling:", error);
      // wait a little before retrying, otherwise you might flood AWS with requests
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
};
