import { useMemo, useState } from 'react';
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
  const [excelCompareLoading, setExcelCompareLoading] = useState(false);
  const [dbCompareLoading, setDbCompareLoading] = useState(false);
  const [excelCompareError, setExcelCompareError] = useState('');
  const [dbCompareError, setDbCompareError] = useState('');

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
      setExcelCompareError('Her iki Excel dosyasını da seçin');
      return;
    }

    setExcelCompareLoading(true);
    setExcelCompareError('');

    try {
      const compareFormData = new FormData();
      compareFormData.append('fileA', fileA);
      compareFormData.append('fileB', fileB);

      const result = await compareAPI.excelToExcel(compareFormData);
      setExcelToExcelResult(result);
      setExcelCompareError('');
    } catch (err: any) {
      setExcelCompareError(err.response?.data?.error || 'Karşılaştırma sırasında bir hata oluştu');
    } finally {
      setExcelCompareLoading(false);
    }
  };

  const handleExcelToDb = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const file = formData.get('file') as File;

    if (!file) {
      setDbCompareError('Excel dosyasını seçin');
      return;
    }

    setDbCompareLoading(true);
    setDbCompareError('');

    try {
      const compareFormData = new FormData();
      compareFormData.append('file', file);
      if (selectedFlightId && selectedFlightId !== '') {
        compareFormData.append('flightId', selectedFlightId);
      }

      const result = await compareAPI.excelToDb(compareFormData);
      setExcelToDbResult(result);
      setDbCompareError('');
    } catch (err: any) {
      setDbCompareError(err.response?.data?.error || 'Karşılaştırma sırasında bir hata oluştu');
    } finally {
      setDbCompareLoading(false);
    }
  };

  const excelToExcelSummary = useMemo(() => excelToExcelResult?.summary, [excelToExcelResult]);
  const excelToDbSummary = useMemo(() => excelToDbResult?.summary, [excelToDbResult]);

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
            <Button type="submit" disabled={excelCompareLoading}>
              <ArrowLeftRight className="h-4 w-4 mr-2" />
              {excelCompareLoading ? 'Karşılaştırılıyor...' : 'Karşılaştır'}
            </Button>
          </form>

          {excelCompareError && (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {excelCompareError}
            </p>
          )}

          {excelToExcelResult && (
            <div className="mt-6 space-y-6">
              {excelToExcelSummary && (
                <div className="flex gap-4 text-sm">
                  <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded font-semibold">
                    Toplam: {excelToExcelSummary.total}
                  </div>
                  <div className="px-3 py-1 bg-green-100 text-green-800 rounded font-semibold">
                    Eklenenler: {excelToExcelSummary.new}
                  </div>
                  <div className="px-3 py-1 bg-red-100 text-red-800 rounded font-semibold">
                    Çıkarılanlar: {excelToExcelSummary.deleted}
                  </div>
                  <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded font-semibold">
                    Değişenler: {excelToExcelSummary.updated}
                  </div>
                </div>
              )}

              {/* Eklenenler Tablosu */}
              {excelToExcelResult.differences.filter(d => d.differenceType === 'NEW').length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-green-700 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Eklenenler ({excelToExcelSummary?.new ?? 0})
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
                    Çıkarılanlar ({excelToExcelSummary?.deleted ?? 0})
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
                    Değişenler / Farklar ({excelToExcelSummary?.updated ?? 0})
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
            <Button type="submit" disabled={dbCompareLoading}>
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              {dbCompareLoading ? 'Karşılaştırılıyor...' : 'Veritabanı ile Karşılaştır'}
            </Button>
          </form>

          {dbCompareError && (
            <p className="mt-4 text-sm text-red-600" role="alert">
              {dbCompareError}
            </p>
          )}

          {excelToDbResult && (
            <div className="mt-6 space-y-6">
              {excelToDbSummary && (
                <div className="flex gap-4 text-sm">
                  <div className="px-3 py-1 bg-blue-100 text-blue-800 rounded font-semibold">
                    Toplam: {excelToDbSummary.total}
                  </div>
                  <div className="px-3 py-1 bg-green-100 text-green-800 rounded font-semibold">
                    Eklenenler: {excelToDbSummary.new}
                  </div>
                  <div className="px-3 py-1 bg-red-100 text-red-800 rounded font-semibold">
                    Çıkarılanlar: {excelToDbSummary.deleted}
                  </div>
                  <div className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded font-semibold">
                    Değişenler: {excelToDbSummary.updated}
                  </div>
                </div>
              )}

              {/* Eklenenler Tablosu */}
              {excelToDbResult.differences.filter(d => d.differenceType === 'NEW').length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-green-700 flex items-center gap-2">
                    <span className="w-2 h-2 bg-green-500 rounded-full"></span>
                    Eklenenler (Excel'de var, DB'de yok) - {excelToDbSummary?.new ?? 0}
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
                        {excelToDbResult.differences
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
              {excelToDbResult.differences.filter(d => d.differenceType === 'DELETED').length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-red-700 flex items-center gap-2">
                    <span className="w-2 h-2 bg-red-500 rounded-full"></span>
                    Çıkarılanlar (DB'de var, Excel'de yok) - {excelToDbSummary?.deleted ?? 0}
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
                        {excelToDbResult.differences
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
              {excelToDbResult.differences.filter(d => d.differenceType === 'UPDATED').length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-lg font-bold text-yellow-700 flex items-center gap-2">
                    <span className="w-2 h-2 bg-yellow-500 rounded-full"></span>
                    Değişenler / Farklar ({excelToDbSummary?.updated ?? 0})
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
                        {excelToDbResult.differences
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
              {excelToDbResult.differences.length === 0 && (
                <div className="p-6 text-center text-gray-500 bg-gray-50 rounded-lg border-2 border-gray-200">
                  <p className="text-lg font-medium">✓ Excel ve Veritabanı tamamen senkron!</p>
                  <p className="text-sm mt-1">Hiçbir fark bulunamadı.</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {(excelCompareError || dbCompareError) && (
        <div className="p-4 text-sm text-red-600 bg-red-50 rounded-md">
          {excelCompareError || dbCompareError}
        </div>
      )}
    </div>
  );
}

