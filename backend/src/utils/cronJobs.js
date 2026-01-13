import cron from 'node-cron';
import Screenshot from '../models/Screenshot.js';
import { deleteFromS3 } from '../services/s3Service.js';
import logger from './logger.js';

const cleanupOldScreenshots = async () => {
  try {
    logger.info('Running screenshot cleanup job...');

    const screenshotsToDelete = await Screenshot.find({
      retentionDate: { $lte: new Date() },
      isDeleted: false
    });

    logger.info(`Found ${screenshotsToDelete.length} screenshots to delete`);

    for (const screenshot of screenshotsToDelete) {
      try {
        await deleteFromS3(screenshot.s3Key, screenshot.s3Bucket);

        await screenshot.markAsDeleted();

        logger.info(`Deleted screenshot: ${screenshot._id}`);
      } catch (error) {
        logger.error(`Failed to delete screenshot ${screenshot._id}:`, error);
      }
    }

    logger.info('Screenshot cleanup job completed');
  } catch (error) {
    logger.error('Screenshot cleanup job failed:', error);
  }
};

const cronJobs = {
  start: () => {
    cron.schedule('0 2 * * *', cleanupOldScreenshots);
    logger.info('Cron jobs started');
  }
};

export default cronJobs;
