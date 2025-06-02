import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Upload, X, Image } from 'lucide-react';
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
import { createCourse } from '@/services/courseService';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB
const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ACCEPTED_SCORM_TYPES = ['application/zip', 'application/x-zip-compressed'];

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
    .nullable(),
});

const AddCourse = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      coverImage: null,
      scormFile: null,
    },
  });

  const onSubmit = async (formData: z.infer<typeof formSchema>) => {
    setIsSubmitting(true);
    const dataForService = {
      ...formData,
      description: formData.description ?? '',
      coverImage: formData.coverImage ?? null,
    };
    try {
      await createCourse(dataForService);
      toast({
        title: 'Sucesso',
        description: 'Curso adicionado com sucesso.',
      });
      navigate('/admin');
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar o curso.',
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-800 via-purple-800 to-purple-900">
      <div className="backdrop-blur-xl bg-white/15 rounded-2xl p-8 shadow-2xl">
        <div className="flex items-center gap-2 mb-8">
          <Button variant="ghost" size="icon" onClick={() => navigate('/admin')} className="text-white hover:bg-white/20">
            <ArrowLeft size={18} />
          </Button>
          <h1 className="text-2xl font-bold text-white">Adicionar Novo Curso</h1>
        </div>

        {/* <div className="bg-white p-6 rounded-lg border shadow-sm"> */}
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Nome do Curso *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Digite o nome do curso" 
                      {...field}
                      className="bg-white/20 border-white/30 text-white placeholder-white/70 focus:border-white/50 focus:ring-white/30"
                    />
                  </FormControl>
                  <FormMessage className="text-red-200" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Digite a descrição do curso"
                      {...field}
                      rows={4}
                      className="bg-white/20 border-white/30 text-white placeholder-white/70 focus:border-white/50 focus:ring-white/30"
                    />
                  </FormControl>
                  <FormMessage className="text-red-200" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-white">Categoria *</FormLabel>
                  <FormControl>
                    <Input 
                      placeholder="Digite a categoria do curso" 
                      {...field}
                      value={field.value as string}
                      className="bg-white/20 border-white/30 text-white placeholder-white/70 focus:border-white/50 focus:ring-white/30"
                    />
                  </FormControl>
                  <FormMessage className="text-red-200" />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="coverImage"
                render={() => (
                  <FormItem>
                    <FormLabel className="text-white">Imagem de Capa</FormLabel>
                    <FormControl>
                      <div className="space-y-4">
                        {coverPreview ? (
                          <div className="relative h-60 w-full rounded-md overflow-hidden border border-white/30">
                            <img
                              src={coverPreview}
                              alt="Prévia da capa"
                              className="h-full w-full object-cover"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="icon"
                              className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-500/90 text-white"
                              onClick={clearCoverImage}
                            >
                              <X size={16} />
                            </Button>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-60 border-2 border-dashed rounded-md border-white/30 p-6 bg-white/10">
                            <Image size={48} className="text-white/60 mb-4" />
                            <div className="text-center">
                              <p className="text-sm text-white/80 mb-2">
                                Arraste e solte a imagem aqui ou clique para escolher
                              </p>
                              <p className="text-xs text-white/70">
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
                              className="mt-4 bg-white/20 hover:bg-white/30 text-white border-white/30"
                              onClick={() => document.getElementById('coverImage')?.click()}
                            >
                              Escolher Imagem
                            </Button>
                          </div>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-200" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="scormFile"
                render={({ field: { value, onChange, ...field } }) => (
                  <FormItem>
                    <FormLabel className="text-white">Pacote SCORM (.zip) *</FormLabel>
                    <FormControl>
                      <div className="flex flex-col items-center justify-center h-60 border-2 border-dashed rounded-md border-white/30 p-6 bg-white/10">
                        <Upload size={48} className="text-white/60 mb-4" />
                        <div className="text-center">
                          <p className="text-sm text-white/80 mb-2">
                            Arraste e solte o arquivo zip aqui ou clique para escolher
                          </p>
                          <p className="text-xs text-white/70">
                            Arquivo ZIP contendo o curso SCORM (max. 100MB)
                          </p>
                        </div>
                        <Input
                          type="file"
                          className="hidden"
                          accept=".zip,application/zip,application/x-zip-compressed"
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
                          className="mt-4 bg-white/20 hover:bg-white/30 text-white border-white/30"
                          onClick={() => document.getElementById('scormFile')?.click()}
                        >
                          Escolher Arquivo
                        </Button>
                        {form.watch('scormFile') && (
                          <p className="mt-2 text-sm text-white/80">
                            Arquivo selecionado: {form.watch('scormFile')?.name}
                          </p>
                        )}
                      </div>
                    </FormControl>
                    <FormMessage className="text-red-200" />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => navigate('/admin')} className="bg-white/20 hover:bg-white/30 text-white border-white/30">
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-500 hover:bg-indigo-600 text-white">
                {isSubmitting ? 'Salvando...' : 'Salvar Curso'}
              </Button>
            </div>
          </form>
        </Form>
        {/* </div> */}
      </div>
    </div>
  );
};

export default AddCourse;
