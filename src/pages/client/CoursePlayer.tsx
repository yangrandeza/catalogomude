import { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { getCourseContent, /* getCourseFile, */ CourseContent } from '@/services/opfsService'; // getCourseFile is no longer needed here
import { initializeScormWrapper, terminateScormWrapper } from '@/utils/scormWrapper';
import { initializeLMSAPIService, resetLMSAPIService } from '@/lmsAPIService';
// AuthContext and useAuth are still imported but won't be used for basic course loading logic
// import AuthContext, { useAuth } from '@/context/AuthContext'; // useAuth is no longer used in this component

const CoursePlayer = () => {
  const { id } = useParams<{ id: string }>();
  // Removed dependency on isAuthenticated for core course loading
  // const { isAuthenticated } = useAuth(); // Removed as isAuthenticated is no longer used
  const navigate = useNavigate();
  const { toast } = useToast();
  const [course, setCourse] = useState<CourseContent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scormApiInitialized, setScormApiInitialized] = useState(false); // Tracks if our LMS API is fully initialized with data
  const [scormContentLoaded, setScormContentLoaded] = useState(false);

  // Effect to initialize API and load course data from OPFS
  useEffect(() => {
    const courseId = id;
    // TODO: Replace 'TEMPORARY_USER_ID' with actual user ID retrieval logic
    const userId = "TEMPORARY_USER_ID"; // Placeholder for userId

    // Course loading should not depend on authentication state for offline playback
    if (courseId) { // <-- Removed '&& isAuthenticated'
      // Initialize the LMS API
      initializeLMSAPIService(courseId, userId);
      // Assume API is ready shortly for now, refine if truly async.
      setScormApiInitialized(true);

      // Load the course content from OPFS
      const loadCourseData = async () => {
        try {
          const courseData = await getCourseContent(courseId);
          console.log('[CoursePlayer] Course data from OPFS:', courseData);
          if (courseData && courseData.manifest) {
            setCourse(courseData);
            // Do NOT set loading to false here. Wait for iframe to load.
            setIsLoading(false); // Set loading to false after course data is loaded to render the iframe
          } else {
             console.error('[CoursePlayer] Invalid course data or manifest from OPFS after loading.', courseData);
             throw new Error('Invalid course data or manifest from OPFS.');
          }
        } catch (error) {
          console.error('Error loading course data:', error);
          toast({
            title: 'Erro',
            description: 'Não foi possível carregar os dados do curso offline.',
            variant: 'destructive',
          });
          setIsLoading(false); // Hide loader on error
          // navigate('/'); // Consider navigating back on failure
        }
      };

      loadCourseData();

    } else { // This else block now only handles the case where courseId is missing
       console.warn('[CoursePlayer] Course ID is missing.');
       toast({ title: 'Erro', description: 'ID do curso não fornecido.', variant: 'destructive' });
       navigate('/'); // Navigate back if course ID is missing
    }

    return () => {
      // Cleanup LMS API on component unmount
      resetLMSAPIService();
      setScormApiInitialized(false); // Reset state on unmount
    };
  }, [id, navigate, toast]); // Added navigate and toast to dependencies

  // Effect to load SCORM content into iframe once course data and iframe ref are ready
  useEffect(() => {
      if (course?.manifest?.launchUrl && iframeRef.current) {
           const courseId = id; // Ensure courseId is available
           const launchUrl = course.manifest.launchUrl;

           // Construct the URL that the Service Worker will intercept
           // Example: /scorm-content/{courseId}/launch.html
           const serviceWorkerUrl = `/scorm-content/${courseId}/${launchUrl}`;
           console.log('[CoursePlayer] Setting iframe src to Service Worker URL:', serviceWorkerUrl);
           iframeRef.current.src = serviceWorkerUrl;

           iframeRef.current.onload = () => {
             console.log('[CoursePlayer] iframe content loaded.');
             setScormContentLoaded(true); // Signal that iframe content is loaded
             setIsLoading(false); // Hide loader once content frame is loaded
           };
           iframeRef.current.onerror = () => {
             console.error("Error loading SCORM content into iframe.", serviceWorkerUrl);
             toast({ title: 'Erro', description: 'Falha ao carregar o conteúdo SCORM no iframe.', variant: 'destructive' });
             setScormContentLoaded(false);
             setIsLoading(false); // Hide loader on error
           };

      } else if (course && !course?.manifest?.launchUrl) {
          // Log an error if course data loaded but manifest or launchUrl is missing
          console.error('[CoursePlayer] Course data loaded but launchUrl is missing from manifest.', course);
           toast({
            title: 'Erro',
            description: 'Manifesto do curso inválido: Launch URL não encontrada.',
            variant: 'destructive',
          });
          setIsLoading(false); // Hide loader on error
           // Consider navigating back or showing a specific error message
      } else if (!iframeRef.current && course) {
          // This case is less likely but indicates iframe isn't ready after course data loaded
           console.warn('[CoursePlayer] iframe ref is not available after course data loaded. Retrying or checking render logic.');
           // Could add retry logic or check component rendering flow if this happens frequently
      }
      // Dependencies: Rerun when course data or iframeRef changes
  }, [course, iframeRef, id, toast]); // Added id and toast to dependencies

  // This effect handles the SCORM content's own initialization attempt
  // once the iframe is loaded and our API is available.
  useEffect(() => {
    // Trigger the SCORM wrapper initialization ONLY when our API is guaranteed ready
    // and the iframe has loaded content.
    if (scormApiInitialized && scormContentLoaded && iframeRef.current?.contentWindow) {
       console.log('[CoursePlayer] Attempting to initialize SCORM wrapper...');
      // We use your initializeScormWrapper which uses pipwerks to find our window.API
      const success = initializeScormWrapper(); // This attempts pipwerks.SCORM.init()
      if (success) {
        console.log('[CoursePlayer] pipwerks SCORM wrapper initialized successfully via initializeScormWrapper.');
        // The SCORM content should now be able to call LMSInitialize on our window.API
      } else {
        console.error('[CoursePlayer] pipwerks SCORM wrapper failed to initialize via initializeScormWrapper. This means it could not find window.API or window.API_1484_11.');
         // Handle failure to initialize SCORM wrapper - potentially show an error to the user
      }

      // The terminateScormWrapper should ideally be called when the SCORM content
      // is finished or unloaded, which is hard to detect perfectly. Calling it on
      // component cleanup is a fallback.
       return () => {
           console.log('[CoursePlayer] Attempting to terminate SCORM wrapper...');
           terminateScormWrapper(); 
       }
    }
     // Rerun this effect if API init status or content loaded status changes
  }, [scormApiInitialized, scormContentLoaded]);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  return (
    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-indigo-800 via-purple-800 to-purple-900">
      <header className={`bg-white/10 backdrop-blur-lg border-b border-white/20 p-4 ${isFullscreen ? 'hidden' : ''}`}>
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => navigate('/')}
              className="text-white hover:bg-white/20"
            >
              <ArrowLeft size={18} />
            </Button>
            <h1 className="text-xl font-semibold text-white">{course?.name || (isLoading ? 'Carregando curso...' : 'Erro ao carregar curso')}</h1>
          </div>
          <div className="flex items-center gap-4">
            {/* Removed the API status text here as it's less relevant directly in header */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFullscreen}
              className="text-white hover:bg-white/20"
            >
              {isFullscreen ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </Button>
          </div>
        </div>
      </header>
      
      <main className={`max-w-7xl mx-auto ${isFullscreen ? 'p-0' : 'p-4'} h-full`}>
        {isLoading ? (
          <div className="flex justify-center items-center h-[calc(100vh-8rem)]">
            <Loader2 className="h-8 w-8 animate-spin text-white" />
          </div>
        ) : (
          <div className={`bg-white rounded-lg shadow-xl overflow-hidden ${isFullscreen ? 'w-screen h-screen' : 'h-[calc(100vh-8rem)]'}`}>
            {course ? (
                 <iframe 
                   ref={iframeRef}
                   title="SCORM Content"
                   className="w-full h-full border-0"
                   allowFullScreen
                   // src is now set dynamically in the useEffect after API init and course data load
                 />
            ) : (
                <div className="flex justify-center items-center h-full text-red-500">
                   Falha ao carregar o conteúdo do curso.
                </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default CoursePlayer;
