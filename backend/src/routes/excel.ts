import express, { Response } from 'express';
import multer from 'multer';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { parseMultiplePDFs } from '../services/pdfParser';
import { extractPassengerData, PassengerRow } from '../services/textExtractor';
import { generateExcelFromTemplate } from '../services/excelGenerator';
import { ActionLog } from '../models/mongodb/ActionLog';

const router = express.Router();

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'application/pdf') {
      cb(null, true);
    } else {
      cb(new Error('Only PDF files are allowed'));
    }
  },
});

// Apply auth middleware
router.use(authMiddleware);

// Build Excel from PDFs and text
router.post('/build', upload.array('pdfs', 10), async (req: AuthRequest, res: Response) => {
  try {
    console.log('📄 Excel build request received');
    console.log('Company:', req.body.company);
    console.log('PDF files:', req.files ? (req.files as Express.Multer.File[]).length : 0);
    console.log('Raw text length:', req.body.rawText ? req.body.rawText.length : 0);

    const { company, rawText } = req.body;

    if (!company) {
      console.error('❌ Company is missing');
      return res.status(400).json({ error: 'Company is required' });
    }

    const pdfFiles = req.files as Express.Multer.File[];

    if ((!pdfFiles || pdfFiles.length === 0) && !rawText) {
      console.error('❌ No PDF files or raw text provided');
      return res.status(400).json({ error: 'At least one PDF file or raw text is required' });
    }

    // Parse PDFs
    let combinedText = '';
    if (pdfFiles && pdfFiles.length > 0) {
      console.log('📑 Parsing PDF files...');
      try {
        const pdfBuffers = pdfFiles.map((file) => file.buffer);
        combinedText = await parseMultiplePDFs(pdfBuffers);
        console.log('✅ PDFs parsed. Text length:', combinedText.length);
        console.log('📄 Full extracted text from PDF:');
        console.log('='.repeat(80));
        console.log(combinedText);
        console.log('='.repeat(80));
        
        // If text is empty or very short, there might be an issue
        if (!combinedText || combinedText.trim().length < 10) {
          console.warn('⚠️ WARNING: Extracted text from PDF is very short or empty!');
          console.warn('This could mean:');
          console.warn('  1. PDF is image-based (scanned) and needs OCR');
          console.warn('  2. PDF text is encoded in a non-standard way');
          console.warn('  3. PDF is password protected');
        }
      } catch (error) {
        console.error('❌ PDF parsing failed:', error);
        throw new Error(`PDF parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }

    // Add raw text if provided
    if (rawText) {
      console.log('📝 Adding raw text...');
      combinedText += '\n\n' + rawText;
    }

    // Extract passenger data
    console.log('🔍 Extracting passenger data...');
    console.log('Combined text length:', combinedText.length);
    if (combinedText.length > 0) {
      console.log('Combined text sample (first 1000 chars):', combinedText.substring(0, 1000));
      console.log('Combined text sample (last 500 chars):', combinedText.substring(Math.max(0, combinedText.length - 500)));
    } else {
      console.error('❌ Combined text is empty!');
    }
    
    const passengers = extractPassengerData(combinedText, company);
    console.log(`✅ Extracted ${passengers.length} passengers`);
    
    if (passengers.length === 0) {
      console.error('❌ No passenger data extracted');
      
      // Check if PDF was scanned (little text extracted)
      let errorMessage = 'No passenger data could be extracted from the provided files/text.';
      let suggestion = 'Please check your PDF format or try entering data manually in the raw text field.';
      
      if (combinedText.trim().length < 50) {
        errorMessage = 'PDF appears to be scanned or image-based. Text could not be extracted.';
        suggestion = 'Please use the "Ham Metin" (Raw Text) field to manually paste the passenger information from the PDF, or convert the PDF to text using OCR first.';
      }
      
      return res.status(400).json({ 
        error: errorMessage,
        suggestion: suggestion,
        extractedTextLength: combinedText.length,
        isLikelyScanned: combinedText.trim().length < 50
      });
    }

    // Generate Excel
    console.log('📊 Generating Excel file...');
    const templatePath = process.env.EXCEL_TEMPLATE_PATH;
    const workbook = await generateExcelFromTemplate(passengers, templatePath);
    console.log('✅ Excel workbook created');

    // Log action
    await ActionLog.create({
      userId: req.user!.userId,
      username: req.user!.username,
      actionType: 'GENERATE_EXCEL',
      detail: {
        company,
        rowCount: passengers.length,
        pdfCount: pdfFiles?.length || 0,
        hasRawText: !!rawText,
      },
    });

    // Generate buffer
    console.log('💾 Writing Excel buffer...');
    const buffer = await workbook.xlsx.writeBuffer();
    console.log('✅ Buffer created, size:', buffer.length);

    // Set headers and send file
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="passengers_${company}_${Date.now()}.xlsx"`
    );

    // Ensure buffer is a Buffer instance
    const fileBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
    console.log('✅ Sending Excel file to client');
    res.send(fileBuffer);
  } catch (error) {
    console.error('❌ Excel build error:', error);
    console.error('Error type:', error?.constructor?.name);
    console.error('Error message:', error instanceof Error ? error.message : 'Unknown');
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
    
    // If response already sent, don't try to send again
    if (res.headersSent) {
      console.error('⚠️ Response already sent, cannot send error response');
      return;
    }
    
    res.status(500).json({
      error: 'Failed to generate Excel file',
      message: error instanceof Error ? error.message : 'Unknown error',
      details: process.env.NODE_ENV === 'development' && error instanceof Error ? error.stack : undefined,
    });
  }
});

export default router;
