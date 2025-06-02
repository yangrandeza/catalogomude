import { Course } from '@/types';
import JSZip from 'jszip';
import { XMLParser } from 'fast-xml-parser';

// Constants
const OPFS_DIR = 'scorm-courses';
const METADATA_FILE = 'metadata.json';
const CATEGORIES_FILE = 'categories.json';
const CHUNK_SIZE = 1024 * 1024; // 1MB chunks for streaming
// Use environment variable or default to relative path
const BACKEND_BASE_URL = import.meta.env.VITE_API_URL || '';

// Helper function to ensure the OPFS directory exists
const ensureDirectory = async (): Promise<FileSystemDirectoryHandle> => {
  const root = await navigator.storage.getDirectory();
  return await root.getDirectoryHandle(OPFS_DIR, { create: true });
};

// Save course metadata to OPFS and return derived categories
export const saveMetadata = async (courses: Course[]): Promise<string[]> => {
  try {
    const dir = await ensureDirectory();
    const fileHandle = await dir.getFileHandle(METADATA_FILE, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(courses));
    await writable.close();

    // Also save categories
    const uniqueCategories = Array.from(new Set(courses.map(course => course.category).filter(Boolean))).sort();
    await saveCategories(uniqueCategories);
    return uniqueCategories; // Return the derived categories
  } catch (error) {
    console.error('Error saving metadata:', error);
    throw error; // Re-throw error so caller knows metadata saving failed
  }
};

// Save categories to OPFS
export const saveCategories = async (categories: string[]): Promise<void> => {
  try {
    const dir = await ensureDirectory();
    const fileHandle = await dir.getFileHandle(CATEGORIES_FILE, { create: true });
    const writable = await fileHandle.createWritable();
    await writable.write(JSON.stringify(categories));
    await writable.close();
  } catch (error) {
    console.error('Error saving categories:', error);
    // Not throwing here, as metadata saving is more critical
  }
};

// Load course metadata from OPFS
export const loadMetadata = async (): Promise<Course[]> => {
  try {
    const dir = await ensureDirectory();
    try {
      const fileHandle = await dir.getFileHandle(METADATA_FILE);
      const file = await fileHandle.getFile();
      const text = await file.text();
      return JSON.parse(text);
    } catch {
      return [];
    }
  } catch (error) {
    console.error('Error loading metadata:', error);
    throw error;
  }
};

// Load categories from OPFS
export const loadCategories = async (): Promise<string[]> => {
  try {
    const dir = await ensureDirectory();
    try {
      const fileHandle = await dir.getFileHandle(CATEGORIES_FILE);
      const file = await fileHandle.getFile();
      const text = await file.text();
      return JSON.parse(text);
    } catch {
      return []; // If file doesn't exist or error parsing, return empty array
    }
  } catch (error) {
    console.error('Error loading categories:', error);
    return []; // Return empty on error
  }
};

// Check if a course is downloaded
export const isCourseDownloaded = async (courseId: string): Promise<boolean> => {
  try {
    const dir = await ensureDirectory();
    try {
      await dir.getDirectoryHandle(courseId);
      return true;
    } catch {
      return false;
    }
  } catch (error) {
    console.error('Error checking course download status:', error);
    return false;
  }
};

// Parse SCORM manifest
interface ScormManifest {
  launchUrl: string;
  version: '1.2' | '2004';
  title: string;
  prerequisites?: string[];
}

// Helper function to recursively find the first item with an identifierref
function findLaunchItem(items: any[]): any | null {
    if (!Array.isArray(items)) {
        // If items is not an array, it might be a single item object
        if (items && items['@_identifierref']) {
            return items;
        }
        return null;
    }
    for (const item of items) {
        if (item['@_identifierref']) {
            return item;
        }
        // Check for nested items recursively
        if (item.item) {
            const found = findLaunchItem(item.item);
            if (found) return found;
        }
    }
    return null;
}

const parseScormManifest = async (manifestXml: string): Promise<ScormManifest> => {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    // Add other options if needed, e.g., to handle CDATA or different namespaces
  });
  
  const result = parser.parse(manifestXml);
  const manifest = result.manifest;

  if (!manifest) {
    console.error('[parseScormManifest] Invalid manifest structure: missing manifest root.', result);
    throw new Error('Invalid manifest structure: missing manifest root.');
  }
  
  // Detect SCORM version
  let version: '1.2' | '2004' = '1.2'; // Default to 1.2, more common for simpler packages
  const schemaVersion = manifest.metadata?.schemaversion;

  console.log('[parseScormManifest] Raw schemaversion from manifest:', schemaVersion, '(type:', typeof schemaVersion, ')');

  if (schemaVersion) {
    const svStr = String(schemaVersion).toLowerCase(); // Convert to string and lowercase for robust checking
    if (svStr.includes('1.2')) {
      version = '1.2';
    } else if (svStr.includes('2004') || svStr.includes('cam 1.3') || svStr.includes('cam1.3')) {
      version = '2004';
    } else {
      console.warn(`[parseScormManifest] Unrecognized schemaversion '${schemaVersion}'. Defaulting to version '${version}'.`);
    }
  } else {
    console.warn('[parseScormManifest] schemaversion not found or empty in manifest.metadata. Defaulting version.');
  }
  console.log('[parseScormManifest] Detected SCORM version:', version);
  
  // Find launch URL - Follow standard SCORM manifest structure
  let launchUrl = '';
  const organizations = manifest.organizations;
  let defaultOrganization = null; // Declare defaultOrganization here

  if (organizations) {
    // Handle cases where organizations is an array (less common) or a single object
    const orgsArray = Array.isArray(organizations.organization) ? organizations.organization : [organizations.organization];
    
    const defaultOrgId = organizations['@_default'];

    if (defaultOrgId) {
      defaultOrganization = orgsArray.find((org: any) => org['@_identifier'] === defaultOrgId);
    }

    // If default organization is not found by id, try the first one if available
    if (!defaultOrganization && orgsArray.length > 0) {
         defaultOrganization = orgsArray[0];
         console.warn('[parseScormManifest] Default organization not found by id or organizations node not an array, using the first one.', defaultOrganization);
    }

    if (defaultOrganization && defaultOrganization.item) {
      // Find the first item with a resource reference, potentially nested.
      let launchItem = findLaunchItem(defaultOrganization.item);
      
      if (launchItem) {
        const resourceId = launchItem['@_identifierref'];

        if (resourceId && manifest.resources?.resource) {
          const resources = Array.isArray(manifest.resources.resource) ? manifest.resources.resource : [manifest.resources.resource];
          const launchResource = resources.find((res: any) => res['@_identifier'] === resourceId);

          if (launchResource) {
            launchUrl = launchResource['@_href'] || '';
             console.log('[parseScormManifest] Found launchUrl:', launchUrl, 'for resourceId:', resourceId);
          } else {
             console.warn('[parseScormManifest] Launch resource not found for id:', resourceId);
          }
        } else {
           console.warn('[parseScormManifest] Resource ID not found on launch item or resources section missing.', launchItem, manifest.resources);
        }
      } else {
         console.warn('[parseScormManifest] Launch item not found in default organization.', defaultOrganization);
      }
    }
  } else {
      console.warn('[parseScormManifest] Organizations node missing in manifest.', manifest);
  }
  
  if (!launchUrl) {
      console.error('[parseScormManifest] Could not find launch URL in manifest after parsing attempt.', manifest);
      // Still throw an error as launchUrl is essential
      throw new Error('Could not find launch URL in manifest.');
  }

  // Get title (fallback to organization title if item title is missing)
  const title = defaultOrganization?.title || 'Unnamed Course';
  
  // Get prerequisites (this structure can vary, basic attempt)
  // This part might need refinement based on actual manifest examples
  const prerequisites = defaultOrganization?.item?.prerequisites || [];
  
  return {
    launchUrl,
    version,
    title,
    prerequisites: Array.isArray(prerequisites) ? prerequisites : [prerequisites]
  };
};

// Download and process SCORM package
export const downloadCourse = async (
  course: Course,
  onProgress: (progress: number) => void
): Promise<void> => {
  try {
    const dir = await ensureDirectory();
    const courseDir = await dir.getDirectoryHandle(course.id, { create: true });
    
    // Determine the correct URL for the SCORM file
    let scormFileUrl = course.scormFile;
    if (scormFileUrl && !scormFileUrl.startsWith('http') && !scormFileUrl.startsWith('https')) {
      // If it's not a full URL, prepend the backend base URL
      scormFileUrl = `${BACKEND_BASE_URL}${course.scormFile}`;
    }

    
    console.log('Attempting to download SCORM from URL:', scormFileUrl); // Log the URL
    if (!scormFileUrl) {
      throw new Error('SCORM file URL is missing for course: ' + course.name);
    }
    // Download the SCORM package
    const response = await fetch(scormFileUrl);
    
    if (!response.ok) {
      console.error('Failed to download SCORM package. Status:', response.status, 'URL:', scormFileUrl);
      throw new Error(`Failed to download SCORM package. Status: ${response.status}`);
    }
    
    const reader = response.body!.getReader();
    const contentLength = Number(response.headers.get('Content-Length')) || 0;
    
    // Create a writable stream for the zip file
    const zipFileHandle = await courseDir.getFileHandle('package.zip', { create: true });
    const zipWritable = await zipFileHandle.createWritable();
    
    let receivedLength = 0;
    
    // Stream the download in chunks
    while (true) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      await zipWritable.write(value);
      receivedLength += value.length;
      
      const progress = Math.round((receivedLength / contentLength) * 50); // First 50%
      onProgress(progress);
    }
    
    await zipWritable.close();
    
    // Read the downloaded zip file
    const zipFile = await zipFileHandle.getFile();
    const zip = await JSZip.loadAsync(await zipFile.arrayBuffer());
    
    // Extract and process the manifest
    const manifestEntry = zip.file('imsmanifest.xml');
    if (!manifestEntry) throw new Error('Invalid SCORM package: No manifest found');
    
    const manifestContent = await manifestEntry.async('string');
    const manifest = await parseScormManifest(manifestContent);
    
    // Save manifest info
    const manifestFileHandle = await courseDir.getFileHandle('manifest.json', { create: true });
    const manifestWritable = await manifestFileHandle.createWritable();
    await manifestWritable.write(JSON.stringify(manifest));
    await manifestWritable.close();
    
    // Extract all files
    let extractedFiles = 0;
    const totalFiles = Object.keys(zip.files).length;
    
    for (const [path, file] of Object.entries(zip.files)) {
      if (!file.dir) {
        const content = await file.async('arraybuffer');
        const pathParts = path.split('/');
        
        // Create subdirectories if needed
        let currentDir = courseDir;
        for (let i = 0; i < pathParts.length - 1; i++) {
          currentDir = await currentDir.getDirectoryHandle(pathParts[i], { create: true });
        }
        
        // Write the file
        const fileHandle = await currentDir.getFileHandle(pathParts[pathParts.length - 1], { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(content);
        await writable.close();
        
        extractedFiles++;
        const extractProgress = 50 + Math.round((extractedFiles / totalFiles) * 50); // Last 50%
        onProgress(extractProgress);
      }
    }
    
    // Save course data
    const courseDataToSave = { ...course, manifest };
    console.log('[OPFS Service] Saving course.json with data:', courseDataToSave);
    const courseDataHandle = await courseDir.getFileHandle('course.json', { create: true });
    const courseWritable = await courseDataHandle.createWritable();
    await courseWritable.write(JSON.stringify(courseDataToSave));
    await courseWritable.close();
    
  } catch (error) {
    console.error('Error downloading course:', error);
    throw error;
  }
};

// Delete a downloaded course
export const deleteCourseDownload = async (courseId: string): Promise<void> => {
  try {
    const dir = await ensureDirectory();
    await dir.removeEntry(courseId, { recursive: true });
  } catch (error) {
    console.error('Error deleting course:', error);
    throw error;
  }
};

// Get course content for playback
export interface CourseContent extends Course {
  manifest?: ScormManifest;
}

export const getCourseContent = async (courseId: string): Promise<CourseContent | null> => {
  console.log(`[OPFS Service] Attempting to get course content for courseId: ${courseId}`);
  try {
    const dir = await ensureDirectory();
    console.log('[OPFS Service] OPFS directory ensured.');
    const courseDir = await dir.getDirectoryHandle(courseId);
    console.log(`[OPFS Service] Course directory handle obtained for courseId: ${courseId}`);
    
    // Get course data
    const courseFileHandle = await courseDir.getFileHandle('course.json');
    console.log('[OPFS Service] course.json file handle obtained.');
    const courseFile = await courseFileHandle.getFile();
    console.log('[OPFS Service] course.json file obtained.');
    const courseData = JSON.parse(await courseFile.text());
    console.log('[OPFS Service] course.json parsed successfully.', courseData);
    
    if (!courseData || !courseData.manifest) {
        console.warn('[OPFS Service] course.json is missing courseData or manifest property.', courseData);
        // Optionally throw here if missing expected structure
        // throw new Error('Invalid course data structure in course.json');
    }

    return courseData; // This already includes the manifest from the download process
  } catch (error) {
    console.error(`[OPFS Service] Error getting course content for courseId ${courseId}:`, error);
    return null;
  }
};

// Get a file from a course
export const getCourseFile = async (courseId: string, filePath: string): Promise<File | null> => {
  try {
    const dir = await ensureDirectory();
    const courseDir = await dir.getDirectoryHandle(courseId);
    
    // Navigate through subdirectories if filePath contains them
    const pathParts = filePath.split('/').filter(part => part !== ''); // Split and remove empty parts
    let currentDir: FileSystemDirectoryHandle = courseDir;
    
    for (let i = 0; i < pathParts.length - 1; i++) {
      currentDir = await currentDir.getDirectoryHandle(pathParts[i]);
    }
    
    // Get the file handle for the final file
    const fileHandle = await currentDir.getFileHandle(pathParts[pathParts.length - 1]);
    const file = await fileHandle.getFile();
    
    return file;
  } catch (error) {
    console.error(`Error getting file ${filePath} for course ${courseId} from OPFS:`, error);
    return null;
  }
};
