import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // === CORS HANDLING (Replace this block) ===
  res.setHeader('Access-Control-Allow-Origin', 'https://www.soccergoals365.com');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Credentials', 'true');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  // === END CORS HANDLING ===

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { message, playerId } = req.body;
    if (!message || !playerId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Get player data
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();

    if (playerError) {
      console.error('Player fetch error:', playerError);
      return res.status(404).json({ error: 'Player not found' });
    }

    // Get recent sessions
    const { data: sessions, error: sessionsError } = await supabase
      .from('practice_sessions')
      .select('*, drills(name, result_label)')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (sessionsError) console.error('Sessions fetch error:', sessionsError);

    // Detailed prompt building...
    // Call OpenAI API and log interactions

    // ...rest of your existing logic...

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({ model: 'gpt-4o-mini', messages: [], max_tokens: 300, temperature: 0.8 })
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('OpenAI error:', error);
      return res.status(500).json({ error: 'AI coaching service temporarily unavailable' });
    }

    const data = await openaiResponse.json();
    const coachResponse = data.choices[0].message.content;

    // Optional logging
    await supabase.from('coaching_logs').insert([{ player_id: playerId, user_message: message, coach_response: coachResponse }]);

    res.status(200).json({ response: coachResponse });
  } catch (error) {
    console.error('Coach API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
