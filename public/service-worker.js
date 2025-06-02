console.log('SCORM OPFS Service Worker registering...');

const OPFS_DIR = 'scorm-courses';

// Intercept fetch requests
self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);

  // Check if the request is for SCORM content served from OPFS
  // Expected URL pattern: /scorm-content/{courseId}/path/to/file
  if (url.pathname.startsWith('/scorm-content/')) {
    const pathSegments = url.pathname.split('/').filter(segment => segment !== '');
    // Expected segments: ['scorm-content', courseId, ...filePathSegments]

    if (pathSegments.length >= 3 && pathSegments[0] === 'scorm-content') {
      const courseId = pathSegments[1];
      const filePathSegments = pathSegments.slice(2);
      const opfsPath = [OPFS_DIR, courseId, ...filePathSegments].join('/');
      
      console.log(`[Service Worker] Intercepting SCORM request for course ${courseId}: ${url.pathname} -> OPFS path: ${opfsPath}`);

      event.respondWith((async () => {
        try {
          const root = await navigator.storage.getDirectory();
          const fileHandle = await getFileHandleRecursive(root, opfsPath.split('/'));
          if (!fileHandle) {
            console.warn(`[Service Worker] File not found in OPFS: ${opfsPath}`);
            return new Response('SCORM file not found', { status: 404 });
          }
          const file = await fileHandle.getFile();
          console.log(`[Service Worker] Serving file from OPFS: ${opfsPath}`);
          return new Response(file, { headers: { 'Content-Type': file.type || 'application/octet-stream' } });

        } catch (error) {
          console.error(`[Service Worker] Error serving file ${opfsPath} from OPFS:`, error);
          return new Response('Error serving SCORM file', { status: 500 });
        }
      })());
    } else {
       console.warn(`[Service Worker] Unrecognized SCORM content URL pattern: ${url.pathname}`);
    }
  }
});

// Helper function to get a file handle navigating through directories
// Similar logic to getCourseFile but for Service Worker context
async function getFileHandleRecursive(directoryHandle, pathSegments) {
  if (pathSegments.length === 0) return null; // Should not happen for a file path

  let currentHandle = directoryHandle;

  for (let i = 0; i < pathSegments.length; i++) {
    const segment = pathSegments[i];
    try {
      if (i === pathSegments.length - 1) {
        // Last segment is the file
        if (currentHandle.kind === 'directory') {
             return await currentHandle.getFileHandle(segment);
        } else {
             // This case indicates a path error, trying to get file handle from a file handle
             console.error('[Service Worker] Path resolution error: expected directory, found file.', currentHandle);
             return null;
        }
      } else {
        // Intermediate segment is a directory
         if (currentHandle.kind === 'directory') {
            currentHandle = await currentHandle.getDirectoryHandle(segment);
         } else {
             // This case indicates a path error, trying to get directory handle from a file handle
             console.error('[Service Worker] Path resolution error: expected directory, found file.', currentHandle);
             return null;
         }
      }
    } catch (error) {
      console.warn(`[Service Worker] Could not get handle for path segment: ${segment}`, error);
      return null; // Path segment not found
    }
  }
  return null; // Should be caught inside the loop
}

console.log('SCORM OPFS Service Worker registered.'); 