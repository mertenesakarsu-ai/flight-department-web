import express, { Response } from 'express';
import { AuthRequest, authMiddleware } from '../middleware/auth';
import { prisma } from '../config/database';
import { ActionLog } from '../models/mongodb/ActionLog';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Get passengers for a flight
router.get('/flight/:flightId', async (req: AuthRequest, res: Response) => {
  try {
    const { flightId } = req.params;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 50;
    const skip = (page - 1) * limit;

    // Verify flight exists
    const flight = await prisma.flight.findUnique({
      where: { id: flightId },
    });

    if (!flight) {
      return res.status(404).json({ error: 'Flight not found' });
    }

    const [passengers, total] = await Promise.all([
      prisma.passenger.findMany({
        where: { flightId },
        skip,
        take: limit,
        orderBy: { fullName: 'asc' },
      }),
      prisma.passenger.count({ where: { flightId } }),
    ]);

    res.json({
      passengers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('Get passengers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get single passenger
router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const passenger = await prisma.passenger.findUnique({
      where: { id: req.params.id },
      include: {
        flight: true,
      },
    });

    if (!passenger) {
      return res.status(404).json({ error: 'Passenger not found' });
    }

    res.json(passenger);
  } catch (error) {
    console.error('Get passenger error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create passenger
router.post('/', async (req: AuthRequest, res: Response) => {
  try {
    const {
      flightId,
      fullName,
      firstName,
      lastName,
      voucher,
      roomType,
      bookingReference,
      passportNumber,
      nationality,
      checkInDate,
      checkOutDate,
    } = req.body;

    // Verify flight exists
    const flight = await prisma.flight.findUnique({
      where: { id: flightId },
    });

    if (!flight) {
      return res.status(404).json({ error: 'Flight not found' });
    }

    const passenger = await prisma.passenger.create({
      data: {
        flightId,
        fullName,
        firstName,
        lastName,
        voucher,
        roomType,
        bookingReference,
        passportNumber,
        nationality,
        checkInDate: checkInDate ? new Date(checkInDate) : null,
        checkOutDate: checkOutDate ? new Date(checkOutDate) : null,
      },
    });

    // Log action
    await ActionLog.create({
      userId: req.user!.userId,
      username: req.user!.username,
      actionType: 'CREATE_PASSENGER',
      detail: {
        passengerId: passenger.id,
        flightId,
        fullName,
        voucher,
      },
    });

    res.status(201).json(passenger);
  } catch (error) {
    console.error('Create passenger error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update passenger
router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existingPassenger = await prisma.passenger.findUnique({
      where: { id: req.params.id },
    });

    if (!existingPassenger) {
      return res.status(404).json({ error: 'Passenger not found' });
    }

    const {
      fullName,
      firstName,
      lastName,
      voucher,
      roomType,
      bookingReference,
      passportNumber,
      nationality,
      checkInDate,
      checkOutDate,
    } = req.body;

    const passenger = await prisma.passenger.update({
      where: { id: req.params.id },
      data: {
        fullName,
        firstName,
        lastName,
        voucher,
        roomType,
        bookingReference,
        passportNumber,
        nationality,
        checkInDate: checkInDate ? new Date(checkInDate) : undefined,
        checkOutDate: checkOutDate ? new Date(checkOutDate) : undefined,
      },
    });

    // Log action
    await ActionLog.create({
      userId: req.user!.userId,
      username: req.user!.username,
      actionType: 'UPDATE_PASSENGER',
      detail: {
        passengerId: passenger.id,
        previous: existingPassenger,
        updated: passenger,
      },
    });

    res.json(passenger);
  } catch (error) {
    console.error('Update passenger error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete passenger
router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const existingPassenger = await prisma.passenger.findUnique({
      where: { id: req.params.id },
    });

    if (!existingPassenger) {
      return res.status(404).json({ error: 'Passenger not found' });
    }

    await prisma.passenger.delete({
      where: { id: req.params.id },
    });

    // Log action
    await ActionLog.create({
      userId: req.user!.userId,
      username: req.user!.username,
      actionType: 'DELETE_PASSENGER',
      detail: {
        passengerId: existingPassenger.id,
        fullName: existingPassenger.fullName,
        voucher: existingPassenger.voucher,
      },
    });

    res.json({ message: 'Passenger deleted successfully' });
  } catch (error) {
    console.error('Delete passenger error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

