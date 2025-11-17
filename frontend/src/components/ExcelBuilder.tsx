import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { excelAPI } from '@/lib/api';
import { FileText, Download } from 'lucide-react';

const COMPANIES = ['Ryanair', 'EasyJet', 'Turkish Airlines', 'Pegasus', 'SunExpress', 'Other'];

export default function ExcelBuilder() {
  const [company, setCompany] = useState('');
  const [pdfFiles, setPdfFiles] = useState<File[]>([]);
  const [rawText, setRawText] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setPdfFiles(Array.from(e.target.files));
    }
  };

  const handleGenerate = async () => {
    if (!company) {
      setError('Lütfen bir şirket seçin');
      return;
    }

    if (pdfFiles.length === 0 && !rawText.trim()) {
      setError('Lütfen en az bir PDF dosyası yükleyin veya metin girin');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const formData = new FormData();
      formData.append('company', company);
      pdfFiles.forEach((file) => {
        formData.append('pdfs', file);
      });
      if (rawText) {
        formData.append('rawText', rawText);
      }

      const response = await excelAPI.build(formData);
      
      // Check if response is a blob (success) or error
      if (response instanceof Blob && response.size > 0) {
        // Create download link from response data (should be blob)
        const url = window.URL.createObjectURL(response);
        const a = document.createElement('a');
        a.href = url;
        a.download = `passengers_${company}_${Date.now()}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        throw new Error('Excel dosyası oluşturulamadı');
      }
    } catch (err: any) {
      console.error('Excel generation error:', err);
      
      // Extract error message
      let errorMessage = 'Excel oluşturulurken bir hata oluştu';
      
      if (err.response?.data) {
        if (err.response.data instanceof Blob) {
          // If error is a blob, try to parse it as JSON
          try {
            const text = await err.response.data.text();
            const errorJson = JSON.parse(text);
            errorMessage = errorJson.message || errorJson.error || errorMessage;
          } catch {
            errorMessage = 'Excel oluşturulurken bir hata oluştu';
          }
        } else if (typeof err.response.data === 'object') {
          // If error is already an object
          errorMessage = err.response.data.message || err.response.data.error || errorMessage;
          
          // Check if PDF is scanned
          if (err.response.data.isLikelyScanned || err.response.data.suggestion?.includes('scanned')) {
            errorMessage = 'PDF taramalı (scanned) görünüyor ve metin çıkarılamadı.\n\n';
            errorMessage += 'Çözüm:\n';
            errorMessage += '1. PDF\'den metni kopyalayıp "Ham Metin" alanına yapıştırın\n';
            errorMessage += '2. Veya PDF\'yi metin tabanlı bir formata dönüştürün\n\n';
            if (err.response.data.suggestion) {
              errorMessage += err.response.data.suggestion;
            }
          } else if (err.response.data.suggestion) {
            errorMessage += '\n\n' + err.response.data.suggestion;
          }
        }
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Excel Oluşturucu</CardTitle>
          <CardDescription>
            PDF dosyaları veya ham metin yükleyerek standart Excel dosyası oluşturun
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label>Şirket / Havayolu</Label>
            <Select value={company} onValueChange={setCompany}>
              <SelectTrigger>
                <SelectValue placeholder="Şirket seçin" />
              </SelectTrigger>
              <SelectContent>
                {COMPANIES.map((comp) => (
                  <SelectItem key={comp} value={comp}>
                    {comp}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>PDF Dosyaları</Label>
            <Input
              type="file"
              accept=".pdf"
              multiple
              onChange={handleFileChange}
            />
            {pdfFiles.length > 0 && (
              <div className="mt-2 space-y-1">
                {pdfFiles.map((file, idx) => (
                  <div key={idx} className="flex items-center gap-2 text-sm text-gray-600">
                    <FileText className="h-4 w-4" />
                    {file.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label>Ham Metin (Opsiyonel)</Label>
            <Textarea
              value={rawText}
              onChange={(e) => setRawText(e.target.value)}
              placeholder="Manuel olarak veri yapıştırabilir veya yazabilirsiniz..."
              rows={6}
            />
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md whitespace-pre-line">
              {error}
            </div>
          )}

          <Button onClick={handleGenerate} disabled={loading} className="w-full">
            {loading ? (
              'Excel Oluşturuluyor...'
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Excel'i Oluştur
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

