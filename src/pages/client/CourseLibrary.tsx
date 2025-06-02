import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { RefreshCw, Search, Download, CheckCircle, XCircle, Loader2, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Course, DownloadStatus } from '@/types';
import { getAllCourses } from '@/services/courseService';
import { 
  isCourseDownloaded,
  downloadCourse,
  loadMetadata,
  saveMetadata,
  deleteCourseDownload,
  loadCategories,
  saveCategories
} from '@/services/opfsService';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const CourseLibrary = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [courses, setCourses] = useState<Course[]>([]);
  const [downloadStatuses, setDownloadStatuses] = useState<Record<string, DownloadStatus>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [showConfirmDeleteDialog, setShowConfirmDeleteDialog] = useState(false);
  const [courseToDelete, setCourseToDelete] = useState<Course | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [categories, setCategories] = useState<string[]>([]);

  useEffect(() => {
    loadCourses();
  }, []);

  const loadCourses = async () => {
    setIsLoading(true);
    try {
      let courseData = await loadMetadata();
      let categoryData = await loadCategories();

      if (!courseData || courseData.length === 0) {
        courseData = await getAllCourses();
        if (courseData.length > 0) {
          // saveMetadata now returns the categories
          categoryData = await saveMetadata(courseData); 
        }
      } else if (!categoryData || categoryData.length === 0) {
        // Metadata exists, but categories might not (e.g., older version or failed previous save)
        const uniqueCategories = Array.from(new Set(courseData.map(course => course.category).filter(Boolean))).sort();
        if (uniqueCategories.length > 0) {
          await saveCategories(uniqueCategories);
          categoryData = uniqueCategories;
        }
      }
      
      setCourses(courseData);
      setCategories(categoryData);

      // Check download statuses after courses are set
      if (courseData.length > 0) {
        const newStatuses: Record<string, DownloadStatus> = {};
        for (const course of courseData) {
          const isDownloaded = await isCourseDownloaded(course.id);
          newStatuses[course.id] = {
            id: course.id,
            status: isDownloaded ? 'downloaded' : 'not-downloaded',
            progress: isDownloaded ? 100 : 0,
          };
        }
        setDownloadStatuses(newStatuses);
      }

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

  const syncCourses = async () => {
    setIsSyncing(true);
    try {
      const newCourseData = await getAllCourses();
      // saveMetadata now returns the categories
      const newCategoryData = await saveMetadata(newCourseData); 

      setCourses(newCourseData);
      setCategories(newCategoryData);
      
      // Re-check download statuses for the new course list
      if (newCourseData.length > 0) {
        const newStatuses: Record<string, DownloadStatus> = {};
        for (const course of newCourseData) {
          const isDownloaded = await isCourseDownloaded(course.id);
          newStatuses[course.id] = {
            id: course.id,
            status: isDownloaded ? 'downloaded' : 'not-downloaded',
            progress: isDownloaded ? 100 : 0,
          };
        }
        setDownloadStatuses(newStatuses);
      }
      
      toast({
        title: 'Sincronizado',
        description: 'Lista de cursos atualizada com sucesso.',
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível sincronizar os cursos.',
        variant: 'destructive',
      });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleDownload = async (course: Course) => {
    setDownloadStatuses(prev => ({
      ...prev,
      [course.id]: {
        id: course.id,
        status: 'downloading',
        progress: 0,
      },
    }));
    
    try {
      await downloadCourse(course, (progress) => {
        setDownloadStatuses(prev => ({
          ...prev,
          [course.id]: {
            id: course.id,
            status: 'downloading',
            progress,
          },
        }));
      });
      
      setDownloadStatuses(prev => ({
        ...prev,
        [course.id]: {
          id: course.id,
          status: 'downloaded',
          progress: 100,
        },
      }));
      
      toast({
        title: 'Download concluído',
        description: `O curso "${course.name}" está disponível offline.`,
      });
    } catch (error) {
      setDownloadStatuses(prev => ({
        ...prev,
        [course.id]: {
          id: course.id,
          status: 'not-downloaded',
          progress: 0,
        },
      }));
      
      toast({
        title: 'Erro',
        description: 'Não foi possível baixar o curso.',
        variant: 'destructive',
      });
    }
  };

  const handleRemoveDownload = async (course: Course) => {
    try {
      await deleteCourseDownload(course.id);
      
      setDownloadStatuses(prev => ({
        ...prev,
        [course.id]: {
          id: course.id,
          status: 'not-downloaded',
          progress: 0,
        },
      }));
      
      toast({
        title: 'Download removido',
        description: `O curso "${course.name}" foi removido do armazenamento offline.`,
      });
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível remover o download do curso.',
        variant: 'destructive',
      });
    } finally {
      setCourseToDelete(null);
      setShowConfirmDeleteDialog(false);
    }
  };

  const openCourse = (course: Course) => {
    navigate(`/player/${course.id}`);
  };

  const confirmRemoveDownload = (course: Course) => {
    setCourseToDelete(course);
    setShowConfirmDeleteDialog(true);
  };

  const handleDownloadAll = async () => {
    const coursesToDownload = courses.filter(course => downloadStatuses[course.id]?.status === 'not-downloaded');

    if (coursesToDownload.length === 0) {
      toast({ title: 'Info', description: 'Todos os cursos já estão baixados.' });
      return;
    }

    toast({ title: 'Download em massa', description: `Iniciando download de ${coursesToDownload.length} curso(s)...` });

    for (const course of coursesToDownload) {
      await handleDownload(course);
    }

    toast({ title: 'Download em massa', description: 'Download de todos os cursos concluído.' });
  };

  const getStatusButton = (course: Course) => {
    const status = downloadStatuses[course.id];
    
    if (!status) return null;
    
    switch (status.status) {
      case 'not-downloaded':
        return (
          <Button 
            variant="outline" 
            className="w-full flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white border-white/30 transition-colors"
            onClick={() => handleDownload(course)}
          >
            <Download size={16} />
            <span>Baixar Curso</span>
          </Button>
        );
      case 'downloading':
        return (
          <div className="space-y-2 w-full">
            <Progress value={status.progress} className="h-2 bg-white/20" />
            <p className="text-xs text-center text-white">
              Baixando... {status.progress}%
            </p>
          </div>
        );
      case 'downloaded':
        return (
          <div className="space-y-2 w-full">
            <Button 
              variant="default" 
              className="w-full flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white transition-colors"
              onClick={() => openCourse(course)}
            >
              <CheckCircle size={16} />
              <span>Abrir Curso</span>
            </Button>
            <Button 
              variant="ghost" 
              size="sm"
              className="w-full text-xs text-white hover:bg-white/20"
              onClick={() => confirmRemoveDownload(course)}
            >
              <XCircle size={12} className="mr-1" />
              <span>Remover download</span>
            </Button>
          </div>
        );
      default:
        return null;
    }
  };

  const filteredCourses = courses.filter(course => 
    (course.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    course.description.toLowerCase().includes(searchTerm.toLowerCase())) &&
    (selectedCategory === 'all' || course.category === selectedCategory)
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-800 via-purple-800 to-purple-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="backdrop-blur-xl bg-white/15 rounded-2xl p-8 shadow-2xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <h1 className="text-3xl font-bold text-white tracking-tight">Biblioteca de Cursos</h1>
            <Button 
              variant="outline" 
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white border-white/30 transition-colors mr-2"
              onClick={syncCourses}
              disabled={isSyncing}
            >
              {isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw size={16} />}
              <span>Sincronizar</span>
            </Button>
            <Button 
              variant="outline" 
              className="flex items-center gap-2 bg-white/20 hover:bg-white/30 text-white border-white/30 transition-colors"
              onClick={handleDownloadAll}
              disabled={isLoading || isSyncing}
            >
              <Download size={16} />
              <span>Baixar Todos</span>
            </Button>
          </div>
          
          <div className="mb-8 flex flex-col sm:flex-row gap-4">
            <div className="relative flex-grow">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-white/70" size={18} />
              <Input
                placeholder="Pesquisar cursos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white/20 border-white/30 text-white placeholder-white/70 focus:border-white/50 focus:ring-white/30"
              />
            </div>
            
            <Select value={selectedCategory} onValueChange={setSelectedCategory}>
              <SelectTrigger className="w-[180px] bg-white/20 border-white/30 text-white focus:border-white/50 focus:ring-white/30">
                <SelectValue placeholder="Filtrar por Categoria" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700 text-white">
                <SelectItem value="all">Todas as Categorias</SelectItem>
                {categories.filter(category => category !== '').map(category => (
                  <SelectItem key={category} value={category}>{category}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-white" />
            </div>
          ) : filteredCourses.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredCourses.map((course) => (
                <Card 
                  key={course.id} 
                  className="overflow-hidden h-full flex flex-col bg-white/20 border-white/30 backdrop-blur-lg transform hover:scale-105 transition-all duration-300 hover:shadow-xl"
                >
                  <div className="relative h-48 w-full overflow-hidden bg-gradient-to-br from-purple-900 to-indigo-900">
                    {course.coverImage ? (
                      <img
                        src={course.coverImage}
                        alt={course.name}
                        className="h-full w-full object-cover transition-transform hover:scale-105 duration-300"
                      />
                    ) : (
                      <div className="h-full w-full flex items-center justify-center">
                        <BookOpen size={48} className="text-white/40" />
                      </div>
                    )}
                  </div>
                  <CardHeader className="pb-2">
                    <CardTitle className="line-clamp-2 text-white text-xl">{course.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="flex-grow">
                    <p className="text-sm text-white/90 line-clamp-3">
                      {course.description || 'Sem descrição disponível.'}
                    </p>
                  </CardContent>
                  <CardFooter className="pt-2">
                    {getStatusButton(course)}
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center py-16 rounded-xl bg-white/10 border border-white/30 backdrop-blur-lg">
              <div className="flex flex-col items-center space-y-3">
                <BookOpen size={48} className="text-white/60" />
                <h3 className="text-xl font-medium text-white">Nenhum curso encontrado</h3>
                <p className="text-white/90 max-w-md">
                  {searchTerm ? 
                    `Não encontramos nenhum curso correspondente a "${searchTerm}".` : 
                    'Nenhum curso disponível no momento. Tente sincronizar para verificar novos cursos.'}
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
          
          <div className="text-center text-sm text-white/70 mt-8">
            <p>Cursos baixados são salvos localmente para acesso offline via OPFS.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CourseLibrary;
