import express, { Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { prisma } from '../config/database';
import { ActionLog } from '../models/mongodb/ActionLog';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get all flights with pagination
router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const where: any = {};

    if (req.query.airline) {
      where.airline = { contains: req.query.airline as string, mode: 'insensitive' };
    }

    if (req.query.flightNumber) {
      where.flightNumber = { contains: req.query.flightNumber as string, mode: 'insensitive' };
    }

    const [flights, total] = await Promise.all([
      prisma.flight.findMany({
        where,
        skip,
        take: limit,
        orderBy: { departureDate: 'desc' },
        include: {
          passengers: {
            select: {
              id: true,
              fullName: true,
              voucher: true,
              roomType: true,
            },
          },
        },
      }),
      prisma.flight.count({ where }),
    ]);

    res.json({
      flights,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get flights error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single flight
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const flight = await prisma.flight.findUnique({
      where: { id: req.params.id },
      include: {
        passengers: true,
      },
    });

    if (!flight) {
      return res.status(404).json({ error: 'Flight not found' });
    }

    res.json(flight);
  } catch (error) {
    console.error('Get flight error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create flight
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      airline,
      flightNumber,
      departureAirport,
      arrivalAirport,
      departureDate,
      departureTime,
      arrivalDate,
      arrivalTime,
      note,
    } = req.body;

    const flight = await prisma.flight.create({
      data: {
        airline,
        flightNumber,
        departureAirport,
        arrivalAirport,
        departureDate: new Date(departureDate),
        departureTime,
        arrivalDate: arrivalDate ? new Date(arrivalDate) : null,
        arrivalTime,
        note,
      },
    });

    // Log action
    await ActionLog.create({
      userId: req.user!.userId,
      username: req.user!.username,
      actionType: 'CREATE_FLIGHT',
      detail: { flightId: flight.id, airline, flightNumber },
    });

    res.status(201).json(flight);
  } catch (error) {
    console.error('Create flight error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update flight
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existingFlight = await prisma.flight.findUnique({
      where: { id: req.params.id },
    });

    if (!existingFlight) {
      return res.status(404).json({ error: 'Flight not found' });
    }

    const {
      airline,
      flightNumber,
      departureAirport,
      arrivalAirport,
      departureDate,
      departureTime,
      arrivalDate,
      arrivalTime,
      note,
    } = req.body;

    const flight = await prisma.flight.update({
      where: { id: req.params.id },
      data: {
        airline,
        flightNumber,
        departureAirport,
        arrivalAirport,
        departureDate: departureDate ? new Date(departureDate) : undefined,
        departureTime,
        arrivalDate: arrivalDate ? new Date(arrivalDate) : undefined,
        arrivalTime,
        note,
      },
    });

    // Log action
    await ActionLog.create({
      userId: req.user!.userId,
      username: req.user!.username,
      actionType: 'UPDATE_FLIGHT',
      detail: {
        flightId: flight.id,
        previous: existingFlight,
        updated: flight,
      },
    });

    res.json(flight);
  } catch (error) {
    console.error('Update flight error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete flight
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existingFlight = await prisma.flight.findUnique({
      where: { id: req.params.id },
      include: { passengers: true },
    });

    if (!existingFlight) {
      return res.status(404).json({ error: 'Flight not found' });
    }

    await prisma.flight.delete({
      where: { id: req.params.id },
    });

    // Log action
    await ActionLog.create({
      userId: req.user!.userId,
      username: req.user!.username,
      actionType: 'DELETE_FLIGHT',
      detail: {
        flightId: existingFlight.id,
        airline: existingFlight.airline,
        flightNumber: existingFlight.flightNumber,
        passengerCount: existingFlight.passengers.length,
      },
    });

    res.json({ message: 'Flight deleted successfully' });
  } catch (error) {
    console.error('Delete flight error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

