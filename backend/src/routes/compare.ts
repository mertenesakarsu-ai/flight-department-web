import express, { Response } from 'express';
import multer from 'multer';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { readExcelFile } from '../services/excelGenerator';
import { compareExcelToExcel, compareExcelToDB } from '../services/comparison';
import { ActionLog } from '../models/mongodb/ActionLog';

const router = express.Router();

// Configure multer for Excel file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (
      file.mimetype ===
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' ||
      file.mimetype === 'application/vnd.ms-excel'
    ) {
      cb(null, true);
    } else {
      cb(new Error('Only Excel files are allowed'));
    }
  },
});

// Apply auth middleware
router.use(authMiddleware);

// Compare Excel to Excel
router.post(
  '/excel-to-excel',
  upload.fields([
    { name: 'fileA', maxCount: 1 },
    { name: 'fileB', maxCount: 1 },
  ]),
  async (req: AuthRequest, res: Response) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const fileA = files?.fileA?.[0];
      const fileB = files?.fileB?.[0];

      if (!fileA || !fileB) {
        return res.status(400).json({ error: 'Both Excel files (fileA and fileB) are required' });
      }

      // Read both Excel files
      const passengersA = await readExcelFile(fileA.buffer);
      const passengersB = await readExcelFile(fileB.buffer);

      // Compare
      const differences = compareExcelToExcel(passengersA, passengersB);

      // Log action
      await ActionLog.create({
        userId: req.user!.userId,
        username: req.user!.username,
        actionType: 'COMPARE_EXCEL_EXCEL',
        detail: {
          fileAName: fileA.originalname,
          fileBName: fileB.originalname,
          excelARowCount: passengersA.length,
          excelBRowCount: passengersB.length,
          diffCounts: {
            NEW: differences.filter((d) => d.differenceType === 'NEW').length,
            DELETED: differences.filter((d) => d.differenceType === 'DELETED').length,
            UPDATED: differences.filter((d) => d.differenceType === 'UPDATED').length,
          },
        },
      });

      res.json({
        differences,
        summary: {
          total: differences.length,
          new: differences.filter((d) => d.differenceType === 'NEW').length,
          deleted: differences.filter((d) => d.differenceType === 'DELETED').length,
          updated: differences.filter((d) => d.differenceType === 'UPDATED').length,
        },
      });
    } catch (error) {
      console.error('Excel to Excel comparison error:', error);
      res.status(500).json({
        error: 'Failed to compare Excel files',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// Compare Excel to DB
router.post(
  '/excel-to-db',
  upload.single('file'),
  async (req: AuthRequest, res: Response) => {
    try {
      const file = req.file;
      const { flightId } = req.body;

      if (!file) {
        return res.status(400).json({ error: 'Excel file is required' });
      }

      // Read Excel file
      const passengers = await readExcelFile(file.buffer);

      // Compare with DB
      const differences = await compareExcelToDB(passengers, flightId);

      // Get DB count for logging
      const dbPassengerCount = flightId
        ? await require('../config/database').prisma.passenger.count({
            where: { flightId },
          })
        : await require('../config/database').prisma.passenger.count();

      // Log action
      await ActionLog.create({
        userId: req.user!.userId,
        username: req.user!.username,
        actionType: 'COMPARE_EXCEL_DB',
        detail: {
          fileName: file.originalname,
          excelRowCount: passengers.length,
          dbRowCount: dbPassengerCount,
          flightId: flightId || null,
          diffCounts: {
            NEW: differences.filter((d) => d.differenceType === 'NEW').length,
            DELETED: differences.filter((d) => d.differenceType === 'DELETED').length,
            UPDATED: differences.filter((d) => d.differenceType === 'UPDATED').length,
          },
        },
      });

      res.json({
        differences,
        summary: {
          total: differences.length,
          new: differences.filter((d) => d.differenceType === 'NEW').length,
          deleted: differences.filter((d) => d.differenceType === 'DELETED').length,
          updated: differences.filter((d) => d.differenceType === 'UPDATED').length,
        },
      });
    } catch (error) {
      console.error('Excel to DB comparison error:', error);
      res.status(500).json({
        error: 'Failed to compare Excel with database',
        message: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

export default router;

