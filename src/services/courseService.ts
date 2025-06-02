import { Course, CourseFormData } from '@/types';

const API_BASE_URL = import.meta.env.VITE_API_URL || '/api'; // Use environment variable or default to relative path

// Helper to construct full URLs for files served by the backend
const constructFullFileUrl = (filePath: string | null | undefined): string | null => {
  console.log('[constructFullFileUrl] Input filePath:', filePath, 'API_BASE_URL:', API_BASE_URL);
  if (!filePath) {
    console.log('[constructFullFileUrl] Returning null for empty filePath');
    return null;
  }
  
  // Normalize backslashes to forward slashes and encode special characters
  let normalizedAndEncodedPath = filePath.replace(/\\/g, '/');
  // Encode path components, excluding the base /uploads part if present
  const parts = normalizedAndEncodedPath.split('/');
  const encodedParts = parts.map(part => part === 'uploads' ? part : encodeURIComponent(part));
  normalizedAndEncodedPath = encodedParts.join('/');

  // If normalizedAndEncodedPath already starts with http, it's likely a data URL from old system or already full
  if (normalizedAndEncodedPath.startsWith('http') || normalizedAndEncodedPath.startsWith('https:') || normalizedAndEncodedPath.startsWith('data:')) {
    console.log('[constructFullFileUrl] normalizedAndEncodedPath already a full URL or data URL:', normalizedAndEncodedPath);
    return normalizedAndEncodedPath;
  }
  
  // Construct the full URL, ensuring a single slash between base and path
  const baseUrl = API_BASE_URL.replace('/api', ''); // Get base URL without /api
  // Ensure the path starts with a slash if it's not already part of the base URL segment (like /uploads)
  const result = normalizedAndEncodedPath.startsWith('/') ? `${baseUrl}${normalizedAndEncodedPath}` : `${baseUrl}/${normalizedAndEncodedPath}`;

  console.log('[constructFullFileUrl] Constructed URL:', result);
  return result;
};


// Get all courses
export const getAllCourses = async (): Promise<Course[]> => {
  const response = await fetch(`${API_BASE_URL}/courses`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch courses' }));
    throw new Error(errorData.message || 'Failed to fetch courses');
  }
  const courses: Course[] = await response.json();
  return courses.map(course => ({
    ...course,
    coverImage: constructFullFileUrl(course.coverImage),
    scormFile: constructFullFileUrl(course.scormFile),
  }));
};

// Get a single course by ID
export const getCourseById = async (id: string): Promise<Course | undefined> => {
  const response = await fetch(`${API_BASE_URL}/courses/${id}`);
  if (!response.ok) {
    if (response.status === 404) return undefined;
    const errorData = await response.json().catch(() => ({ message: `Failed to fetch course ${id}` }));
    throw new Error(errorData.message || `Failed to fetch course ${id}`);
  }
  const course: Course = await response.json();
  return {
    ...course,
    coverImage: constructFullFileUrl(course.coverImage),
    scormFile: constructFullFileUrl(course.scormFile),
  };
};

// Create a new course
export const createCourse = async (courseData: CourseFormData): Promise<Course> => {
  const formData = new FormData();
  formData.append('name', courseData.name);
  if (courseData.description) {
    formData.append('description', courseData.description);
  }
  if (courseData.coverImage) {
    formData.append('coverImage', courseData.coverImage);
  }
  if (courseData.scormFile) {
    formData.append('scormFile', courseData.scormFile);
  }

  const response = await fetch(`${API_BASE_URL}/courses`, {
    method: 'POST',
    body: formData,
    // Headers are not needed for FormData with fetch, browser sets it
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to create course' }));
    throw new Error(errorData.message || 'Failed to create course');
  }
  const result = await response.json();
  const newCourse = result.course;
  return {
    ...newCourse,
    // Backend now returns relative paths, construct full URLs
    coverImage: constructFullFileUrl(newCourse.coverImage),
    scormFile: constructFullFileUrl(newCourse.scormFile),
  };
};

// Update an existing course
export const updateCourse = async (id: string, courseData: CourseFormData): Promise<Course> => {
  const formData = new FormData();
  formData.append('name', courseData.name);
  if (courseData.description) {
    formData.append('description', courseData.description);
  }
  // Only append files if they are provided (File instance)
  if (courseData.coverImage instanceof File) {
    formData.append('coverImage', courseData.coverImage);
  }
  if (courseData.scormFile instanceof File) {
    formData.append('scormFile', courseData.scormFile);
  }

  const response = await fetch(`${API_BASE_URL}/courses/${id}`, {
    method: 'PUT',
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to update course' }));
    throw new Error(errorData.message || 'Failed to update course');
  }
  const result = await response.json();
  const updatedCourse = result.course;
   return {
    ...updatedCourse,
    coverImage: constructFullFileUrl(updatedCourse.coverImage),
    scormFile: constructFullFileUrl(updatedCourse.scormFile),
  };
};

// Delete a course
export const deleteCourse = async (id: string): Promise<void> => {
  const response = await fetch(`${API_BASE_URL}/courses/${id}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to delete course' }));
    throw new Error(errorData.message || 'Failed to delete course');
  }
  // No content expected on successful delete, or a success message
  return;
};
