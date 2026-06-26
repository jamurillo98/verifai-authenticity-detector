const { supabase } = require('../supabaseClient');

exports.getHistory = async (req, res) => {
  try {
    const userId = req.user.userId;

    const { data, error } = await supabase
      .from('scans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.json({ history: data });
  } catch (err) {
    return res.status(500).json({ error: 'Server error' });
  }
};
