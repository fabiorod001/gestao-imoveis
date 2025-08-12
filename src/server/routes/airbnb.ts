import { Router } from 'express';

const router = Router();

// Placeholder route for Airbnb integration
router.get('/status', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'Airbnb integration endpoint ready',
    timestamp: new Date().toISOString()
  });
});

router.post('/import', (req, res) => {
  res.json({
    success: true,
    message: 'Import endpoint ready',
    data: []
  });
});

export const airbnbRoutes = router;