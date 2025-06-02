import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Upload, X, Image, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { getCourseById, updateCourse } from '@/services/courseService';
import { CourseFormData } from '@/types';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ACCEPTED_SCORM_TYPES = ['application/zip'];

const formSchema = z.object({
  name: z.string().min(1, 'Nome do curso é obrigatório'),
  description: z.string().optional(),
  category: z.string().min(1, 'Categoria do curso é obrigatória'),
  coverImage: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, 'A imagem deve ter no máximo 100MB')
    .refine(
      (file) => ACCEPTED_IMAGE_TYPES.includes(file.type),
      'Apenas arquivos .jpg, .jpeg, .png e .webp são aceitos'
    )
    .optional()
    .nullable(),
  scormFile: z
    .instanceof(File)
    .refine((file) => file.size <= MAX_FILE_SIZE, 'O arquivo deve ter no máximo 100MB')
    .refine(
      (file) => ACCEPTED_SCORM_TYPES.includes(file.type),
      'Apenas arquivos .zip são aceitos'
    )
    .optional()
    .nullable(),
});

const EditCourse = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CourseFormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      coverImage: null,
      scormFile: null,
    },
  });

  useEffect(() => {
    if (id) {
      loadCourse(id);
    }
  }, [id]);

  const loadCourse = async (courseId: string) => {
    setIsLoading(true);
    try {
      const course = await getCourseById(courseId);
      if (course) {
        form.reset({
          name: course.name,
          description: course.description,
          category: course.category,
          coverImage: null,
          scormFile: null,
        });
        setCoverPreview(course.coverImage);
      } else {
        toast({
          title: 'Erro',
          description: 'Curso não encontrado.',
          variant: 'destructive',
        });
        navigate('/admin');
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar o curso.',
        variant: 'destructive',
      });
      navigate('/admin');
    } finally {
      setIsLoading(false);
    }
  };

  const onSubmit = async (data: CourseFormData) => {
    if (!id) return;
    
    setIsSubmitting(true);
    try {
      await updateCourse(id, data);
      toast({
        title: 'Sucesso',
        description: 'Curso atualizado com sucesso.',
      });
      navigate('/admin');
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o curso.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCoverImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      form.setValue('coverImage', file);
      const reader = new FileReader();
      reader.onload = () => {
        setCoverPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearCoverImage = () => {
    form.setValue('coverImage', null);
    setCoverPreview(null);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-800 via-purple-800 to-purple-900">
      <div className="flex items-center gap-2 mb-8">
        <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
          <ArrowLeft size={18} />
        </Button>
        <h1 className="text-2xl font-bold text-gray-800">Editar Curso</h1>
      </div>

      <div className="bg-white p-6 rounded-lg border shadow-sm">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Curso *</FormLabel>
                  <FormControl>
                    <Input placeholder="Digite o nome do curso" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Digite a descrição do curso"
                      {...field}
                      rows={4}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Categoria *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Digite a categoria do curso" 
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="coverImage"
                render={() => (
                  <FormItem>
                    <FormLabel>Imagem de Capa</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        {coverPreview ? (
                          <div className="relative h-60 w-full rounded-md overflow-hidden border">
                            <img
                              src={coverPreview}
                              alt="Prévia da capa"
                              className="h-full w-full object-cover"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2"
                              onClick={clearCoverImage}
                            >
                              <X size={16} />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-60 border-2 border-dashed rounded-md border-gray-300 p-6">
                            <Image size={48} className="text-gray-400 mb-4" />
                            <div className="text-center">
                              <p className="text-sm text-gray-600 mb-2">
                                Arraste e solte a imagem aqui ou clique para escolher
                              </p>
                              <p className="text-xs text-gray-500">
                                JPG, PNG ou WebP (max. 100MB)
                              </p>
                            </div>
                            <Input
                              type="file"
                              className="hidden"
                              accept="image/jpeg,image/jpg,image/png,image/webp"
                              id="coverImage"
                              onChange={handleCoverImageChange}
                            />
                            <Button
                              type="button"
                              variant="secondary"
                              className="mt-4"
                              onClick={() => document.getElementById('coverImage')?.click()}
                            >
                              Escolher Imagem
                            </Button>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scormFile"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel>Pacote SCORM (.zip)</FormLabel>
                    <FormControl>
                      <div className="flex flex-col items-center justify-center h-60 border-2 border-dashed rounded-md border-gray-300 p-6">
                        <Upload size={48} className="text-gray-400 mb-4" />
                        <div className="text-center">
                          <p className="text-sm text-gray-600 mb-2">
                            Arraste e solte o arquivo zip aqui ou clique para escolher
                          </p>
                          <p className="text-xs text-gray-500">
                            Arquivo ZIP contendo o curso SCORM (max. 100MB)
                          </p>
                          <p className="text-xs text-gray-500 mt-2">
                            Deixe em branco para manter o arquivo atual
                          </p>
                        </div>
                        <Input
                          type="file"
                          className="hidden"
                          accept=".zip,application/zip"
                          id="scormFile"
                          onChange={(e) => {
                            const file = e.target.files?.[0] || null;
                            onChange(file);
                          }}
                          {...field}
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          className="mt-4"
                          onClick={() => document.getElementById('scormFile')?.click()}
                        >
                          Escolher Arquivo
                        </Button>
                        {form.watch('scormFile') && (
                          <p className="mt-2 text-sm text-gray-600">
                            Arquivo selecionado: {form.watch('scormFile')?.name}
                          </p>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate('/admin')}>
                Cancelar
              </Button>
              <Button 
                type="submit" 
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-md transition-colors"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar Alterações
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
};

export default EditCourse;