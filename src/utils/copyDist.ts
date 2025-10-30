import fs from "fs"
import path from "path"
import { S3Client, GetObjectCommand , PutObjectCommand} from "@aws-sdk/client-s3";
import { fileURLToPath } from "url";
import dotenv from "dotenv";


// function for getting all the files

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);



export const getAllFilePaths = (folderPath: string) => {
    let response: string[] = [];

    const allFilesAndFolders = fs.readdirSync(folderPath);allFilesAndFolders.forEach(file => {
        const fullFilePath = path.join(folderPath, file);
        if (fs.statSync(fullFilePath).isDirectory()) {
            response = response.concat(getAllFilePaths(fullFilePath))
        } else {
            response.push(fullFilePath);
        }
    });
    return response;
}


// Create S3 client
export const s3 = new S3Client({
  region: process.env.AWS_BUCKET_REGION || "eu-north-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

// Upload file function
export const uploadFile = async (fileName: string, localFilePath: string) => {
  console.log("Uploading file to S3:", fileName);

  const fileContent = fs.readFileSync(localFilePath);

  const command = new PutObjectCommand({
    Bucket: "depit-1", // your bucket name
    Key: fileName,     // path in bucket
    Body: fileContent, // file content
  });

  try {
    const response = await s3.send(command);
    console.log("✅ Build Upload successful:", response);
    return response;
  } catch (err) {
    console.error("❌ Build Upload failed:", err);
    throw err;
  }
};



// Aggreagate function for copying the dist folder to s3
export async function copyFinalDist( deploymentId: string){
    const distFolderPath = path.join(__dirname,"..","..", "downloads", deploymentId,"dist");
    const allFilePaths = getAllFilePaths(distFolderPath);

    allFilePaths.forEach(file => {
        uploadFile(`dist/${deploymentId}/` + file.slice(distFolderPath.length + 1), file);
    })
}