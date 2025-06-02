import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider } from '@/components/theme-provider';
import { Toaster } from '@/components/ui/toaster';
import { Suspense, lazy } from 'react';
import Loading from '@/components/Loading';
import AuthProvider from '@/context/AuthContext';
import AdminLayout from '@/layouts/AdminLayout';
import ClientLayout from '@/layouts/ClientLayout';

// Admin pages
const Login = lazy(() => import('@/pages/admin/Login'));
const Dashboard = lazy(() => import('@/pages/admin/Dashboard'));
const AddCourse = lazy(() => import('@/pages/admin/AddCourse'));
const EditCourse = lazy(() => import('@/pages/admin/EditCourse'));

// Client pages
const CourseLibrary = lazy(() => import('@/pages/client/CourseLibrary'));
const CoursePlayer = lazy(() => import('@/pages/client/CoursePlayer'));

function App() {
  return (
    <ThemeProvider defaultTheme="light">
      <AuthProvider>
        <Router>
          <Suspense fallback={<Loading />}>
            <Routes>
              {/* Admin Routes - No longer protected by ProtectedRoute */}
              <Route path="/admin/login" element={<Login />} />
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<Dashboard />} />
                <Route path="add-course" element={<AddCourse />} />
                <Route path="edit-course/:id" element={<EditCourse />} />
              </Route>

              {/* Client Routes */}
              <Route path="/" element={<ClientLayout />}>
                <Route index element={<CourseLibrary />} />
                <Route path="player/:id" element={<CoursePlayer />} />
              </Route>
            </Routes>
          </Suspense>
        </Router>
        <Toaster />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;