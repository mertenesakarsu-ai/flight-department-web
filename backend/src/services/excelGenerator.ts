import ExcelJS from 'exceljs';
import { PassengerRow } from './textExtractor';
import path from 'path';
import fs from 'fs/promises';

export const generateExcelFromTemplate = async (
  passengers: PassengerRow[],
  templatePath?: string
): Promise<ExcelJS.Workbook> => {
  const workbook = new ExcelJS.Workbook();

  // Try to load template if provided, otherwise create new workbook
  if (templatePath) {
    try {
      const templateExists = await fs.access(templatePath).then(() => true).catch(() => false);
      if (templateExists) {
        await workbook.xlsx.readFile(templatePath);
      }
    } catch (error) {
      console.warn('Template file not found, creating new workbook:', error);
    }
  }

  // Get or create worksheet
  let worksheet = workbook.getWorksheet('Sayfa1') || workbook.addWorksheet('Sayfa1');

  // If worksheet is empty (new), set headers according to the template format
  if (worksheet.rowCount === 0) {
    // Set column headers matching the template format
    const headers = [
      'Operatör',
      'Product',
      'Reservation no',
      'Name and Surname',
      'Room Type',
      'Pax',
      'Flight details',
      'Paket',
      'Airline',
      'PNR',
      'Arrival date',
      'flight no',
      'Airport',
      'Flight time',
      '', // Column 15 empty
      'Airline',
      'PNR',
      'Departure date',
      'Flight no',
      'Airport',
      'Flight time',
      'note',
    ];

    const headerRow = worksheet.addRow(headers);

    // Style header row with yellow background and borders (matching template)
    headerRow.eachCell((cell, colNumber) => {
      cell.font = {
        bold: true,
        size: 11,
        name: 'Calibri',
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFF00' }, // Yellow background
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };

      // Center align specific columns (matching template)
      const centerAlignColumns = [3, 5, 6, 7, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21];
      if (centerAlignColumns.includes(colNumber)) {
        cell.alignment = { horizontal: 'center' };
      }
    });

    // Set column widths
    worksheet.columns = [
      { width: 12 }, // Operatör
      { width: 40 }, // Product
      { width: 15 }, // Reservation no
      { width: 25 }, // Name and Surname
      { width: 12 }, // Room Type
      { width: 8 },  // Pax
      { width: 15 }, // Flight details
      { width: 15 }, // Paket
      { width: 12 }, // Airline
      { width: 12 }, // PNR
      { width: 12 }, // Arrival date
      { width: 12 }, // flight no
      { width: 15 }, // Airport
      { width: 15 }, // Flight time
      { width: 3 },  // Empty column
      { width: 12 }, // Airline (return)
      { width: 12 }, // PNR (return)
      { width: 12 }, // Departure date (return)
      { width: 12 }, // Flight no (return)
      { width: 15 }, // Airport (return)
      { width: 15 }, // Flight time (return)
      { width: 20 }, // note
    ];
  }

  // Helper function to format date
  const formatDate = (dateStr: string): Date | string => {
    if (!dateStr) return '';
    try {
      // Try to parse common date formats
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        // If parsing fails, try DD/MM/YYYY or DD-MM-YYYY
        const parts = dateStr.replace(/[-\/]/g, '/').split('/');
        if (parts.length === 3) {
          // Assume DD/MM/YYYY
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          return new Date(year, month, day);
        }
        return dateStr;
      }
      return date;
    } catch {
      return dateStr;
    }
  };

  // Helper function to format time
  const formatTime = (timeStr: string): string => {
    if (!timeStr) return '';
    // If time is in format HH:MM, return as is, otherwise try to format
    if (timeStr.match(/^\d{1,2}:\d{2}$/)) {
      return timeStr;
    }
    return timeStr;
  };

  // Helper function to format airport code
  const formatAirport = (departure?: string, arrival?: string): string => {
    if (!departure && !arrival) return '';
    if (departure && arrival) return `${departure}-${arrival}`;
    return departure || arrival || '';
  };

  // Helper function to format room type to match template (DBL, SNG, TRP)
  const formatRoomType = (roomType: string): string => {
    const upper = roomType.toUpperCase();
    // Map common variations to template format
    if (upper.includes('SINGLE') || upper.includes('SNG') || upper === '1') return 'SNG';
    if (upper.includes('DOUBLE') || upper.includes('DBL') || upper === '2') return 'DBL';
    if (upper.includes('TRIPLE') || upper.includes('TRP') || upper === '3') return 'TRP';
    // Return as-is if already in correct format
    if (['SNG', 'DBL', 'TRP'].includes(upper)) return upper;
    return roomType; // Return original if unknown format
  };

  // Add passenger data
  passengers.forEach((passenger) => {
    const arrivalDate = formatDate(passenger.flightDate);
    const arrivalTime = formatTime(passenger.flightTime || '');
    const airport = formatAirport(passenger.departureAirport, passenger.arrivalAirport);

    const row = worksheet.addRow([
      passenger.airline || '', // Operatör
      '', // Product (empty for now)
      '', // Reservation no (empty for now)
      passenger.fullName, // Name and Surname
      formatRoomType(passenger.roomType || 'SINGLE'), // Room Type
      '', // Pax (empty for now)
      '', // Flight details (empty)
      '', // Paket (empty)
      passenger.airline || '', // Airline
      passenger.bookingReference || passenger.voucher || '', // PNR
      arrivalDate, // Arrival date
      passenger.flightNumber || '', // flight no
      airport, // Airport
      arrivalTime, // Flight time
      '', // Column 15 empty
      '', // Airline (return - empty for now)
      '', // PNR (return - empty for now)
      '', // Departure date (return - empty for now)
      '', // Flight no (return - empty for now)
      '', // Airport (return - empty for now)
      '', // Flight time (return - empty for now)
      '', // note
    ]);

    // Add borders to all cells
    row.eachCell((cell, colNumber) => {
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' },
      };

      // Center align same columns as header
      const centerAlignColumns = [3, 5, 6, 7, 9, 10, 11, 12, 13, 14, 16, 17, 18, 19, 20, 21];
      if (centerAlignColumns.includes(colNumber)) {
        cell.alignment = { horizontal: 'center' };
      }
    });
  });

  return workbook;
};

export const readExcelFile = async (buffer: Buffer): Promise<PassengerRow[]> => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.getWorksheet(1) || workbook.worksheets[0];
  if (!worksheet) {
    throw new Error('No worksheet found in Excel file');
  }

  const passengers: PassengerRow[] = [];
  let headerRow: { [key: string]: number } = {};

  // Find header row (usually row 1)
  const firstRow = worksheet.getRow(1);
  firstRow.eachCell((cell, colNumber) => {
    const header = cell.value?.toString().toLowerCase().replace(/\s+/g, '') || '';
    if (header) {
      headerRow[header] = colNumber;
    }
  });

  // Map header names to our PassengerRow fields (matching new template format)
  const headerMapping: { [key: string]: keyof PassengerRow } = {
    // Turkish/English variations
    'nameandsurname': 'fullName',
    'name and surname': 'fullName',
    'fullname': 'fullName',
    'name': 'fullName',
    'operatör': 'airline',
    'operator': 'airline',
    'airline': 'airline',
    'flightnumber': 'flightNumber',
    'flightno': 'flightNumber',
    'flight no': 'flightNumber',
    'arrivaldate': 'flightDate',
    'arrival date': 'flightDate',
    'departuredate': 'flightDate',
    'departure date': 'flightDate',
    'flightdate': 'flightDate',
    'date': 'flightDate',
    'flighttime': 'flightTime',
    'flight time': 'flightTime',
    'time': 'flightTime',
    'pnr': 'bookingReference',
    'bookingreference': 'bookingReference',
    'voucher': 'voucher',
    'reservationno': 'voucher',
    'reservation no': 'voucher',
    'roomtype': 'roomType',
    'room type': 'roomType',
    'room': 'roomType',
    'airport': 'departureAirport', // Will try to parse VIE-SAW format
    'passportnumber': 'passportNumber',
    'passport': 'passportNumber',
    'nationality': 'nationality',
  };

  // Helper to parse airport code (e.g., "VIE-SAW" -> departure: "VIE", arrival: "SAW")
  const parseAirport = (airportStr: string): { departure?: string; arrival?: string } => {
    if (!airportStr) return {};
    const parts = airportStr.split('-');
    if (parts.length === 2) {
      return { departure: parts[0].trim(), arrival: parts[1].trim() };
    }
    return { departure: airportStr.trim() };
  };

  // Helper to format date from Excel date
  const formatExcelDate = (value: any): string => {
    if (!value) return '';
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    if (typeof value === 'number') {
      // Excel date serial number
      const date = new Date((value - 25569) * 86400 * 1000);
      return date.toISOString().split('T')[0];
    }
    return value.toString().trim();
  };

  // Read data rows (skip header row)
  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return; // Skip header

    const passenger: Partial<PassengerRow> = {};

    Object.entries(headerMapping).forEach(([headerKey, fieldName]) => {
      const colNum = headerRow[headerKey];
      if (colNum) {
        const cell = row.getCell(colNum);
        let value = cell.value;
        
        // Handle different cell value types
        if (value instanceof Date) {
          if (fieldName === 'flightDate') {
            passenger.flightDate = value.toISOString().split('T')[0];
          }
        } else if (value !== null && value !== undefined) {
          value = value.toString().trim();
          if (value) {
            (passenger as any)[fieldName] = value;
          }
        }
      }
    });

    // Special handling for template format columns by position
    // Column 4: Name and Surname
    const nameCell = row.getCell(4);
    if (nameCell.value) {
      passenger.fullName = nameCell.value.toString().trim();
    }

    // Column 9: Airline
    const airlineCell = row.getCell(9);
    if (airlineCell.value && !passenger.airline) {
      passenger.airline = airlineCell.value.toString().trim();
    }

    // Column 10: PNR (can be booking reference or voucher)
    const pnrCell = row.getCell(10);
    if (pnrCell.value) {
      const pnrValue = pnrCell.value.toString().trim();
      if (!passenger.bookingReference) passenger.bookingReference = pnrValue;
      if (!passenger.voucher) passenger.voucher = pnrValue;
    }

    // Column 11: Arrival date
    const arrivalDateCell = row.getCell(11);
    if (arrivalDateCell.value && !passenger.flightDate) {
      passenger.flightDate = formatExcelDate(arrivalDateCell.value);
    }

    // Column 12: flight no
    const flightNoCell = row.getCell(12);
    if (flightNoCell.value && !passenger.flightNumber) {
      passenger.flightNumber = flightNoCell.value.toString().trim();
    }

    // Column 13: Airport (format: VIE-SAW)
    const airportCell = row.getCell(13);
    if (airportCell.value) {
      const airportData = parseAirport(airportCell.value.toString());
      if (airportData.departure) passenger.departureAirport = airportData.departure;
      if (airportData.arrival) passenger.arrivalAirport = airportData.arrival;
    }

    // Column 14: Flight time
    const flightTimeCell = row.getCell(14);
    if (flightTimeCell.value && !passenger.flightTime) {
      passenger.flightTime = flightTimeCell.value.toString().trim();
    }

    // Column 5: Room Type
    const roomTypeCell = row.getCell(5);
    if (roomTypeCell.value && !passenger.roomType) {
      passenger.roomType = roomTypeCell.value.toString().trim();
    }

    // Only add if we have at least a name
    if (passenger.fullName) {
      passengers.push({
        fullName: passenger.fullName || 'Unknown',
        flightDate: passenger.flightDate || new Date().toISOString().split('T')[0],
        flightTime: passenger.flightTime,
        voucher: passenger.voucher || '',
        roomType: (passenger.roomType as any) || 'SINGLE',
        airline: passenger.airline || '',
        flightNumber: passenger.flightNumber,
        departureAirport: passenger.departureAirport,
        arrivalAirport: passenger.arrivalAirport,
        bookingReference: passenger.bookingReference,
        passportNumber: passenger.passportNumber,
        nationality: passenger.nationality,
      });
    }
  });

  return passengers;
};

