import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { compareAPI, flightsAPI } from '@/lib/api';
import { FileSpreadsheet, ArrowLeftRight } from 'lucide-react';
import { useEffect } from 'react';

interface DifferenceRow {
  key: string;
  differenceType: 'NEW' | 'DELETED' | 'UPDATED';
  sideA?: any;
  sideB?: any;
  changes?: Array<{ field: string; oldValue: any; newValue: any }>;
  statusText?: string;
}

export default function ComparisonSystem() {
  const [flights, setFlights] = useState<any[]>([]);
  const [excelToExcelResult, setExcelToExcelResult] = useState<{ differences: DifferenceRow[]; summary: any } | null>(null);
  const [excelToDbResult, setExcelToDbResult] = useState<{ differences: DifferenceRow[]; summary: any } | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadFlights();
  }, []);

  const loadFlights = async () => {
    try {
      const response = await flightsAPI.getAll({ limit: 100 });
      setFlights(response.flights);
    } catch (error) {
      console.error('Error loading flights:', error);
    }
  };

  const handleExcelToExcel = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const fileA = formData.get('fileA') as File;
    const fileB = formData.get('fileB') as File;

    if (!fileA || !fileB) {
      setError('Her iki Excel dosyasını da seçin');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const compareFormData = new FormData();
      compareFormData.append('fileA', fileA);
      compareFormData.append('fileB', fileB);

      const result = await compareAPI.excelToExcel(compareFormData);
      setExcelToExcelResult(result);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Karşılaştırma sırasında bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleExcelToDb = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get('file') as File;
    const flightId = formData.get('flightId') as string;

    if (!file) {
      setError('Excel dosyasını seçin');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const compareFormData = new FormData();
      compareFormData.append('file', file);
      if (flightId) {
        compareFormData.append('flightId', flightId);
      }

      const result = await compareAPI.excelToDb(compareFormData);
      setExcelToDbResult(result);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Karşılaştırma sırasında bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (type: string) => {
    switch (type) {
      case 'NEW':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'DELETED':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'UPDATED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Excel ↔ Excel Karşılaştırma</CardTitle>
          <CardDescription>İki Excel dosyasını karşılaştırın</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleExcelToExcel} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Excel Dosyası A</Label>
                <Input type="file" accept=".xlsx,.xls" name="fileA" required />
              </div>
              <div className="space-y-2">
                <Label>Excel Dosyası B</Label>
                <Input type="file" accept=".xlsx,.xls" name="fileB" required />
              </div>
            </div>
            <Button type="submit" disabled={loading}>
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              {loading ? 'Karşılaştırılıyor...' : 'Karşılaştır'}
            </Button>
          </form>

          {excelToExcelResult && (
            <div className="mt-6 space-y-4">
              <div className="flex gap-4 text-sm">
                <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded">
                  Toplam: {excelToExcelResult.summary.total}
                </div>
                <div className="px-3 py-1 bg-green-100 text-green-800 rounded">
                  Yeni: {excelToExcelResult.summary.new}
                </div>
                <div className="px-3 py-1 bg-red-100 text-red-800 rounded">
                  Silinen: {excelToExcelResult.summary.deleted}
                </div>
                <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded">
                  Güncellenen: {excelToExcelResult.summary.updated}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border px-4 py-2 text-left">Durum</th>
                      <th className="border px-4 py-2 text-left">Ad</th>
                      <th className="border px-4 py-2 text-left">Voucher</th>
                      <th className="border px-4 py-2 text-left">Tarih</th>
                      <th className="border px-4 py-2 text-left">Detaylar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {excelToExcelResult.differences.map((diff, idx) => (
                      <tr key={idx} className={getStatusColor(diff.differenceType)}>
                        <td className="border px-4 py-2 font-medium">
                          {diff.statusText || diff.differenceType}
                        </td>
                        <td className="border px-4 py-2">
                          {diff.sideB?.fullName || diff.sideA?.fullName || '-'}
                        </td>
                        <td className="border px-4 py-2">
                          {diff.sideB?.voucher || diff.sideA?.voucher || '-'}
                        </td>
                        <td className="border px-4 py-2">
                          {diff.sideB?.flightDate || diff.sideA?.flightDate || '-'}
                        </td>
                        <td className="border px-4 py-2 text-sm">
                          {diff.changes && diff.changes.length > 0 && (
                            <div>
                              {diff.changes.map((change, i) => (
                                <div key={i}>
                                  <strong>{change.field}:</strong> {String(change.oldValue)} → {String(change.newValue)}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Excel ↔ Veritabanı Karşılaştırma</CardTitle>
          <CardDescription>Excel dosyasını veritabanı ile karşılaştırın</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleExcelToDb} className="space-y-4">
            <div className="space-y-2">
              <Label>Excel Dosyası</Label>
              <Input type="file" accept=".xlsx,.xls" name="file" required />
            </div>
            <div className="space-y-2">
              <Label>Uçuş Seçin (Opsiyonel)</Label>
              <Select name="flightId">
                <SelectTrigger>
                  <SelectValue placeholder="Tüm uçuşlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tüm Uçuşlar</SelectItem>
                  {flights.map((flight) => (
                    <SelectItem key={flight.id} value={flight.id}>
                      {flight.airline} - {flight.flightNumber}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" disabled={loading}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {loading ? 'Karşılaştırılıyor...' : 'Veritabanı ile Karşılaştır'}
            </Button>
          </form>

          {excelToDbResult && (
            <div className="mt-6 space-y-4">
              <div className="flex gap-4 text-sm">
                <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded">
                  Toplam: {excelToDbResult.summary.total}
                </div>
                <div className="px-3 py-1 bg-green-100 text-green-800 rounded">
                  Yeni: {excelToDbResult.summary.new}
                </div>
                <div className="px-3 py-1 bg-red-100 text-red-800 rounded">
                  Silinen: {excelToDbResult.summary.deleted}
                </div>
                <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded">
                  Güncellenen: {excelToDbResult.summary.updated}
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="bg-gray-50">
                      <th className="border px-4 py-2 text-left">Durum</th>
                      <th className="border px-4 py-2 text-left">Ad</th>
                      <th className="border px-4 py-2 text-left">Voucher</th>
                      <th className="border px-4 py-2 text-left">Tarih</th>
                      <th className="border px-4 py-2 text-left">Detaylar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {excelToDbResult.differences.map((diff, idx) => (
                      <tr key={idx} className={getStatusColor(diff.differenceType)}>
                        <td className="border px-4 py-2 font-medium">
                          {diff.statusText || diff.differenceType}
                        </td>
                        <td className="border px-4 py-2">
                          {diff.sideB?.fullName || diff.sideA?.fullName || '-'}
                        </td>
                        <td className="border px-4 py-2">
                          {diff.sideB?.voucher || diff.sideA?.voucher || '-'}
                        </td>
                        <td className="border px-4 py-2">
                          {diff.sideB?.flightDate || diff.sideA?.flightDate || '-'}
                        </td>
                        <td className="border px-4 py-2 text-sm">
                          {diff.changes && diff.changes.length > 0 && (
                            <div>
                              {diff.changes.map((change, i) => (
                                <div key={i}>
                                  <strong>{change.field}:</strong> {String(change.oldValue)} → {String(change.newValue)}
                                </div>
                              ))}
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <div className="p-4 text-sm text-red-600 bg-red-50 rounded-md">
          {error}
        </div>
      )}
    </div>
  );
}

