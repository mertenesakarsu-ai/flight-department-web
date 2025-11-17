import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ExcelBuilder from '@/components/ExcelBuilder';
import DataManagement from '@/components/DataManagement';
import ComparisonSystem from '@/components/ComparisonSystem';
import { LogOut } from 'lucide-react';

export default function Panel() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

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

