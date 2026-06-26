const express = require('express');
const { supabase } = require('../supabaseClient');

const router = express.Router();

/**
 * GET /:id — public, no auth
 * Returns full scan row from Supabase.
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!data) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    return res.json({ scan: data });
  } catch (err) {
    console.error('GET scan/:id:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

/**
 * POST /
 * Before running detection/upload: if a scan with this file_hash exists, return it (cached).
 */
router.post('/', async (req, res) => {
  try {
    const { file_hash: fileHash } = req.body;

    if (!fileHash) {
      return res.status(400).json({ error: 'file_hash is required' });
    }

    const { data: cached, error } = await supabase
      .from('scans')
      .select('*')
      .eq('file_hash', fileHash)
      .maybeSingle();

    if (error) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (cached) {
      return res.json({
        cached: true,
        scan: cached,
      });
    }

    return res.json({
      cached: false,
      message: 'No cached scan — proceed with detection / upload pipeline',
    });
  } catch (err) {
    console.error('POST scan cache lookup:', err);
    return res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
