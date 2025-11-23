// frontend/src/components/AddCompanyForm.tsx
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface AddCompanyFormProps {
  onCompanyAdded: () => void;
  onCancel: () => void;
}

const AddCompanyForm: React.FC<AddCompanyFormProps> = ({ onCompanyAdded, onCancel }) => {
  const [name, setName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (user?.role !== 'super_admin') {
      alert('Solo los super administradores pueden crear empresas');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/admin/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          name,
          contact_email: contactEmail,
          phone,
          address
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Error creating company');
      }

      const result = await response.json();
      alert(`Empresa "${name}" creada exitosamente`);
      
      // Limpiar formulario
      setName('');
      setContactEmail('');
      setPhone('');
      setAddress('');
      
      onCompanyAdded();
    } catch (error) {
      alert(`Error: ${(error as Error).message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="text-xl">Añadir Nueva Empresa</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Nombre de la empresa *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Mi Empresa S.A."
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Email de contacto
            </label>
            <input
              type="email"
              value={contactEmail}
              onChange={(e) => setContactEmail(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="contacto@empresa.com"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Teléfono
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="+1 234 567 8900"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Dirección
            </label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="w-full p-2 border rounded-md"
              placeholder="Dirección completa de la empresa"
              rows={3}
            />
          </div>

          <div className="flex space-x-3">
            <Button
              type="button"
              onClick={onCancel}
              variant="outline"
              className="flex-1"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="flex-1"
            >
              {loading ? 'Creando...' : 'Crear Empresa'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default AddCompanyForm;