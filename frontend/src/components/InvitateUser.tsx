// frontend/src/components/InviteUser.tsx
import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

interface InviteUserProps {
  companyId: string;
  onInviteSent: () => void;
}

const InviteUser: React.FC<InviteUserProps> = ({ companyId, onInviteSent }) => {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('worker');
  const [loading, setLoading] = useState(false);
  const { user } = useAuth();

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/invitations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          email,
          name,
          role,
          company_id: companyId
        })
      });

      if (response.ok) {
        alert('Invitación enviada exitosamente');
        setEmail('');
        setName('');
        setRole('worker');
        onInviteSent();
      } else {
        const error = await response.json();
        alert(`Error: ${error.detail}`);
      }
    } catch (error) {
      alert('Error enviando invitación');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">Invitar Usuario</h3>
      <form onSubmit={handleInvite}>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Nombre</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full p-2 border rounded"
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-2">Rol</label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value)}
            className="w-full p-2 border rounded"
          >
            <option value="worker">Trabajador</option>
            {user?.role === 'super_admin' && (
              <option value="company_admin">Administrador de Empresa</option>
            )}
          </select>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:opacity-50"
        >
          {loading ? 'Enviando...' : 'Enviar Invitación'}
        </button>
      </form>
    </div>
  );
};

export default InviteUser;