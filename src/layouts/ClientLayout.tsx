import { Outlet } from 'react-router-dom';
import { Book } from 'lucide-react';
import { Link } from 'react-router-dom';

const ClientLayout = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white border-b border-gray-200 py-4 px-6 flex justify-between items-center">
        <Link to="/" className="flex items-center gap-2">
          <Book size={24} className="text-primary" />
          <h1 className="text-xl font-semibold text-gray-800">Cursos para Degustação</h1>
        </Link>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
    </div>
  );
};

export default ClientLayout;