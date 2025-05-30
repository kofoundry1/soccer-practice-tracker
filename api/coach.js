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

  // Preserve the rest of your logic below unchanged:
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

    // Get recent sessions with drill details
    const { data: sessions, error: sessionsError } = await supabase
      .from('practice_sessions')
      .select('*, drills(name, result_label)')
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(5);

    if (sessionsError) {
      console.error('Sessions fetch error:', sessionsError);
    }

    // Calculate player stats
    const totalSessions = player.total_sessions || 0;
    const recentSessionCount = sessions?.length || 0;
    
    // Analyze practice patterns
    let practiceInsights = '';
    if (sessions && sessions.length > 0) {
      const drillCounts = {};
      let totalMinutes = 0;
      let totalResults = 0;
      
      sessions.forEach(session => {
        const drillName = session.drills?.name || 'Unknown Drill';
        drillCounts[drillName] = (drillCounts[drillName] || 0) + 1;
        totalMinutes += session.duration_minutes || 0;
        totalResults += session.result || 0;
      });
      
      const favoriteDrill = Object.entries(drillCounts).sort((a, b) => b[1] - a[1])[0];
      practiceInsights = `Recently practiced ${favoriteDrill[0]} ${favoriteDrill[1]} times. Total ${totalMinutes} minutes in last 5 sessions.`;
    }

    // Build coaching prompt with more context
    const systemPrompt = `You are Coach Sarah, an enthusiastic and encouraging AI soccer coach for kids. You use neuroscience-based coaching principles.

PLAYER PROFILE:
- Name: ${player.display_name}
- Age: ${player.age || 'Unknown'}
- Level: ${player.level}
- Total Practice Sessions: ${totalSessions}
- Tokens Earned: ${player.tokens}
- Favorite Foot: ${player.favorite_foot === 'L' ? 'Left' : 'Right'}
- Team: ${player.team_name || 'No team yet'}
- Favorite Player: ${player.favorite_player || 'Not specified'}

RECENT ACTIVITY:
- ${recentSessionCount} sessions in the last week
- ${practiceInsights}

COACHING STYLE:
- Use lots of emojis and enthusiasm
- Reference neuroscience and brain development when explaining why practice helps
- Give specific, actionable advice
- Celebrate their progress and effort
- Keep responses to 2-3 short paragraphs
- Be positive and motivating
- Suggest specific drills when appropriate`;

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
      return res.status(500).json({ error: 'AI coaching service temporarily unavailable' });
    }

    const data = await openaiResponse.json();
    const coachResponse = data.choices[0].message.content;

    // Log the coaching interaction (optional)
    await supabase
      .from('coaching_logs')
      .insert([{
        player_id: playerId,
        user_message: message,
        coach_response: coachResponse
      }])
      .select();

    res.status(200).json({ response: coachResponse });

  } catch (error) {
    console.error('Coach API error:', error);
    res.status(500).json({ error: 'Internal server error', details: error.message });
  }
}
