import pdfParse from 'pdf-parse';

export const parsePDF = async (buffer: Buffer): Promise<string> => {
  try {
    const data = await pdfParse(buffer);
    
    // Check if PDF is likely scanned (very little text extracted)
    const extractedText = data.text || '';
    const textLength = extractedText.trim().length;
    
    console.log('📄 PDF parsing result:');
    console.log('  - Pages:', data.numpages);
    console.log('  - Extracted text length:', textLength);
    console.log('  - Text preview (first 500 chars):', extractedText.substring(0, 500));
    
    // If very little text extracted, it's likely a scanned PDF
    if (textLength < 50 && data.numpages > 0) {
      console.warn('⚠️ WARNING: PDF appears to be scanned/image-based (very little text extracted)');
      console.warn('   The PDF may need OCR (Optical Character Recognition) to extract text.');
      console.warn('   Please use the "Ham Metin" (Raw Text) field to manually paste the content,');
      console.warn('   or consider using an OCR service to convert the PDF to text first.');
    }
    
    return extractedText;
  } catch (error) {
    console.error('PDF parsing error:', error);
    throw new Error('Failed to parse PDF file');
  }
};

export const parseMultiplePDFs = async (buffers: Buffer[]): Promise<string> => {
  const texts = await Promise.all(buffers.map(parsePDF));
  const combined = texts.join('\n\n');
  
  // If combined text is very short, warn user
  if (combined.trim().length < 50) {
    console.warn('⚠️ WARNING: All PDFs combined extracted less than 50 characters.');
    console.warn('   This suggests the PDFs are scanned/images and need OCR.');
  }
  
  return combined;
};

