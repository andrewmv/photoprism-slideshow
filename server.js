const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const PHOTOPRISM_URL = process.env.PHOTOPRISM_URL || 'http://localhost:2342';
const PHOTOPRISM_TOKEN = process.env.PHOTOPRISM_TOKEN;
const ALBUM_UID = process.env.ALBUM_UID || '';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Helper function to make PhotoPrism API requests
async function photoprismRequest(endpoint, options = {}) {
  const url = `${PHOTOPRISM_URL}${endpoint}`;
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  // Add authentication if token is provided
  if (PHOTOPRISM_TOKEN) {
    headers['Authorization'] = `Bearer ${PHOTOPRISM_TOKEN}`;
    headers['X-Auth-Token'] = PHOTOPRISM_TOKEN;
  }

  try {
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`PhotoPrism API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const previewToken = response.headers.get('X-Preview-Token');
    
    return {
      data,
      previewToken,
      count: parseInt(response.headers.get('X-Count') || '0'),
      limit: parseInt(response.headers.get('X-Limit') || '0'),
      offset: parseInt(response.headers.get('X-Offset') || '0'),
    };
  } catch (error) {
    console.error('PhotoPrism request error:', error);
    throw error;
  }
}

// Get photos endpoint
app.get('/api/photos', async (req, res) => {
  try {
    const {
      count = 1000,
      offset = 0,
      order = 'newest',
      merged = 'true',
      primary = 'true',
      q = '',
      s = ALBUM_UID,
    } = req.query;

    const endpoint = `/api/v1/photos?count=${count}&offset=${offset}&order=${order}&merged=${merged}&primary=${primary}${q ? `&q=${encodeURIComponent(q)}` : ''}${s ? `&s=${encodeURIComponent(s)}` : ''}`;
    const result = await photoprismRequest(endpoint);

    res.json({
      photos: result.data,
      previewToken: result.previewToken,
      count: result.count,
      limit: result.limit,
      offset: result.offset,
    });
  } catch (error) {
    console.error('Error fetching photos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all photos (with pagination)
app.get('/api/photos/all', async (req, res) => {
  try {
    const {
      order = 'newest',
      q = '',
      s = ALBUM_UID,
    } = req.query;

    let allPhotos = [];
    let offset = 0;
    let previewToken = null;
    const limit = 1000;
    let hasMore = true;

    while (hasMore) {
      const endpoint = `/api/v1/photos?count=${limit}&offset=${offset}&order=${order}&merged=true&primary=true${q ? `&q=${encodeURIComponent(q)}` : ''}${s ? `&s=${encodeURIComponent(s)}` : ''}`;
      const result = await photoprismRequest(endpoint);

      allPhotos = allPhotos.concat(result.data);
      previewToken = result.previewToken || previewToken;
      
      hasMore = result.count === result.limit;
      offset += result.count;
    }

    res.json({
      photos: allPhotos,
      previewToken,
      total: allPhotos.length,
    });
  } catch (error) {
    console.error('Error fetching all photos:', error);
    res.status(500).json({ error: error.message });
  }
});

// Proxy thumbnail images
app.get('/api/v1/t/:hash/:token/:size', async (req, res) => {
  try {
    const { hash, token, size } = req.params;
    const url = `${PHOTOPRISM_URL}/api/v1/t/${hash}/${token}/${size}`;
    
    const headers = {};
    if (PHOTOPRISM_TOKEN) {
      headers['Authorization'] = `Bearer ${PHOTOPRISM_TOKEN}`;
      headers['X-Auth-Token'] = PHOTOPRISM_TOKEN;
    }
    
    const response = await fetch(url, { headers });
    
    if (!response.ok) {
      return res.status(response.status).json({ error: 'Failed to fetch image' });
    }
    
    // Forward the image with appropriate headers
    res.setHeader('Content-Type', response.headers.get('Content-Type') || 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=31536000'); // Cache for 1 year
    
    // Stream the image data
    const buffer = await response.buffer();
    res.send(buffer);
  } catch (error) {
    console.error('Error proxying thumbnail:', error);
    res.status(500).json({ error: error.message });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    photoprismUrl: PHOTOPRISM_URL,
    hasToken: !!PHOTOPRISM_TOKEN,
  });
});

app.listen(PORT, () => {
  console.log(`Slideshow server running on http://localhost:${PORT}`);
  console.log(`PhotoPrism URL: ${PHOTOPRISM_URL}`);
  console.log(`Token configured: ${PHOTOPRISM_TOKEN ? 'Yes' : 'No'}`);
});
