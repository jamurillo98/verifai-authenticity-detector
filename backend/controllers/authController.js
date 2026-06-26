const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');

function getSupabaseClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
  return createClient(url, key);
}

// REGISTER
exports.register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email and password are required.' });
  }

  try {
    const supabase = getSupabaseClient();
    const hashedPassword = await bcrypt.hash(password, 10);

    const { data, error } = await supabase
      .from('profiles')
      .insert({ name, email, password: hashedPassword })
      .select('id, name, email')
      .single();

    if (error) {
      if (error.message.includes('duplicate') || error.message.includes('unique')) {
        return res.status(400).json({ error: 'Email already registered.' });
      }
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json({ message: 'User registered successfully.', user: data });
  } catch (err) {
    return res.status(500).json({ error: 'Server error during registration.' });
  }
};

// LOGIN
exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  try {
    const supabase = getSupabaseClient();

    const { data: user, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', email)
      .single();

    if (error || !user) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      return res.status(400).json({ error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({
      message: 'Login successful.',
      token,
      user: { id: user.id, name: user.name, email: user.email }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error during login.' });
  }
};