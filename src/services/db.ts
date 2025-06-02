import { Course } from '@/types';

// In-memory database for development
const courses: Course[] = [];

// Get all courses
export const getAllCourses = (): Course[] => {
  return [...courses];
};

// Get a single course
export const getCourseById = (id: string): Course | undefined => {
  return courses.find(course => course.id === id);
};

// Create a new course
export const createCourse = (course: Course): void => {
  courses.push(course);
};

// Update a course
export const updateCourse = (id: string, updatedCourse: Course): void => {
  const index = courses.findIndex(course => course.id === id);
  if (index !== -1) {
    courses[index] = updatedCourse;
  }
};

// Delete a course
export const deleteCourse = (id: string): void => {
  const index = courses.findIndex(course => course.id === id);
  if (index !== -1) {
    courses.splice(index, 1);
  }
};