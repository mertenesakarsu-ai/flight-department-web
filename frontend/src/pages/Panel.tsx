import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ExcelBuilder from '@/components/ExcelBuilder';
import DataManagement from '@/components/DataManagement';
import ComparisonSystem from '@/components/ComparisonSystem';
import {
  LogOut,
  CheckCircle2,
  ShieldCheck,
  FileSpreadsheet,
  RefreshCw,
  Users,
  ArrowLeftRight,
  type LucideIcon,
} from 'lucide-react';

export default function Panel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const workflowHighlights = [
    {
      title: 'Veriyi Topla',
      description: 'PDF veya ham metin dosyalarından Excel şablonuna uygun veri çıkartın.',
    },
    {
      title: 'Veriyi Zenginleştir',
      description: 'Uçuşları ve yolcuları panelden düzenleyip loglanmış aksiyonlarla takip edin.',
    },
    {
      title: 'Doğrula ve Eşitle',
      description: 'Excel ↔ Excel ve Excel ↔ Veritabanı karşılaştırmaları ile tutarlılığı teyit edin.',
    },
  ];

  const featureHighlights: {
    title: string;
    description: string;
    icon: LucideIcon;
    accent: string;
    iconColor: string;
  }[] = [
    {
      title: 'Excel Oluşturucu',
      description: 'PDF ve metinlerden saniyeler içinde standart Excel dosyaları üretin.',
      icon: FileSpreadsheet,
      accent: 'border-blue-100 bg-blue-50/80',
      iconColor: 'text-blue-600',
    },
    {
      title: 'Veri Yönetimi',
      description: 'Uçuş ve yolcu kayıtlarını tek ekrandan yönetip düzenleyin.',
      icon: Users,
      accent: 'border-purple-100 bg-purple-50/80',
      iconColor: 'text-purple-600',
    },
    {
      title: 'Karşılaştırma Sistemi',
      description: 'Excel ↔ Excel ve Excel ↔ DB farklarını renklendirilmiş tablolarla görün.',
      icon: ArrowLeftRight,
      accent: 'border-emerald-100 bg-emerald-50/80',
      iconColor: 'text-emerald-600',
    },
    {
      title: 'Güvenli Kayıt',
      description: 'JWT, Mongo logları ve rol bazlı erişim ile aksiyonları izleyin.',
      icon: ShieldCheck,
      accent: 'border-amber-100 bg-amber-50/80',
      iconColor: 'text-amber-600',
    },
  ];

  const bestPractices = [
    'PDF taramalarındaki veriyi ham metin alanına yapıştırarak standartlaştırın.',
    'Yeni uçuş oluşturduktan sonra yolcu listesini aynı ekrandan ekleyin.',
    'Excel ↔ Veritabanı karşılaştırmasıyla uçuş bazlı farkları hızla yakalayın.',
    'Her aksiyon MongoDB üzerinde loglandığından ekip içinde izlenebilirliği koruyun.',
  ];

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b shadow-sm">
        <div className="container mx-auto px-4 py-4 flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-800">Uçak Departmanı Paneli</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">Hoş geldiniz, <strong>{user?.username}</strong></span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4 mr-2" />
              Çıkış Yap
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] mb-10">
          <div className="p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white shadow-xl">
            <p className="text-sm uppercase tracking-widest text-slate-300 mb-2">Operasyon Akışı</p>
            <h2 className="text-2xl font-bold mb-4">Uçuş departmanının tüm ihtiyaçları tek panelde</h2>
            <p className="text-slate-200 mb-6">
              Excel oluşturma, veri yönetimi ve tutarlılık kontrollerini tek bir arayüzde toplayarak ekiplerin
              zamandan tasarruf etmesini sağlıyoruz.
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {workflowHighlights.map((item) => (
                <div key={item.title} className="bg-white/10 border border-white/20 rounded-2xl p-4 h-full">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                    <p className="text-sm font-semibold">{item.title}</p>
                  </div>
                  <p className="text-sm text-slate-100/80">{item.description}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-3xl p-6 shadow-sm">
            <p className="text-sm font-semibold text-gray-700">Panel İpuçları</p>
            <p className="text-sm text-gray-500 mb-5">En sık yapılan işlemleri hatırlamak için küçük bir rehber.</p>
            <div className="space-y-4">
              {bestPractices.map((tip) => (
                <div key={tip} className="flex items-start gap-3">
                  <div className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center">
                    <RefreshCw className="h-4 w-4 text-slate-600" />
                  </div>
                  <p className="text-sm text-gray-600">{tip}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mb-10">
          <p className="text-sm uppercase tracking-widest text-slate-500 mb-3">Öne çıkan modüller</p>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {featureHighlights.map((feature) => {
              const Icon = feature.icon;
              return (
                <div
                  key={feature.title}
                  className={`border rounded-2xl p-4 h-full shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${feature.accent}`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div className={`h-10 w-10 rounded-full bg-white/80 flex items-center justify-center ${feature.iconColor}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                    <p className="font-semibold text-slate-800">{feature.title}</p>
                  </div>
                  <p className="text-sm text-slate-600">{feature.description}</p>
                </div>
              );
            })}
          </div>
        </section>

        <Tabs defaultValue="excel" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="excel">Excel Oluşturucu</TabsTrigger>
            <TabsTrigger value="data">Bilgi Girişi/Çıkışı</TabsTrigger>
            <TabsTrigger value="compare">Karşılaştırma Sistemi</TabsTrigger>
          </TabsList>

          <TabsContent value="excel">
            <ExcelBuilder />
          </TabsContent>

          <TabsContent value="data">
            <DataManagement />
          </TabsContent>

          <TabsContent value="compare">
            <ComparisonSystem />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

