module.exports = async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, playerId } = req.body;
    
    if (!message || !playerId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // For now, return a simple response without external API calls
    const response = `Hi! Coach Sarah here. I received your message: "${message}". Great question! Keep practicing and stay positive! ⚽️`;

    res.status(200).json({ response });
    
  } catch (error) {
    console.error('Coach API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};
