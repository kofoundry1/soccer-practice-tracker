const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  // === CORS HANDLING ===
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

    // Build coaching prompt based on player data and recent sessions
    const playerContext = `Player: ${player.name || 'Unknown'}, Level: ${player.level || 'Beginner'}`;
    const sessionContext = sessions && sessions.length > 0 
      ? `Recent practice sessions: ${sessions.map(s => `${s.drills?.name || 'General practice'} - ${s.drills?.result_label || 'Completed'}`).join(', ')}`
      : 'No recent practice sessions';

    const prompt = `You are Coach Sarah, a friendly and encouraging youth soccer coach. 
    
Player context: ${playerContext}
${sessionContext}

Player's message: "${message}"

Respond as Coach Sarah with helpful, age-appropriate advice. Keep it encouraging, specific, and under 200 words.`;

    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are Coach Sarah, a friendly and encouraging youth soccer coach.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.8
      })
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('OpenAI error:', error);
      return res.status(500).json({ error: 'AI coaching service temporarily unavailable' });
    }

    const data = await openaiResponse.json();
    const coachResponse = data.choices[0].message.content;

    // Optional logging
    try {
      await supabase.from('coaching_logs').insert([{ 
        player_id: playerId, 
        user_message: message, 
        coach_response: coachResponse 
      }]);
    } catch (logError) {
      console.error('Logging error:', logError);
      // Don't fail the request if logging fails
    }

    res.status(200).json({ response: coachResponse });
  } catch (error) {
    console.error('Coach API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
};
