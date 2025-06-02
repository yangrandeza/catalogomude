const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const { MongoClient, ObjectId } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3001;

// MongoDB Connection URL - use environment variable
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/scorm_courses';
let db;

// Connect to MongoDB
async function connectToMongo() {
  try {
    const client = await MongoClient.connect(MONGODB_URI);
    db = client.db();
    console.log('Connected to MongoDB');
  } catch (err) {
    console.error('Failed to connect to MongoDB:', err);
    process.exit(1);
  }
}

connectToMongo();

// --- Middleware ---
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? ['https://catalogomude-git-main-yangrandezas-projects.vercel.app'] 
    : ['http://localhost:5173', 'http://192.168.1.11:5173'],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json());

// Log requested static file path for debugging
app.use('/uploads', (req, res, next) => {
  console.log('[Static File Request] Path requested:', req.path);
  next();
});

// Serve uploaded files from Vercel blob storage or local uploads
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- Multer Setup for File Uploads ---
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    let dest;
    if (file.fieldname === 'coverImage') {
      dest = path.join(__dirname, 'uploads/covers');
    } else if (file.fieldname === 'scormFile') {
      dest = path.join(__dirname, 'uploads/scorms');
    } else {
      return cb(new Error('Invalid fieldname for file upload'), null);
    }
    fs.ensureDirSync(dest);
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    if (file.fieldname === 'scormFile') {
      cb(null, file.originalname);
    } else {
      cb(null, file.fieldname + '-' + uniqueSuffix + extension);
    }
  }
});

const upload = multer({
  storage: storage,
  fileFilter: function (req, file, cb) {
    if (file.fieldname === 'coverImage') {
      if (!['image/jpeg', 'image/png', 'image/webp', 'image/jpg'].includes(file.mimetype)) {
        return cb(new Error('Invalid image file type'), false);
      }
    } else if (file.fieldname === 'scormFile') {
      if (!['application/zip', 'application/x-zip-compressed'].includes(file.mimetype)) {
        return cb(new Error('Invalid SCORM file type, must be a ZIP'), false);
      }
    }
    cb(null, true);
  }
}).fields([{ name: 'coverImage', maxCount: 1 }, { name: 'scormFile', maxCount: 1 }]);

// --- API Routes ---

// GET /api/health
app.get('/api/health', (req, res) => {
  res.json({ status: 'Server is running', timestamp: new Date().toISOString() });
});

// POST /api/courses - Add a new course
app.post('/api/courses', async (req, res) => {
  try {
    upload(req, res, async function (err) {
      if (err) {
        return res.status(400).json({ message: err.message });
      }

      const { name, description, category } = req.body;
      if (!name) {
        return res.status(400).json({ message: 'Course name is required.' });
      }

      const id = uuidv4();
      const uploadDate = new Date().toISOString();
      
      const coverImagePath = req.files?.coverImage ? path.join('covers', req.files.coverImage[0].filename) : null;
      const scormFilePath = req.files?.scormFile ? path.join('scorms', req.files.scormFile[0].filename) : null;

      const course = {
        _id: id,
        name,
        description: description || '',
        coverImage: coverImagePath,
        scormFile: scormFilePath,
        category: category || '',
        uploadDate
      };

      await db.collection('courses').insertOne(course);
      
      res.status(201).json({
        message: 'Course added successfully',
        course: {
          id,
          ...course,
          coverImage: coverImagePath ? `/uploads/${coverImagePath}` : null,
          scormFile: scormFilePath ? `/uploads/${scormFilePath}` : null
        }
      });
    });
  } catch (error) {
    console.error('Error creating course:', error);
    res.status(500).json({ message: 'Error creating course', error: error.message });
  }
});

// GET /api/courses - Get all courses
app.get('/api/courses', async (req, res) => {
  try {
    const courses = await db.collection('courses')
      .find()
      .sort({ uploadDate: -1 })
      .toArray();

    res.json(courses.map(course => ({
      ...course,
      id: course._id,
      coverImage: course.coverImage ? `/uploads/${course.coverImage}` : null,
      scormFile: course.scormFile ? `/uploads/${course.scormFile}` : null
    })));
  } catch (error) {
    console.error('Error fetching courses:', error);
    res.status(500).json({ message: 'Error fetching courses', error: error.message });
  }
});

// GET /api/courses/:id - Get a single course
app.get('/api/courses/:id', async (req, res) => {
  try {
    const course = await db.collection('courses').findOne({ _id: req.params.id });
    
    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    res.json({
      ...course,
      id: course._id,
      coverImage: course.coverImage ? `/uploads/${course.coverImage}` : null,
      scormFile: course.scormFile ? `/uploads/${course.scormFile}` : null
    });
  } catch (error) {
    console.error('Error fetching course:', error);
    res.status(500).json({ message: 'Error fetching course', error: error.message });
  }
});

// PUT /api/courses/:id - Update a course
app.put('/api/courses/:id', async (req, res) => {
  try {
    upload(req, res, async function (err) {
      if (err) {
        return res.status(400).json({ message: err.message });
      }

      const { name, description, category } = req.body;
      const courseId = req.params.id;

      const oldCourse = await db.collection('courses').findOne({ _id: courseId });
      
      if (!oldCourse) {
        return res.status(404).json({ message: 'Course not found.' });
      }

      const updateData = {
        name,
        description: description || '',
        category: category || ''
      };

      if (req.files?.coverImage) {
        updateData.coverImage = path.join('covers', req.files.coverImage[0].filename);
      }

      if (req.files?.scormFile) {
        updateData.scormFile = path.join('scorms', req.files.scormFile[0].filename);
      }

      await db.collection('courses').updateOne(
        { _id: courseId },
        { $set: updateData }
      );

      const updatedCourse = await db.collection('courses').findOne({ _id: courseId });
      
      res.json({
        message: 'Course updated successfully',
        course: {
          ...updatedCourse,
          id: updatedCourse._id,
          coverImage: updatedCourse.coverImage ? `/uploads/${updatedCourse.coverImage}` : null,
          scormFile: updatedCourse.scormFile ? `/uploads/${updatedCourse.scormFile}` : null
        }
      });
    });
  } catch (error) {
    console.error('Error updating course:', error);
    res.status(500).json({ message: 'Error updating course', error: error.message });
  }
});

// DELETE /api/courses/:id - Delete a course
app.delete('/api/courses/:id', async (req, res) => {
  try {
    const courseId = req.params.id;
    const course = await db.collection('courses').findOne({ _id: courseId });

    if (!course) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    await db.collection('courses').deleteOne({ _id: courseId });

    // Delete associated files
    if (course.coverImage) {
      fs.unlink(path.join(__dirname, 'uploads', course.coverImage))
        .catch(err => console.error("Error deleting cover image:", err));
    }
    if (course.scormFile) {
      fs.unlink(path.join(__dirname, 'uploads', course.scormFile))
        .catch(err => console.error("Error deleting SCORM file:", err));
    }

    res.json({ message: 'Course deleted successfully.' });
  } catch (error) {
    console.error('Error deleting course:', error);
    res.status(500).json({ message: 'Error deleting course', error: error.message });
  }
});

// --- Start Server ---
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}

module.exports = app;
