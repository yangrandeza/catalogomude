const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const path = require('path');
const fs = require('fs-extra'); // Using fs-extra for ensureDirSync
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3001;
const DB_PATH = path.join(__dirname, 'courses.db');

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
  next(); // Continue to the static middleware
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve uploaded files

// --- Database Setup ---
const db = new sqlite3.Database(DB_PATH, (err) => {
  if (err) {
    console.error('Error opening database', err.message);
  } else {
    console.log('Connected to the SQLite database.');
    db.run(`
      CREATE TABLE IF NOT EXISTS courses (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT,
        coverImage TEXT,      -- Path to cover image
        scormFile TEXT,       -- Path to SCORM zip file
        category TEXT,        -- Adicionado campo de categoria
        uploadDate TEXT NOT NULL
      )
    `, (err) => {
      if (err) {
        console.error('Error creating courses table', err.message);
      } else {
        console.log('Courses table created or already exists.');
      }
    });
  }
});

// --- Ensure Upload Directories Exist ---
const uploadsDir = path.join(__dirname, 'uploads');
const coversDir = path.join(uploadsDir, 'covers');
const scormsDir = path.join(uploadsDir, 'scorms');

try {
  fs.ensureDirSync(uploadsDir);
  fs.ensureDirSync(coversDir);
  fs.ensureDirSync(scormsDir);
  console.log('Upload directories ensured.');
} catch (err) {
  console.error('Error creating upload directories:', err);
}


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
    fs.ensureDirSync(dest); // Ensure directory exists
    cb(null, dest);
  },
  filename: function (req, file, cb) {
    // Keep original filename for SCORM, unique name for images
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    if (file.fieldname === 'scormFile') {
      cb(null, file.originalname); // Could add unique prefix if needed
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
app.post('/api/courses', (req, res) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: 'Multer error uploading file.', error: err.message });
    } else if (err) {
      return res.status(400).json({ message: 'Error uploading file.', error: err.message });
    }

    const { name, description, category } = req.body;
    if (!name) {
      return res.status(400).json({ message: 'Course name is required.' });
    }
    if (!req.files || !req.files.scormFile || !req.files.scormFile[0]) {
        // If scormFile is optional, handle this differently. For now, assuming it's required.
        return res.status(400).json({ message: 'SCORM file is required.' });
    }

    const id = uuidv4();
    const uploadDate = new Date().toISOString();
    
    // Paths relative to the 'uploads' static serving directory
    const coverImagePath = req.files.coverImage ? path.join('covers', req.files.coverImage[0].filename) : null;
    const scormFilePath = path.join('scorms', req.files.scormFile[0].filename);

    const sql = `INSERT INTO courses (id, name, description, coverImage, scormFile, uploadDate, category)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`;
    const params = [id, name, description || '', coverImagePath, scormFilePath, uploadDate, category || ''];

    db.run(sql, params, function (err) {
      if (err) {
        console.error('Error inserting course:', err.message);
        // Clean up uploaded files if DB insert fails
        if (req.files.coverImage && req.files.coverImage[0]) fs.unlink(req.files.coverImage[0].path, () => {});
        // Delete the temporary SCORM file if DB insert fails
        if (req.files.scormFile && req.files.scormFile[0]) fs.unlink(req.files.scormFile[0].path, () => {});
        return res.status(500).json({ message: 'Error saving course to database.', error: err.message });
      }
      
      // --- Rename SCORM file to use course ID after successful DB insert ---
      const oldScormFilePath = req.files.scormFile[0].path; // Full path of the temporarily saved file
      const scormFileExtension = path.extname(req.files.scormFile[0].originalname);
      const newScormFileName = `${id}${scormFileExtension}`;
      const newScormFilePathInUploads = path.join('scorms', newScormFileName);
      const newFullScormFilePath = path.join(__dirname, 'uploads', newScormFilePathInUploads);
      
      fs.rename(oldScormFilePath, newFullScormFilePath, (renameErr) => {
          if (renameErr) {
              console.error('Error renaming SCORM file:', renameErr);
              // Decide how to handle rename error - possibly clean up DB entry?
              // For now, logging and proceeding, but DB path might be wrong
          } else {
              console.log(`SCORM file renamed from ${path.basename(oldScormFilePath)} to ${newScormFileName}`);
              // Update the database with the new file name
              db.run("UPDATE courses SET scormFile = ? WHERE id = ?", [newScormFilePathInUploads, id], (updateErr) => {
                  if (updateErr) {
                      console.error('Error updating DB with new SCORM file path:', updateErr.message);
                  }
              });
          }
      });

      res.status(201).json({ 
        message: 'Course added successfully', 
        course: { id, name, description, coverImage: coverImagePath, scormFile: newScormFilePathInUploads, uploadDate } // Return the new file path
      });
    });
  });
});

// GET /api/courses - Get all courses
app.get('/api/courses', (req, res) => {
  const sql = "SELECT * FROM courses ORDER BY uploadDate DESC";
  db.all(sql, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching courses.', error: err.message });
    }
    res.json(rows.map(row => ({
        ...row,
        // Construct full URLs for client, ensuring forward slashes
        coverImage: row.coverImage ? `/uploads/${row.coverImage.replace(/\\/g, '/')}` : null,
        scormFile: row.scormFile ? `/uploads/${row.scormFile.replace(/\\/g, '/')}` : null,
    })));
  });
});

// GET /api/courses/:id - Get a single course
app.get('/api/courses/:id', (req, res) => {
  const sql = "SELECT * FROM courses WHERE id = ?";
  db.get(sql, [req.params.id], (err, row) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching course.', error: err.message });
    }
    if (row) {
      res.json({
        ...row,
        // Construct full URLs for client, ensuring forward slashes
        coverImage: row.coverImage ? `/uploads/${row.coverImage.replace(/\\/g, '/')}` : null,
        scormFile: row.scormFile ? `/uploads/${row.scormFile.replace(/\\/g, '/')}` : null,
      });
    } else {
      res.status(404).json({ message: 'Course not found.' });
    }
  });
});

// PUT /api/courses/:id - Update a course
app.put('/api/courses/:id', (req, res) => {
  upload(req, res, function (err) {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ message: 'Multer error uploading file.', error: err.message });
    } else if (err) {
      return res.status(400).json({ message: 'Error uploading file.', error: err.message });
    }

    const { name, description, category } = req.body;
    const courseId = req.params.id;

    // Fetch current course data to get old file paths for deletion if new files are uploaded
    db.get("SELECT coverImage, scormFile FROM courses WHERE id = ?", [courseId], (dbErr, oldCourse) => {
      if (dbErr) {
        return res.status(500).json({ message: 'Error fetching old course data.', error: dbErr.message });
      }
      if (!oldCourse) {
        // Clean up uploaded files if course not found
        if (req.files.coverImage && req.files.coverImage[0]) fs.unlink(req.files.coverImage[0].path, () => {});
        if (req.files.scormFile && req.files.scormFile[0]) fs.unlink(req.files.scormFile[0].path, () => {});
        return res.status(404).json({ message: 'Course not found to update.' });
      }

      let coverImagePath = oldCourse.coverImage; // Keep old path if no new file
      if (req.files.coverImage && req.files.coverImage[0]) {
        coverImagePath = path.join('covers', req.files.coverImage[0].filename);
        // Delete old cover image if a new one is uploaded and old one existed
        if (oldCourse.coverImage) {
          fs.unlink(path.join(__dirname, 'uploads', oldCourse.coverImage), (unlinkErr) => {
            if (unlinkErr) console.error("Error deleting old cover image:", unlinkErr);
          });
        }
      }

      let scormFilePathInDB = oldCourse.scormFile; // Path stored in DB (e.g., scorms/old-name.zip)
      let newScormFilePathInUploads = scormFilePathInDB;
      let oldFullScormFilePath = oldCourse.scormFile ? path.join(__dirname, 'uploads', oldCourse.scormFile) : null;

      if (req.files.scormFile && req.files.scormFile[0]) {
          const oldTempScormFilePath = req.files.scormFile[0].path; // Full path of the newly uploaded temp file
          const scormFileExtension = path.extname(req.files.scormFile[0].originalname);
          const newScormFileName = `${courseId}${scormFileExtension}`;
          newScormFilePathInUploads = path.join('scorms', newScormFileName); // Path to store in DB
          const newFullScormFilePath = path.join(__dirname, 'uploads', newScormFilePathInUploads); // Full target path for rename

          // Delete old SCORM file if a new one is uploaded and old one existed
          if (oldFullScormFilePath && fs.existsSync(oldFullScormFilePath)) {
              fs.unlink(oldFullScormFilePath, (unlinkErr) => {
                  if (unlinkErr) console.error("Error deleting old SCORM file:", unlinkErr);
              });
          }
          
          // Rename the newly uploaded temporary file to use course ID
          fs.rename(oldTempScormFilePath, newFullScormFilePath, (renameErr) => {
              if (renameErr) {
                  console.error('Error renaming uploaded SCORM file during update:', renameErr);
                  // Handle error
              } else {
                   console.log(`Uploaded SCORM file renamed to ${newScormFileName}`);
                   // No need to update DB here, it will be done below with newScormFilePathInUploads
              }
          });

      } else if (oldFullScormFilePath && !fs.existsSync(oldFullScormFilePath)) {
           // Case where scormFile was in DB but file is missing on disk (e.g., manual deletion)
           // Consider logging a warning or removing from DB if file is essential
            console.warn(`SCORM file ${oldCourse.scormFile} not found on disk for course ${courseId}.`);
      }
      
      const sql = `UPDATE courses SET name = ?, description = ?, coverImage = ?, scormFile = ?, category = ? WHERE id = ?`;
      const params = [name, description || '', coverImagePath, newScormFilePathInUploads, category || '', courseId];

      db.run(sql, params, function (dbUpdateErr) {
        if (dbUpdateErr) {
          // Clean up newly uploaded files if DB update fails
          if (req.files.coverImage && req.files.coverImage[0]) fs.unlink(req.files.coverImage[0].path, () => {});
          if (req.files.scormFile && req.files.scormFile[0]) fs.unlink(req.files.scormFile[0].path, () => {});
          return res.status(500).json({ message: 'Error updating course.', error: dbUpdateErr.message });
        }
        if (this.changes === 0) {
          return res.status(404).json({ message: 'Course not found (no changes made).' });
        }
        res.json({ 
            message: 'Course updated successfully', 
            course: { 
                id: courseId, 
                name: params[0], 
                description: params[1], 
                coverImage: coverImagePath ? `/uploads/${coverImagePath}` : null, 
                scormFile: newScormFilePathInUploads ? `/uploads/${newScormFilePathInUploads}` : null, // Return the potentially new file path
                uploadDate: oldCourse.uploadDate, // Assuming uploadDate doesn't change on update
                category: params[5]
            }
        });
      });
    });
  });
});

// DELETE /api/courses/:id - Delete a course
app.delete('/api/courses/:id', (req, res) => {
  const courseId = req.params.id;

  db.get("SELECT coverImage, scormFile FROM courses WHERE id = ?", [courseId], (err, row) => {
    if (err) {
      return res.status(500).json({ message: 'Error fetching course for deletion.', error: err.message });
    }
    if (!row) {
      return res.status(404).json({ message: 'Course not found.' });
    }

    const sql = "DELETE FROM courses WHERE id = ?";
    db.run(sql, [courseId], function (delErr) {
      if (delErr) {
        return res.status(500).json({ message: 'Error deleting course.', error: delErr.message });
      }
      if (this.changes === 0) {
        return res.status(404).json({ message: 'Course not found (no changes made).' });
      }

      // Delete associated files
      if (row.coverImage) {
        fs.unlink(path.join(__dirname, 'uploads', row.coverImage), (unlinkErr) => {
          if (unlinkErr) console.error("Error deleting cover image file:", unlinkErr);
        });
      }
      if (row.scormFile) {
        fs.unlink(path.join(__dirname, 'uploads', row.scormFile), (unlinkErr) => {
          if (unlinkErr) console.error("Error deleting SCORM file:", unlinkErr);
        });
      }
      res.json({ message: 'Course deleted successfully.' });
    });
  });
});

// --- Start Server ---
app.listen(PORT, '0.0.0.0', () => { // Adicionado '0.0.0.0' para escutar em todos os IPs
  console.log(`Server is running on http://localhost:${PORT} and accessible on the network`);
});

// Graceful shutdown
process.on('SIGINT', () => {
  db.close((err) => {
    if (err) {
      return console.error(err.message);
    }
    console.log('Closed the database connection.');
    process.exit(0);
  });
});
