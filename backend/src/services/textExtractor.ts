export interface PassengerRow {
  fullName: string;
  flightDate: string;
  flightTime?: string;
  voucher: string;
  roomType: 'SINGLE' | 'DOUBLE' | 'TRIPLE' | string;
  airline: string;
  flightNumber?: string;
  departureAirport?: string;
  arrivalAirport?: string;
  bookingReference?: string;
  passportNumber?: string;
  nationality?: string;
}

// Regex patterns for common passenger data extraction
// This is a basic implementation - you may need to adjust based on actual PDF formats
const patterns = {
  name: /(?:Name|İsim|Ad|Soyad)[:]\s*([A-Z][a-zA-Z\s]+)/i,
  date: /(?:Date|Tarih)[:]\s*(\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4})/i,
  time: /(?:Time|Saat)[:]\s*(\d{1,2}:\d{2})/i,
  voucher: /(?:Voucher|Voucher No|Voucher Number)[:]\s*([A-Z0-9\-]+)/i,
  roomType: /(?:Room|Oda|Room Type)[:]\s*(SINGLE|DOUBLE|TRIPLE|SINGLE|DOUBLE|TRIPLE|1|2|3)/i,
  flightNumber: /(?:Flight|Flight No|Flight Number)[:]\s*([A-Z]{2,3}\d{3,4})/i,
  passport: /(?:Passport|Pasaport)[:]\s*([A-Z0-9]+)/i,
};

export const extractPassengerData = (
  text: string,
  company: string
): PassengerRow[] => {
  console.log('🔍 Starting extraction for company:', company);
  console.log('📄 Input text length:', text.length);
  console.log('📄 Input text sample (first 1000 chars):', text.substring(0, 1000));
  
  if (!text || text.trim().length === 0) {
    console.warn('⚠️ Input text is empty!');
    return [];
  }
  
  const passengers: PassengerRow[] = [];
  
  // Try multiple line splitting strategies
  const lines1 = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);
  const lines2 = text.split(/\r\n|\r|\n/).map((l) => l.trim()).filter((l) => l.length > 0);
  const lines = lines2.length > lines1.length ? lines2 : lines1;
  
  console.log('📝 Total lines after splitting:', lines.length);
  console.log('📝 First 20 lines:', lines.slice(0, 20));
  console.log('📝 All lines:', lines);

  // Improved extraction logic for PDF formats
  // Try to find passenger records using multiple strategies
  
  // Strategy 1: Look for structured data (Excel-like format or tabular data)
  const structuredPassengers = extractStructuredData(lines, company);
  if (structuredPassengers.length > 0) {
    console.log('✅ Found structured data:', structuredPassengers.length, 'passengers');
    passengers.push(...structuredPassengers);
  }

  // Strategy 2: If no structured data, try line-by-line extraction
  if (passengers.length === 0) {
    let currentPassenger: Partial<PassengerRow> | null = null;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Try to detect start of a passenger record
      // More flexible name patterns
      const namePatterns = [
        /([A-ZÜÖÇŞĞİ][a-züöçşığ]+(?:\s+[A-ZÜÖÇŞĞİ][a-züöçşığ]*\.?)*(?:\s+[A-ZÜÖÇŞĞİ][a-züöçşığ]+)+)/, // "John M. Doe"
        /([A-ZÜÖÇŞĞİ][a-züöçşığ]+\s+[A-ZÜÖÇŞĞİ][a-züöçşığ]+)/, // "John Doe"
        /([A-Z\s]{5,50})/, // "JOHN DOE" (all caps, 2-5 words)
        /([A-Z][a-z]+\s+[A-Z][a-z]+)/, // Basic "FirstName LastName"
      ];

      let nameMatch = null;
      for (const pattern of namePatterns) {
        const match = line.match(pattern);
        if (match && match[1].split(/\s+/).length >= 2 && match[1].length >= 5) {
          nameMatch = match;
          break;
        }
      }

      if (nameMatch) {
        // If we have a current passenger, save it
        if (currentPassenger && currentPassenger.fullName) {
          passengers.push(completePassengerRow(currentPassenger, company));
        }

        // Start new passenger
        currentPassenger = {
          fullName: nameMatch[1].trim(),
          airline: company,
        };
      }

      if (currentPassenger) {
        // Extract voucher
        if (!currentPassenger.voucher) {
          const vMatch = line.match(patterns.voucher);
          if (vMatch) {
            currentPassenger.voucher = vMatch[1];
          }
        }

        // Extract date
        if (!currentPassenger.flightDate) {
          const dMatch = line.match(patterns.date);
          if (dMatch) {
            currentPassenger.flightDate = dMatch[1];
          }
        }

        // Extract time
        if (!currentPassenger.flightTime) {
          const tMatch = line.match(patterns.time);
          if (tMatch) {
            currentPassenger.flightTime = tMatch[1];
          }
        }

        // Extract room type
        if (!currentPassenger.roomType) {
          const rMatch = line.match(patterns.roomType);
          if (rMatch) {
            const rt = rMatch[1].toUpperCase();
            if (rt === '1' || rt === 'SINGLE') {
              currentPassenger.roomType = 'SINGLE';
            } else if (rt === '2' || rt === 'DOUBLE') {
              currentPassenger.roomType = 'DOUBLE';
            } else if (rt === '3' || rt === 'TRIPLE') {
              currentPassenger.roomType = 'TRIPLE';
            } else {
              currentPassenger.roomType = rt;
            }
          }
        }

        // Extract flight number (more flexible patterns)
        if (!currentPassenger.flightNumber) {
          const fMatch = line.match(patterns.flightNumber);
          if (fMatch) {
            currentPassenger.flightNumber = fMatch[1];
          } else {
            // Try alternative flight number patterns
            const altMatch = line.match(/([A-Z]{2,3}\s*\d{3,4})/i);
            if (altMatch) {
              currentPassenger.flightNumber = altMatch[1].replace(/\s+/g, '');
            }
          }
        }

        // Extract airport codes (format: XXX-YYY or XXX to YYY)
        if (!currentPassenger.departureAirport || !currentPassenger.arrivalAirport) {
          const airportMatch = line.match(/([A-Z]{3})[\s-]+([A-Z]{3})/i);
          if (airportMatch) {
            currentPassenger.departureAirport = airportMatch[1].toUpperCase();
            currentPassenger.arrivalAirport = airportMatch[2].toUpperCase();
          }
        }
      }
    }

    // Don't forget the last passenger
    if (currentPassenger && currentPassenger.fullName) {
      passengers.push(completePassengerRow(currentPassenger, company));
    }
  }

  // If no structured data found, try a simpler approach: split by double newlines or common delimiters
  if (passengers.length === 0) {
    console.log('⚠️ No structured data found, trying fallback extraction...');
    // Fallback: try to find any structured data
    const fallbackData = extractFallbackData(text, company);
    console.log(`📊 Fallback extracted ${fallbackData.length} passengers`);
    passengers.push(...fallbackData);
  }
  
  // If still no data, try even simpler: just look for lines that look like names
  if (passengers.length === 0) {
    console.log('⚠️ Still no data, trying very simple name detection...');
    const simpleData = extractSimpleNames(text, company);
    console.log(`📊 Simple extraction found ${simpleData.length} passengers`);
    passengers.push(...simpleData);
  }

  console.log(`✅ Final result: ${passengers.length} passengers extracted`);
  if (passengers.length > 0) {
    console.log('📋 First passenger:', passengers[0]);
  }

  return passengers;
};

const completePassengerRow = (
  partial: Partial<PassengerRow>,
  company: string
): PassengerRow => {
  return {
    fullName: partial.fullName || 'Unknown',
    flightDate: partial.flightDate || new Date().toISOString().split('T')[0],
    flightTime: partial.flightTime,
    voucher: partial.voucher || '',
    roomType: partial.roomType || 'SINGLE',
    airline: company,
    flightNumber: partial.flightNumber,
    departureAirport: partial.departureAirport,
    arrivalAirport: partial.arrivalAirport,
    bookingReference: partial.bookingReference,
    passportNumber: partial.passportNumber,
    nationality: partial.nationality,
  };
};

const extractFallbackData = (text: string, company: string): PassengerRow[] => {
  // Very basic fallback - just find lines that look like names
  const lines = text.split('\n');
  const passengers: PassengerRow[] = [];

  for (const line of lines) {
    const trimmed = line.trim();
    // Look for lines with 2-4 capitalized words (likely names)
    const nameMatch = trimmed.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})$/);
    if (nameMatch) {
      passengers.push({
        fullName: nameMatch[1],
        flightDate: new Date().toISOString().split('T')[0],
        voucher: '',
        roomType: 'SINGLE',
        airline: company,
      });
    }
  }

  return passengers;
};

// Extract structured data (tabular format, Excel-like, CSV-like)
const extractStructuredData = (lines: string[], company: string): PassengerRow[] => {
  const passengers: PassengerRow[] = [];
  
  // Look for table-like data where fields might be separated by:
  // - Tabs
  // - Multiple spaces
  // - Pipes (|)
  // - Commas
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip obvious header rows
    if (line.match(/^(Operatör|Operator|Name|İsim|Ad|Surname|Soyad|Voucher|PNR|Flight|Room|Date|Tarih)/i)) {
      continue;
    }
    
    // Try tab-separated values
    if (line.includes('\t')) {
      const parts = line.split('\t').map(p => p.trim()).filter(p => p.length > 0);
      if (parts.length >= 2) {
        const passenger = parseStructuredRow(parts, company);
        if (passenger) {
          passengers.push(passenger);
        }
      }
    }
    
    // Try pipe-separated
    if (line.includes('|')) {
      const parts = line.split('|').map(p => p.trim()).filter(p => p.length > 0);
      if (parts.length >= 2) {
        const passenger = parseStructuredRow(parts, company);
        if (passenger) {
          passengers.push(passenger);
        }
      }
    }
    
    // Try comma-separated (CSV-like)
    if (line.includes(',') && !line.match(/^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/)) {
      const parts = line.split(',').map(p => p.trim()).filter(p => p.length > 0);
      if (parts.length >= 2 && parts[0].match(/[A-Z][a-z]+/)) {
        const passenger = parseStructuredRow(parts, company);
        if (passenger) {
          passengers.push(passenger);
        }
      }
    }
    
    // Try multiple spaces (fixed-width like)
    const parts = line.split(/\s{2,}/).map(p => p.trim()).filter(p => p.length > 0);
    if (parts.length >= 3 && parts[0].match(/[A-ZÜÖÇŞĞİ][a-züöçşığ]+/i)) {
      const passenger = parseStructuredRow(parts, company);
      if (passenger) {
        passengers.push(passenger);
      }
    }
  }
  
  return passengers;
};

// Helper to parse a structured row into a passenger
const parseStructuredRow = (parts: string[], company: string): PassengerRow | null => {
  if (parts.length < 2) return null;
  
  // Try to identify fields by position and content
  let fullName = '';
  let voucher = '';
  let roomType = '';
  let flightNumber = '';
  let flightDate = '';
  let flightTime = '';
  let airline = company;
  let departureAirport = '';
  let arrivalAirport = '';
  
  // First part is usually name if it looks like a name
  if (parts[0].match(/[A-ZÜÖÇŞĞİ][a-züöçşığ]+/i) && parts[0].length > 3) {
    fullName = parts[0];
  }
  
  // Look through all parts
  for (const part of parts) {
    // Name (2-5 words, starts with capital)
    if (!fullName && part.match(/^[A-ZÜÖÇŞĞİ][a-züöçşığ]+(?:\s+[A-ZÜÖÇŞĞİ][a-züöçşığ]+)+$/i) && part.split(/\s+/).length >= 2) {
      fullName = part;
    }
    
    // Voucher/PNR (alphanumeric, 6-12 chars)
    if (!voucher && part.match(/^[A-Z0-9]{6,12}$/i)) {
      voucher = part.toUpperCase();
    }
    
    // Room type
    if (!roomType && part.match(/^(SINGLE|DOUBLE|TRIPLE|SNG|DBL|TRP|1|2|3)$/i)) {
      roomType = part.toUpperCase();
    }
    
    // Flight number
    if (!flightNumber && part.match(/^[A-Z]{2,3}\d{3,4}$/i)) {
      flightNumber = part.toUpperCase();
    }
    
    // Date (DD/MM/YYYY, DD-MM-YYYY, etc.)
    if (!flightDate && part.match(/^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}$/)) {
      flightDate = part;
    }
    
    // Time (HH:MM)
    if (!flightTime && part.match(/^\d{1,2}:\d{2}$/)) {
      flightTime = part;
    }
    
    // Airport codes (XXX-YYY)
    if (part.match(/^[A-Z]{3}-[A-Z]{3}$/i)) {
      const [dep, arr] = part.split('-');
      departureAirport = dep.toUpperCase();
      arrivalAirport = arr.toUpperCase();
    }
    
    // Airline
    if (part.match(/^(PEGASUS|RYANAIR|EASYJET|TURKISH|PEGASUS|SUNEXPRESS)$/i)) {
      airline = part.toUpperCase();
    }
  }
  
  if (!fullName) return null;
  
  return {
    fullName,
    flightDate: flightDate || new Date().toISOString().split('T')[0],
    flightTime: flightTime || undefined,
    voucher: voucher || '',
    roomType: roomType || 'SINGLE',
    airline: airline || company,
    flightNumber: flightNumber || undefined,
    departureAirport: departureAirport || undefined,
    arrivalAirport: arrivalAirport || undefined,
  };
};

const extractSimpleNames = (text: string, company: string): PassengerRow[] => {
  const passengers: PassengerRow[] = [];
  const lines = text.split(/\n|\r\n/).map((l) => l.trim()).filter((l) => l.length > 2);

  // Try to find patterns like:
  // "John Doe" or "John M. Doe" or "JOHN DOE"
  // Look for 2-5 words where at least first letter of each word is capital
  
  const namePatterns = [
    /^([A-ZÜÖÇŞĞİ][a-züöçşığ]+(?:\s+[A-ZÜÖÇŞĞİ][a-züöçşığ]*\.?)*(?:\s+[A-ZÜÖÇŞĞİ][a-züöçşığ]+)+)$/, // "John M. Doe"
    /^([A-ZÜÖÇŞĞİ][a-züöçşığ]+\s+[A-ZÜÖÇŞĞİ][a-züöçşığ]+)$/, // "John Doe"
    /^([A-Z\s]{5,50})$/, // "JOHN DOE" (all caps)
  ];

  const seenNames = new Set<string>();

  for (const line of lines) {
    // Skip obvious non-names
    if (
      line.match(/^(Date|Tarih|Time|Saat|Voucher|Room|Flight|Passport|Booking|Email|Phone|Tel|Address)/i) ||
      line.match(/^\d+/) || // Starts with number
      line.length < 3 ||
      line.length > 100 ||
      line.includes('@') || // Email
      line.includes('http') || // URL
      line.match(/^\d{1,2}[-\/]\d{1,2}[-\/]\d{2,4}/) // Date pattern
    ) {
      continue;
    }

    for (const pattern of namePatterns) {
      const match = line.match(pattern);
      if (match) {
        const name = match[1].trim();
        // Avoid duplicates
        const nameKey = name.toLowerCase();
        if (!seenNames.has(nameKey) && name.split(/\s+/).length >= 2) {
          seenNames.add(nameKey);
          passengers.push({
            fullName: name,
            flightDate: new Date().toISOString().split('T')[0],
            voucher: '',
            roomType: 'SINGLE',
            airline: company,
          });
          break; // Found a match, move to next line
        }
      }
    }
  }

  return passengers;
};

