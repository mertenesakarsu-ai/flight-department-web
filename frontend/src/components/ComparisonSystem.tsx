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
  const [selectedFlightId, setSelectedFlightId] = useState<string>('');
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

    if (!file) {
      setError('Excel dosyasını seçin');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const compareFormData = new FormData();
      compareFormData.append('file', file);
      if (selectedFlightId && selectedFlightId !== '') {
        compareFormData.append('flightId', selectedFlightId);
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
            <div className="mt-6 space-y-6">
              <div className="flex gap-4 text-sm">
                <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded font-semibold">
                  Toplam: {excelToExcelResult.summary.total}
                </div>
                <div className="px-3 py-1 bg-green-100 text-green-800 rounded font-semibold">
                  Eklenenler: {excelToExcelResult.summary.new}
                </div>
                <div className="px-3 py-1 bg-red-100 text-red-800 rounded font-semibold">
                  Çıkarılanlar: {excelToExcelResult.summary.deleted}
                </div>
                <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded font-semibold">
                  Değişenler: {excelToExcelResult.summary.updated}
                </div>
              </div>

              {/* Eklenenler Tablosu */}
              {excelToExcelResult.differences.filter(d => d.differenceType === 'NEW').length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-green-700 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Eklenenler ({excelToExcelResult.summary.new})
                  </h3>
                  <div className="overflow-x-auto border-2 border-green-200 rounded-lg">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-green-50">
                          <th className="border-b-2 border-green-200 px-4 py-3 text-left font-semibold">Ad Soyad</th>
                          <th className="border-b-2 border-green-200 px-4 py-3 text-left font-semibold">Voucher</th>
                          <th className="border-b-2 border-green-200 px-4 py-3 text-left font-semibold">Uçuş Tarihi</th>
                          <th className="border-b-2 border-green-200 px-4 py-3 text-left font-semibold">Havayolu</th>
                          <th className="border-b-2 border-green-200 px-4 py-3 text-left font-semibold">Uçuş No</th>
                        </tr>
                      </thead>
                      <tbody>
                        {excelToExcelResult.differences
                          .filter(d => d.differenceType === 'NEW')
                          .map((diff, idx) => (
                            <tr key={idx} className="bg-white hover:bg-green-50">
                              <td className="border-b border-green-100 px-4 py-2">{diff.sideB?.fullName || '-'}</td>
                              <td className="border-b border-green-100 px-4 py-2">{diff.sideB?.voucher || '-'}</td>
                              <td className="border-b border-green-100 px-4 py-2">{diff.sideB?.flightDate || '-'}</td>
                              <td className="border-b border-green-100 px-4 py-2">{diff.sideB?.airline || '-'}</td>
                              <td className="border-b border-green-100 px-4 py-2">{diff.sideB?.flightNumber || '-'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Çıkarılanlar Tablosu */}
              {excelToExcelResult.differences.filter(d => d.differenceType === 'DELETED').length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-red-700 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    Çıkarılanlar ({excelToExcelResult.summary.deleted})
                  </h3>
                  <div className="overflow-x-auto border-2 border-red-200 rounded-lg">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-red-50">
                          <th className="border-b-2 border-red-200 px-4 py-3 text-left font-semibold">Ad Soyad</th>
                          <th className="border-b-2 border-red-200 px-4 py-3 text-left font-semibold">Voucher</th>
                          <th className="border-b-2 border-red-200 px-4 py-3 text-left font-semibold">Uçuş Tarihi</th>
                          <th className="border-b-2 border-red-200 px-4 py-3 text-left font-semibold">Havayolu</th>
                          <th className="border-b-2 border-red-200 px-4 py-3 text-left font-semibold">Uçuş No</th>
                        </tr>
                      </thead>
                      <tbody>
                        {excelToExcelResult.differences
                          .filter(d => d.differenceType === 'DELETED')
                          .map((diff, idx) => (
                            <tr key={idx} className="bg-white hover:bg-red-50">
                              <td className="border-b border-red-100 px-4 py-2">{diff.sideA?.fullName || '-'}</td>
                              <td className="border-b border-red-100 px-4 py-2">{diff.sideA?.voucher || '-'}</td>
                              <td className="border-b border-red-100 px-4 py-2">{diff.sideA?.flightDate || '-'}</td>
                              <td className="border-b border-red-100 px-4 py-2">{diff.sideA?.airline || '-'}</td>
                              <td className="border-b border-red-100 px-4 py-2">{diff.sideA?.flightNumber || '-'}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Değişenler/Farklar Tablosu */}
              {excelToExcelResult.differences.filter(d => d.differenceType === 'UPDATED').length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-yellow-700 flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    Değişenler / Farklar ({excelToExcelResult.summary.updated})
                  </h3>
                  <div className="overflow-x-auto border-2 border-yellow-200 rounded-lg">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-yellow-50">
                          <th className="border-b-2 border-yellow-200 px-4 py-3 text-left font-semibold">Ad Soyad</th>
                          <th className="border-b-2 border-yellow-200 px-4 py-3 text-left font-semibold">Voucher</th>
                          <th className="border-b-2 border-yellow-200 px-4 py-3 text-left font-semibold">Uçuş Tarihi</th>
                          <th className="border-b-2 border-yellow-200 px-4 py-3 text-left font-semibold">Değişen Alanlar</th>
                        </tr>
                      </thead>
                      <tbody>
                        {excelToExcelResult.differences
                          .filter(d => d.differenceType === 'UPDATED')
                          .map((diff, idx) => (
                            <tr key={idx} className="bg-white hover:bg-yellow-50">
                              <td className="border-b border-yellow-100 px-4 py-2">
                                {diff.sideB?.fullName || diff.sideA?.fullName || '-'}
                              </td>
                              <td className="border-b border-yellow-100 px-4 py-2">
                                {diff.sideB?.voucher || diff.sideA?.voucher || '-'}
                              </td>
                              <td className="border-b border-yellow-100 px-4 py-2">
                                {diff.sideB?.flightDate || diff.sideA?.flightDate || '-'}
                              </td>
                              <td className="border-b border-yellow-100 px-4 py-2">
                                {diff.changes && diff.changes.length > 0 && (
                                  <div className="space-y-1 text-sm">
                                    {diff.changes.map((change, i) => (
                                      <div key={i} className="flex items-start gap-2">
                                        <span className="font-semibold text-yellow-700 min-w-[100px]">{change.field}:</span>
                                        <span className="text-red-600 line-through">{String(change.oldValue || '-')}</span>
                                        <span>→</span>
                                        <span className="text-green-600 font-medium">{String(change.newValue || '-')}</span>
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

              {/* Sonuç yoksa mesaj */}
              {excelToExcelResult.differences.length === 0 && (
                <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-lg border-2 border-gray-200">
                  <p className="text-lg font-medium">✓ İki Excel dosyası tamamen aynı!</p>
                  <p className="text-sm mt-1">Hiçbir fark bulunamadı.</p>
                </div>
              )}
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
              <Select value={selectedFlightId} onValueChange={setSelectedFlightId}>
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

