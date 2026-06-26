const { supabase } = require('../supabaseClient');

exports.getScanById = async (req, res) => {
  try {
    const userId = req.user.userId;
    const { id } = req.params;

    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .single();

    if (error) {
      return res.status(404).json({ error: 'Scan not found' });
    }

    return res.json({ scan: data });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};
