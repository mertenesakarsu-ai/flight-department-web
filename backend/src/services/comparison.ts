import { PassengerRow } from './textExtractor';
import { prisma } from '../config/database';

export type DifferenceType = 'NEW' | 'DELETED' | 'UPDATED';

export interface FieldChange {
  field: string;
  oldValue: any;
  newValue: any;
}

export interface DifferenceRow {
  key: string;
  differenceType: DifferenceType;
  sideA?: any;
  sideB?: any;
  changes?: FieldChange[];
  statusText?: string;
}

const getNormalizedIdentifier = (row: PassengerRow): string | undefined => {
  const identifier =
    row.bookingReference?.toLowerCase().trim() ||
    row.voucher?.toLowerCase().trim() ||
    row.passportNumber?.toLowerCase().trim();

  if (identifier && identifier.length > 0) {
    return identifier;
  }
  return undefined;
};

// Generate a unique key for a passenger row
const generateKey = (row: PassengerRow): string => {
  const identifier = getNormalizedIdentifier(row);
  if (identifier) {
    const parts = [identifier, row.flightDate?.trim() || '', row.flightNumber?.toLowerCase().trim() || ''];
    return parts.filter((p) => p).join('|');
  }

  const fallbackParts = [
    row.fullName?.toLowerCase().trim() || '',
    row.voucher?.toLowerCase().trim() || '',
    row.flightDate?.trim() || '',
    row.flightNumber?.toLowerCase().trim() || '',
  ];

  const key = fallbackParts.filter((p) => p).join('|');
  return key || Math.random().toString(36).substring(2, 10);
};

// Compare two passenger rows and return field changes
const compareRows = (rowA: PassengerRow, rowB: PassengerRow): FieldChange[] => {
  const changes: FieldChange[] = [];
  const fieldsToCompare: (keyof PassengerRow)[] = [
    'fullName',
    'flightDate',
    'flightTime',
    'voucher',
    'roomType',
    'airline',
    'flightNumber',
    'departureAirport',
    'arrivalAirport',
    'bookingReference',
    'passportNumber',
    'nationality',
  ];

  fieldsToCompare.forEach((field) => {
    const valA = String(rowA[field] || '').trim();
    const valB = String(rowB[field] || '').trim();

    if (valA !== valB) {
      changes.push({
        field,
        oldValue: valA || null,
        newValue: valB || null,
      });
    }
  });

  return changes;
};

// Compare Excel vs Excel
export const compareExcelToExcel = (
  passengersA: PassengerRow[],
  passengersB: PassengerRow[]
): DifferenceRow[] => {
  const differences: DifferenceRow[] = [];
  const mapA = new Map<string, PassengerRow>();
  const mapB = new Map<string, PassengerRow>();

  // Build maps
  passengersA.forEach((p) => {
    const key = generateKey(p);
    mapA.set(key, p);
  });

  passengersB.forEach((p) => {
    const key = generateKey(p);
    mapB.set(key, p);
  });

  // Find NEW in B (exists in B but not in A)
  mapB.forEach((rowB, key) => {
    if (!mapA.has(key)) {
      differences.push({
        key,
        differenceType: 'NEW',
        sideB: rowB,
        statusText: 'Yeni Kayıt / New',
      });
    }
  });

  // Find DELETED from A perspective (exists in A but not in B)
  mapA.forEach((rowA, key) => {
    if (!mapB.has(key)) {
      differences.push({
        key,
        differenceType: 'DELETED',
        sideA: rowA,
        statusText: 'Silinmiş / Deleted',
      });
    }
  });

  // Find UPDATED (exists in both but different)
  mapA.forEach((rowA, key) => {
    const rowB = mapB.get(key);
    if (rowB) {
      const changes = compareRows(rowA, rowB);
      if (changes.length > 0) {
        // Generate detailed status text
        const fieldNames = changes.map((c) => {
        const fieldMap: { [key: string]: string } = {
          fullName: 'İsim',
          flightDate: 'Tarih',
          flightTime: 'Saat',
          voucher: 'Voucher',
          bookingReference: 'PNR / Referans',
          roomType: 'Oda Tipi',
          airline: 'Havayolu',
          flightNumber: 'Uçuş No',
          departureAirport: 'Kalkış',
          arrivalAirport: 'Varış',
          passportNumber: 'Pasaport No',
          nationality: 'Uyruk',
        };
        return fieldMap[c.field] || c.field;
      });

        differences.push({
          key,
          differenceType: 'UPDATED',
          sideA: rowA,
          sideB: rowB,
          changes,
          statusText: `Güncellenmiş / Updated (${fieldNames.join(', ')})`,
        });
      }
    }
  });

  return differences;
};

// Compare Excel vs DB
export const compareExcelToDB = async (
  passengers: PassengerRow[],
  flightId?: string
): Promise<DifferenceRow[]> => {
  const differences: DifferenceRow[] = [];

  // Build map from Excel data
  const excelMap = new Map<string, PassengerRow>();
  passengers.forEach((p) => {
    const key = generateKey(p);
    excelMap.set(key, p);
  });

  // Fetch passengers from DB
  let dbPassengers;
  if (flightId) {
    // Get passengers for specific flight
    const flight = await prisma.flight.findUnique({
      where: { id: flightId },
      include: { passengers: true },
    });
    dbPassengers = flight?.passengers || [];
  } else {
    // Get all passengers (or you might want to filter by airline/flightDate from Excel)
    dbPassengers = await prisma.passenger.findMany({
      include: { flight: true },
    });
  }

  // Convert DB passengers to PassengerRow format
  const dbRows: PassengerRow[] = dbPassengers.map((p) => ({
    fullName: p.fullName,
    flightDate: p.flight?.departureDate
      ? new Date(p.flight.departureDate).toISOString().split('T')[0]
      : '',
    flightTime: p.flight?.departureTime || undefined,
    voucher: p.voucher,
    roomType: p.roomType,
    airline: p.flight?.airline || '',
    flightNumber: p.flight?.flightNumber || undefined,
    departureAirport: p.flight?.departureAirport || undefined,
    arrivalAirport: p.flight?.arrivalAirport || undefined,
    bookingReference: p.bookingReference || undefined,
    passportNumber: p.passportNumber || undefined,
    nationality: p.nationality || undefined,
  }));

  // Build map from DB data
  const dbMap = new Map<string, PassengerRow & { dbId?: string }>();
  dbRows.forEach((p, index) => {
    const key = generateKey(p);
    dbMap.set(key, { ...p, dbId: dbPassengers[index].id });
  });

  // Find NEW (exists in Excel but not in DB)
  excelMap.forEach((excelRow, key) => {
    if (!dbMap.has(key)) {
      differences.push({
        key,
        differenceType: 'NEW',
        sideB: excelRow,
        statusText: 'Yeni Kayıt / New',
      });
    }
  });

  // Find DELETED (exists in DB but not in Excel)
  dbMap.forEach((dbRow, key) => {
    if (!excelMap.has(key)) {
      differences.push({
        key,
        differenceType: 'DELETED',
        sideA: dbRow,
        statusText: 'Silinmiş / Deleted',
      });
    }
  });

  // Find UPDATED (exists in both but different)
  excelMap.forEach((excelRow, key) => {
    const dbRow = dbMap.get(key);
    if (dbRow) {
      const changes = compareRows(excelRow, dbRow);
      if (changes.length > 0) {
        const fieldNames = changes.map((c) => {
          const fieldMap: { [key: string]: string } = {
            fullName: 'İsim',
            flightDate: 'Tarih',
            flightTime: 'Saat',
            voucher: 'Voucher',
            roomType: 'Oda Tipi',
            airline: 'Havayolu',
            flightNumber: 'Uçuş No',
          };
          return fieldMap[c.field] || c.field;
        });

        differences.push({
          key,
          differenceType: 'UPDATED',
          sideA: dbRow,
          sideB: excelRow,
          changes,
          statusText: `Güncellenmiş / Updated (${fieldNames.join(', ')})`,
        });
      }
    }
  });

  return differences;
};

