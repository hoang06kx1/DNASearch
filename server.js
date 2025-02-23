const express = require('express');
const XLSX = require('xlsx');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

// Enable CORS for all routes
app.use(cors());

// Serve static files from 'public' directory
app.use(express.static('public'));

// Global Map to store our data
let dnaDatabase = new Map();

// Function to load XLSX file
function loadXLSXFile() {
    try {
        // Read the XLSX file (adjust the path as needed)
        const workbook = XLSX.readFile(path.join(__dirname, 'data', 'dna_database.xlsx'));
        
        // Get the first sheet
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Convert to JSON
        const data = XLSX.utils.sheet_to_json(worksheet);

        // Clear existing map
        dnaDatabase.clear();

        // Process each row
        data.forEach(row => {
            const dnaNode = row.DNANode;
            const category = row.category;

            if (!dnaDatabase.has(category)) {
                dnaDatabase.set(category, []);
            }
            dnaDatabase.get(category).push(dnaNode);
        });

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
    
    if (!query) {
        return res.status(400).json({ 
            error: 'Search query is required' 
        });
    }

    const results = [];
    
    // Search through the Map
    dnaDatabase.forEach((dnaNodes, category) => {
        dnaNodes.forEach(dnaNode => {
            if (dnaNode.toLowerCase().includes(query)) {
                results.push({
                    dnaNode: dnaNode,
                    category: category
                });
            }
        });
    });

    res.json({ results });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});