const { MongoClient } = require('mongodb');
const uri = "mongodb://localhost:27017";  // MongoDB default URL
const client = new MongoClient(uri);
const dbName = 'recipeApp';  // MongoDB database name
let db;

// Express and other dependencies
const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

dotenv.config();

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads'))); // Serve images from 'uploads' folder

// Multer setup for file upload
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath); // Ensure the 'uploads' folder exists
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname), // Unique file names
});
const upload = multer({ storage });

// MongoDB connection
async function connectDB() {
  await client.connect();
  db = client.db(dbName);
  console.log("✅ Connected to MongoDB");
}

// Load recipes from MongoDB
async function getRecipes() {
  const recipesCollection = db.collection('recipes');
  return await recipesCollection.find().toArray();
}

// Add a new recipe to MongoDB
async function addRecipe(recipeData) {
  const recipesCollection = db.collection('recipes');
  const result = await recipesCollection.insertOne(recipeData);
  return result.ops[0];
}

// Delete a recipe from MongoDB
async function deleteRecipeById(id) {
  const recipesCollection = db.collection('recipes');
  const result = await recipesCollection.deleteOne({ id: id });
  return result.deletedCount > 0;
}

// API Endpoints

// Get all recipes
app.get('/recipes', async (req, res) => {
  try {
    const recipes = await getRecipes();
    res.json(recipes);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch recipes' });
  }
});

// Add a recipe
app.post('/recipes', upload.single('image'), async (req, res) => {
  try {
    const newRecipe = {
      id: Date.now(),
      name: req.body.name || 'Unnamed Recipe',
      ingredients: JSON.parse(req.body.ingredients || '[]'),
      procedure: req.body.procedure || '',
      notes: req.body.notes || '',
      image: req.file ? `/uploads/${req.file.filename}` : '', // Save the image URL
    };

    const addedRecipe = await addRecipe(newRecipe);
    res.json(addedRecipe);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to add recipe' });
  }
});

// Delete a recipe
app.delete('/recipes/:id', async (req, res) => {
  const id = parseInt(req.params.id);
  try {
    const deleted = await deleteRecipeById(id);
    
    if (deleted) {
      res.json({ message: 'Recipe deleted' });
    } else {
      res.status(404).json({ error: 'Recipe not found' });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to delete recipe' });
  }
});

app.listen(PORT, async () => {
  await connectDB();
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
