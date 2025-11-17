import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { flightsAPI, passengersAPI } from '@/lib/api';
import { Plus, Edit, Trash2 } from 'lucide-react';

interface Flight {
  id: string;
  airline: string;
  flightNumber: string;
  departureAirport: string;
  arrivalAirport: string;
  departureDate: string;
  departureTime?: string;
  note?: string;
}

interface Passenger {
  id: string;
  fullName: string;
  voucher: string;
  roomType: string;
  bookingReference?: string;
  passportNumber?: string;
}

export default function DataManagement() {
  const [flights, setFlights] = useState<Flight[]>([]);
  const [passengers, setPassengers] = useState<Passenger[]>([]);
  const [selectedFlightId, setSelectedFlightId] = useState<string>('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFlights();
  }, []);

  useEffect(() => {
    if (selectedFlightId) {
      loadPassengers(selectedFlightId);
    }
  }, [selectedFlightId]);

  const loadFlights = async () => {
    try {
      const response = await flightsAPI.getAll({ limit: 100 });
      setFlights(response.flights);
    } catch (error) {
      console.error('Error loading flights:', error);
    }
  };

  const loadPassengers = async (flightId: string) => {
    try {
      const response = await passengersAPI.getByFlight(flightId, { limit: 100 });
      setPassengers(response.passengers);
    } catch (error) {
      console.error('Error loading passengers:', error);
    }
  };

  return (
    <Tabs defaultValue="flights" className="w-full">
      <TabsList className="grid w-full grid-cols-2 mb-6">
        <TabsTrigger value="flights">Uçuşlar</TabsTrigger>
        <TabsTrigger value="passengers">Yolcular</TabsTrigger>
      </TabsList>

      <TabsContent value="flights">
        <FlightsTab flights={flights} onRefresh={loadFlights} />
      </TabsContent>

      <TabsContent value="passengers">
        <PassengersTab
          flights={flights}
          passengers={passengers}
          selectedFlightId={selectedFlightId}
          onFlightChange={setSelectedFlightId}
          onRefresh={() => selectedFlightId && loadPassengers(selectedFlightId)}
        />
      </TabsContent>
    </Tabs>
  );
}

function FlightsTab({ flights, onRefresh }: { flights: Flight[]; onRefresh: () => void }) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingFlight, setEditingFlight] = useState<Flight | null>(null);
  const [formData, setFormData] = useState({
    airline: '',
    flightNumber: '',
    departureAirport: '',
    arrivalAirport: '',
    departureDate: '',
    departureTime: '',
    arrivalDate: '',
    arrivalTime: '',
    note: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingFlight) {
        await flightsAPI.update(editingFlight.id, formData);
      } else {
        await flightsAPI.create(formData);
      }
      setDialogOpen(false);
      resetForm();
      onRefresh();
    } catch (error) {
      console.error('Error saving flight:', error);
      alert('Hata: Uçuş kaydedilemedi');
    }
  };

  const handleEdit = (flight: Flight) => {
    setEditingFlight(flight);
    setFormData({
      airline: flight.airline,
      flightNumber: flight.flightNumber,
      departureAirport: flight.departureAirport,
      arrivalAirport: flight.arrivalAirport,
      departureDate: flight.departureDate.split('T')[0],
      departureTime: flight.departureTime || '',
      arrivalDate: '',
      arrivalTime: '',
      note: flight.note || '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu uçuşu silmek istediğinize emin misiniz?')) return;
    try {
      await flightsAPI.delete(id);
      onRefresh();
    } catch (error) {
      alert('Hata: Uçuş silinemedi');
    }
  };

  const resetForm = () => {
    setEditingFlight(null);
    setFormData({
      airline: '',
      flightNumber: '',
      departureAirport: '',
      arrivalAirport: '',
      departureDate: '',
      departureTime: '',
      arrivalDate: '',
      arrivalTime: '',
      note: '',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Uçuş Yönetimi</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Uçuş
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingFlight ? 'Uçuş Düzenle' : 'Yeni Uçuş'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Havayolu</Label>
                  <Input
                    value={formData.airline}
                    onChange={(e) => setFormData({ ...formData, airline: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Uçuş Numarası</Label>
                  <Input
                    value={formData.flightNumber}
                    onChange={(e) => setFormData({ ...formData, flightNumber: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kalkış Havaalanı</Label>
                  <Input
                    value={formData.departureAirport}
                    onChange={(e) => setFormData({ ...formData, departureAirport: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Varış Havaalanı</Label>
                  <Input
                    value={formData.arrivalAirport}
                    onChange={(e) => setFormData({ ...formData, arrivalAirport: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kalkış Tarihi</Label>
                  <Input
                    type="date"
                    value={formData.departureDate}
                    onChange={(e) => setFormData({ ...formData, departureDate: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kalkış Saati</Label>
                  <Input
                    type="time"
                    value={formData.departureTime}
                    onChange={(e) => setFormData({ ...formData, departureTime: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Not</Label>
                <Input
                  value={formData.note}
                  onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  İptal
                </Button>
                <Button type="submit">Kaydet</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Havayolu</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Uçuş No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Kalkış</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Varış</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Tarih</th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {flights.map((flight) => (
                  <tr key={flight.id}>
                    <td className="px-4 py-3">{flight.airline}</td>
                    <td className="px-4 py-3">{flight.flightNumber}</td>
                    <td className="px-4 py-3">{flight.departureAirport}</td>
                    <td className="px-4 py-3">{flight.arrivalAirport}</td>
                    <td className="px-4 py-3">{new Date(flight.departureDate).toLocaleDateString('tr-TR')}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(flight)}>
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(flight.id)}>
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function PassengersTab({
  flights,
  passengers,
  selectedFlightId,
  onFlightChange,
  onRefresh,
}: {
  flights: Flight[];
  passengers: Passenger[];
  selectedFlightId: string;
  onFlightChange: (id: string) => void;
  onRefresh: () => void;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPassenger, setEditingPassenger] = useState<Passenger | null>(null);
  const [formData, setFormData] = useState({
    flightId: selectedFlightId,
    fullName: '',
    firstName: '',
    lastName: '',
    voucher: '',
    roomType: 'SINGLE',
    bookingReference: '',
    passportNumber: '',
    nationality: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingPassenger) {
        await passengersAPI.update(editingPassenger.id, formData);
      } else {
        await passengersAPI.create(formData);
      }
      setDialogOpen(false);
      resetForm();
      onRefresh();
    } catch (error) {
      alert('Hata: Yolcu kaydedilemedi');
    }
  };

  const handleEdit = (passenger: Passenger) => {
    setEditingPassenger(passenger);
    // Load full passenger data if needed
    setFormData({
      flightId: selectedFlightId,
      fullName: passenger.fullName,
      firstName: '',
      lastName: '',
      voucher: passenger.voucher,
      roomType: passenger.roomType,
      bookingReference: passenger.bookingReference || '',
      passportNumber: passenger.passportNumber || '',
      nationality: '',
    });
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu yolcuyu silmek istediğinize emin misiniz?')) return;
    try {
      await passengersAPI.delete(id);
      onRefresh();
    } catch (error) {
      alert('Hata: Yolcu silinemedi');
    }
  };

  const resetForm = () => {
    setEditingPassenger(null);
    setFormData({
      flightId: selectedFlightId,
      fullName: '',
      firstName: '',
      lastName: '',
      voucher: '',
      roomType: 'SINGLE',
      bookingReference: '',
      passportNumber: '',
      nationality: '',
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Yolcu Yönetimi</h2>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm} disabled={!selectedFlightId}>
              <Plus className="h-4 w-4 mr-2" />
              Yeni Yolcu
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingPassenger ? 'Yolcu Düzenle' : 'Yeni Yolcu'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Uçuş Seçin</Label>
                <Select value={formData.flightId} onValueChange={(v) => setFormData({ ...formData, flightId: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Uçuş seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {flights.map((flight) => (
                      <SelectItem key={flight.id} value={flight.id}>
                        {flight.airline} - {flight.flightNumber} ({flight.departureAirport} → {flight.arrivalAirport})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tam Ad</Label>
                  <Input
                    value={formData.fullName}
                    onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Voucher</Label>
                  <Input
                    value={formData.voucher}
                    onChange={(e) => setFormData({ ...formData, voucher: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Oda Tipi</Label>
                  <Select value={formData.roomType} onValueChange={(v) => setFormData({ ...formData, roomType: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="SINGLE">Single</SelectItem>
                      <SelectItem value="DOUBLE">Double</SelectItem>
                      <SelectItem value="TRIPLE">Triple</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Pasaport No</Label>
                  <Input
                    value={formData.passportNumber}
                    onChange={(e) => setFormData({ ...formData, passportNumber: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  İptal
                </Button>
                <Button type="submit">Kaydet</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-2">
        <Label>Uçuş Seçin</Label>
        <Select value={selectedFlightId} onValueChange={onFlightChange}>
          <SelectTrigger>
            <SelectValue placeholder="Filtrelemek için uçuş seçin" />
          </SelectTrigger>
          <SelectContent>
            {flights.map((flight) => (
              <SelectItem key={flight.id} value={flight.id}>
                {flight.airline} - {flight.flightNumber} ({new Date(flight.departureDate).toLocaleDateString('tr-TR')})
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedFlightId && (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Ad</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Voucher</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Oda Tipi</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase">İşlemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {passengers.map((passenger) => (
                    <tr key={passenger.id}>
                      <td className="px-4 py-3">{passenger.fullName}</td>
                      <td className="px-4 py-3">{passenger.voucher}</td>
                      <td className="px-4 py-3">{passenger.roomType}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="sm" variant="ghost" onClick={() => handleEdit(passenger)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => handleDelete(passenger.id)}>
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

