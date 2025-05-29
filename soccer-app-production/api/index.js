import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

export default async function handler(req, res) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,POST');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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
    const { data: sessions } = await supabase
      .from('practice_sessions')
      .select('*, drills(name, result_label)')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Build coaching prompt
    const systemPrompt = `You are Coach Sarah, a positive AI soccer coach. 

PLAYER: ${player.display_name}, Age: ${player.age || 'Unknown'}, Level: ${player.level}
RECENT SESSIONS: ${sessions?.length || 0} recent sessions

Be extremely encouraging, use emojis, give specific advice, and keep responses to 2-3 paragraphs.`;

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 300,
        temperature: 0.8
      })
    });

    if (!openaiResponse.ok) {
      const error = await openaiResponse.text();
      console.error('OpenAI error:', error);
      return res.status(500).json({ error: 'OpenAI API failed' });
    }

    const data = await openaiResponse.json();
    const coachResponse = data.choices[0].message.content;

    res.status(200).json({ response: coachResponse });

  } catch (error) {
    console.error('Coach API error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
}
