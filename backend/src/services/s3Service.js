import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import logger from '../utils/logger.js';

const s3Client = new S3Client({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
  }
});

export const uploadToS3 = async (file, key, bucket = process.env.S3_BUCKET_NAME) => {
  try {
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
      ServerSideEncryption: 'AES256'
    });

    await s3Client.send(command);

    return {
      bucket,
      key,
      location: `https://${bucket}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
    };
  } catch (error) {
    logger.error('S3 upload error:', error);
    throw new Error('Failed to upload file to S3');
  }
};

export const deleteFromS3 = async (key, bucket = process.env.S3_BUCKET_NAME) => {
  try {
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key
    });

    await s3Client.send(command);
    logger.info(`Deleted file from S3: ${key}`);
  } catch (error) {
    logger.error('S3 delete error:', error);
    throw new Error('Failed to delete file from S3');
  }
};

export const getSignedUrlForDownload = async (key, bucket = process.env.S3_BUCKET_NAME, expiresIn = 3600) => {
  try {
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key
    });

    const url = await getSignedUrl(s3Client, command, { expiresIn });
    return url;
  } catch (error) {
    logger.error('S3 signed URL error:', error);
    throw new Error('Failed to generate signed URL');
  }
};

export const uploadScreenshot = async (screenshotBuffer, userId, timestamp) => {
  const key = `screenshots/${userId}/${timestamp}.jpg`;

  try {
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: key,
      Body: screenshotBuffer,
      ContentType: 'image/jpeg',
      ServerSideEncryption: 'AES256',
      Metadata: {
        userId: userId.toString(),
        captureTime: timestamp.toString()
      }
    });

    await s3Client.send(command);

    return key;
  } catch (error) {
    logger.error('Screenshot upload error:', error);
    throw new Error('Failed to upload screenshot');
  }
};

export default s3Client;
