const express = require('express');
const XLSX = require('xlsx');
const cors = require('cors');
const path = require('path');

const app = express();

// Enable CORS for all routes
app.use(cors());

// Serve static files from 'public' directory
app.use(express.static('public'));

// Global Map to store our data
let dnaDatabase = new Map();

// Add this near the top of your server.js, after creating the app
if (process.env.NODE_ENV === 'production') {
    app.use((req, res, next) => {
        if (req.header('x-forwarded-proto') !== 'https') {
            res.redirect(`https://${req.header('host')}${req.url}`);
        } else {
            next();
        }
    });
}

// Function to load XLSX file
function loadXLSXFile() {
    try {
        // Read the XLSX file (adjust the path as needed)
        const workbook = XLSX.readFile(path.join(__dirname, 'data', 'signature_sequence.xlsx'));

        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const data = XLSX.utils.sheet_to_json(worksheet);

        // Clear existing map
        dnaDatabase.clear();

        // Process each row
        data.forEach(row => {
            const dnaNode = row['Signature sequence'];
            const category = row['Species/groups'];

            if (!dnaDatabase.has(category)) {
                dnaDatabase.set(category, new Set());
            }
            dnaDatabase.get(category).add(dnaNode);
        });

        // Convert Sets to Arrays
        dnaDatabase.forEach((nodeSet, category) => {
            dnaDatabase.set(category, Array.from(nodeSet));
        });
        console.log(dnaDatabase);

        console.log('XLSX file loaded successfully');
    } catch (error) {
        console.error('Error loading XLSX file:', error);
    }
}

// Load the XLSX file when the app starts
loadXLSXFile();

// Search endpoint
app.get('/api/search', (req, res) => {
    const query = req.query.q?.toLowerCase();
    const category = req.query.category;

    if (!query && !category) {
        return res.status(400).json({
            error: 'Search query or category is required'
        });
    }

    const results = [];

    if (category) {
        // If category is provided, return all nodes for that category
        const nodesInCategory = dnaDatabase.get(category) || [];
        nodesInCategory.forEach(dnaNode => {
            results.push({
                dnaNode: dnaNode,
                category: category
            });
        });
    } else {
        // Search through the Map for query matches
        dnaDatabase.forEach((dnaNodes, category) => {
            dnaNodes.forEach(dnaNode => {
                if (query.includes(dnaNode.toLowerCase())) {
                    results.push({
                        dnaNode: dnaNode,
                        category: category
                    });
                }
            });
        });
    }

    res.json({ results });
});

app.get('/api/config', (req, res) => {
    // Force HTTPS in production
    const protocol = process.env.NODE_ENV === 'production' ? 'https' : req.protocol;
    const apiUrl = process.env.API_URL || `${protocol}://${req.get('host')}`;
    console.log(`Server API running at ${apiUrl}`);
    res.json({ apiUrl });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    // Get the base URL from environment variable    
    const apiUrl = process.env.API_URL || `http://localhost:${PORT}`;
    console.log(`Maybe server is running at ${apiUrl}`);
});