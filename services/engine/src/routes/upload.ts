import { Router, type Request, type Response } from 'express';
import multer from 'multer';
import { extname } from 'path';
import { logger } from '@/lib/logger';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowed = ['.csv', '.xlsx', '.xls', '.pdf', '.docx', '.doc'];
    const ext = extname(file.originalname).toLowerCase();
    if (allowed.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type: ${ext}`));
    }
  },
});

export const uploadRouter = Router();

uploadRouter.post('/', upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const ext = extname(req.file.originalname).toLowerCase();
    const sessionId = req.body.sessionId || 'unknown';
    const groupId = req.body.groupId || 'default';
    const fileName = req.file.originalname;
    const sizeKB = Math.round(req.file.size / 1024);

    logger.info({ fileName, ext, sizeKB, sessionId, groupId }, 'File uploaded via chat');

    if (['.csv', '.xlsx', '.xls'].includes(ext)) {
      // Parse tabular data using xlsx
      const XLSX = await import('xlsx');
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const sheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet);

      const headers = jsonData.length > 0 ? Object.keys(jsonData[0]) : [];
      const rowCount = jsonData.length;

      // Compute basic column stats
      const columnStats: Record<string, { type: string; sample: unknown }> = {};
      for (const h of headers) {
        const values = jsonData.slice(0, 100).map((r) => r[h]).filter((v) => v != null && v !== '');
        const numericCount = values.filter((v) => typeof v === 'number' || (!isNaN(Number(v)) && String(v).trim() !== '')).length;
        const isNumeric = values.length > 0 && numericCount / values.length > 0.7;
        columnStats[h] = {
          type: isNumeric ? 'numeric' : 'text',
          sample: values[0],
        };
      }

      return res.json({
        success: true,
        fileType: ext.replace('.', ''),
        fileName,
        sizeKB,
        summary: {
          headers,
          rowCount,
          columnCount: headers.length,
          columnStats,
          sheetName,
        },
        // Return first 10 rows as preview
        preview: jsonData.slice(0, 10),
      });
    }

    if (ext === '.pdf') {
      // Parse PDF
      const pdfParse = (await import('pdf-parse')).default;
      const pdfData = await pdfParse(req.file.buffer);

      return res.json({
        success: true,
        fileType: 'pdf',
        fileName,
        sizeKB,
        summary: {
          pageCount: pdfData.numpages,
          wordCount: pdfData.text.split(/\s+/).filter(Boolean).length,
          textLength: pdfData.text.length,
        },
        textPreview: pdfData.text.substring(0, 500),
      });
    }

    if (['.docx', '.doc'].includes(ext)) {
      // Parse Word document
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ buffer: req.file.buffer });
      const text = result.value;

      return res.json({
        success: true,
        fileType: 'docx',
        fileName,
        sizeKB,
        summary: {
          wordCount: text.split(/\s+/).filter(Boolean).length,
          textLength: text.length,
          paragraphCount: text.split(/\n\n+/).filter(Boolean).length,
        },
        textPreview: text.substring(0, 500),
      });
    }

    return res.status(400).json({ error: `Unsupported file type: ${ext}` });
  } catch (err) {
    logger.error({ err }, 'File upload processing failed');
    res.status(500).json({ error: 'Failed to process uploaded file' });
  }
});
