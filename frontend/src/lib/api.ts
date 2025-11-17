import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auth API
export const authAPI = {
  login: async (usernameOrEmail: string, password: string) => {
    const response = await api.post('/auth/login', { usernameOrEmail, password });
    return response.data;
  },
  logout: async () => {
    const response = await api.post('/auth/logout');
    return response.data;
  },
  me: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },
};

// Flights API
export const flightsAPI = {
  getAll: async (params?: { page?: number; limit?: number; airline?: string; flightNumber?: string }) => {
    const response = await api.get('/flights', { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/flights/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/flights', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await api.put(`/flights/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/flights/${id}`);
    return response.data;
  },
};

// Passengers API
export const passengersAPI = {
  getByFlight: async (flightId: string, params?: { page?: number; limit?: number }) => {
    const response = await api.get(`/passengers/flight/${flightId}`, { params });
    return response.data;
  },
  getById: async (id: string) => {
    const response = await api.get(`/passengers/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post('/passengers', data);
    return response.data;
  },
  update: async (id: string, data: any) => {
    const response = await api.put(`/passengers/${id}`, data);
    return response.data;
  },
  delete: async (id: string) => {
    const response = await api.delete(`/passengers/${id}`);
    return response.data;
  },
};

// Excel API
export const excelAPI = {
  build: async (formData: FormData) => {
    try {
      const response = await api.post('/excel/build', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        responseType: 'blob',
        validateStatus: () => true, // Accept all status codes to handle them manually
      });
      
      // Check if response is an error (usually JSON in blob format)
      if (response.status >= 400) {
        const blob = response.data as Blob;
        const text = await blob.text();
        let errorData;
        try {
          errorData = JSON.parse(text);
        } catch {
          errorData = { error: 'Bilinmeyen hata', message: text };
        }
        const error = new Error(errorData.message || errorData.error || 'Excel oluşturulamadı');
        (error as any).response = { data: errorData, status: response.status };
        throw error;
      }
      
      return response.data;
    } catch (error: any) {
      // Re-throw to let component handle it
      throw error;
    }
  },
};

// Compare API
const excelToDbRequest = async (formData: FormData) => {
  const response = await api.post('/compare/excel-to-db', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export const compareAPI = {
  excelToExcel: async (formData: FormData) => {
    const response = await api.post('/compare/excel-to-excel', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
  excelToDb: excelToDbRequest,
  // Backwards compatibility for previous camelCase usage
  excelToDB: excelToDbRequest,
};

export default api;

