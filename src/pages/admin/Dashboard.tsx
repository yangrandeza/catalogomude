import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PlusCircle, Pencil, Trash2, Search, Loader2, Book, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Course } from '@/types';
import { getAllCourses, deleteCourse } from '@/services/courseService';

const Dashboard = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setIsLoading(true);
    try {
      const data = await getAllCourses();
      setCourses(data);
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar os cursos.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteClick = (course: Course) => {
    setCourseToDelete(course);
  };

  const confirmDelete = async () => {
    if (!courseToDelete) return;
    
    try {
      await deleteCourse(courseToDelete.id);
      setCourses(courses.filter(c => c.id !== courseToDelete.id));
      toast({
        title: 'Sucesso',
        description: `O curso "${courseToDelete.name}" foi excluído.`,
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível excluir o curso.',
        variant: 'destructive',
      });
    } finally {
      setCourseToDelete(null);
    }
  };

  const cancelDelete = () => {
    setCourseToDelete(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR');
  };

  const filteredCourses = courses.filter(course => 
    course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-800 via-purple-800 to-purple-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="backdrop-blur-xl bg-white/15 rounded-2xl p-8 shadow-2xl">
          <div className="flex justify-between items-center mb-8">
            <h1 className="text-3xl font-bold text-white tracking-tight">Gerenciamento de Cursos</h1>
            <Button 
              onClick={() => navigate('/admin/add-course')} 
              className="flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"
            >
              <PlusCircle size={16} />
              <span>Adicionar Novo Curso</span>
            </Button>
          </div>

          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70" size={18} />
            <Input
              placeholder="Pesquisar cursos..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/20 border-white/30 text-white placeholder-white/70 focus:border-white/50 focus:ring-white/30"
            />
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          ) : filteredCourses.length > 0 ? (
            <div className="rounded-lg overflow-hidden border border-white/30 backdrop-blur-lg">
              <Table>
                <TableHeader>
                  <TableRow className="border-white/30 hover:bg-white/10">
                    <TableHead className="text-white/70">Capa</TableHead>
                    <TableHead className="text-white/70">Nome do Curso</TableHead>
                    <TableHead className="hidden md:table-cell text-white/70">Descrição</TableHead>
                    <TableHead className="hidden md:table-cell text-white/70">Data de Upload</TableHead>
                    <TableHead className="text-right text-white/70">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCourses.map((course) => (
                    <TableRow key={course.id} className="border-white/30 hover:bg-white/10">
                      <TableCell>
                        <div className="h-14 w-14 rounded-md overflow-hidden bg-gradient-to-br from-purple-900 to-indigo-900">
                          {course.coverImage ? (
                            <img
                              src={course.coverImage}
                              alt={course.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="h-full w-full flex items-center justify-center">
                              <BookOpen size={24} className="text-white/40" />
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium text-white">{course.name}</TableCell>
                      <TableCell className="hidden md:table-cell text-white/90">
                        {course.description.length > 100
                          ? `${course.description.substring(0, 100)}...`
                          : course.description}
                      </TableCell>
                      <TableCell className="hidden md:table-cell text-white/90">
                        {formatDate(course.uploadDate)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => navigate(`/admin/edit-course/${course.id}`)}
                            className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                          >
                            <Pencil size={16} />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDeleteClick(course)}
                            className="bg-red-500/20 hover:bg-red-500/30 text-red-200 border-red-500/30"
                          >
                            <Trash2 size={16} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-16 rounded-xl bg-white/10 border border-white/30 backdrop-blur-lg">
              <div className="flex flex-col items-center space-y-3">
                <BookOpen size={48} className="text-white/60" />
                <h3 className="text-xl font-medium text-white">Nenhum curso encontrado</h3>
                <p className="text-white/90 max-w-md">
                  {searchTerm ? 
                    `Não encontramos nenhum curso correspondente a "${searchTerm}".` : 
                    'Nenhum curso cadastrado ainda. Clique em "Adicionar Novo Curso" para começar.'}
                </p>
                {searchTerm && (
                  <Button 
                    variant="outline" 
                    onClick={() => setSearchTerm('')}
                    className="bg-white/20 hover:bg-white/30 text-white border-white/30"
                  >
                    Limpar pesquisa
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <Dialog open={!!courseToDelete} onOpenChange={() => !courseToDelete && setCourseToDelete(null)}>
        <DialogContent className="bg-gradient-to-br from-indigo-900 to-purple-900 border-white/30">
          <DialogHeader>
            <DialogTitle className="text-white">Excluir curso</DialogTitle>
            <DialogDescription className="text-white/90">
              Tem certeza que deseja excluir o curso "{courseToDelete?.name}"? Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2 sm:space-x-0">
            <Button 
              variant="outline" 
              onClick={cancelDelete}
              className="bg-white/20 hover:bg-white/30 text-white border-white/30"
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white"
            >
              Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;