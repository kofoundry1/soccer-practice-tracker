javascriptimport { createClient } from '@supabase/supabase-js';

// Initialize Supabase
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

    // Validate input
    if (!message || !playerId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (message.length > 500) {
      return res.status(400).json({ error: 'Message too long' });
    }

    // Get player data for personalized coaching
    const { data: player, error: playerError } = await supabase
      .from('players')
      .select('*')
      .eq('id', playerId)
      .single();

    if (playerError) {
      console.error('Player fetch error:', playerError);
      return res.status(404).json({ error: 'Player not found' });
    }

    // Get recent sessions for context
    const { data: sessions, error: sessionsError } = await supabase
      .from('practice_sessions')
      .select(`
        *,
        drills(name, result_label)
      `)
      .eq('player_id', playerId)
      .order('created_at', { ascending: false })
      .limit(5);

    // Get peer comparison data for similar age players
    let peerStats = null;
    if (player.age) {
      const { data: peerData } = await supabase
        .from('practice_sessions')
        .select(`
          duration_minutes,
          result,
          players!inner(age)
        `)
        .gte('players.age', player.age - 2)
        .lte('players.age', player.age + 2)
        .limit(100);

      if (peerData && peerData.length > 0) {
        const avgDuration = peerData.reduce((sum, s) => sum + s.duration_minutes, 0) / peerData.length;
        const avgResult = peerData.reduce((sum, s) => sum + (s.result || 0), 0) / peerData.length;
        
        peerStats = {
          avgDuration: Math.round(avgDuration),
          avgResult: Math.round(avgResult),
          sampleSize: peerData.length
        };
      }
    }

    // Build personalized coaching prompt
    const systemPrompt = buildCoachPrompt(player, sessions || [], peerStats);

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini', // More cost-effective than gpt-4
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        max_tokens: 400,
        temperature: 0.8
      })
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const data = await openaiResponse.json();
    const coachResponse = data.choices[0].message.content;

    // Log the interaction for analytics (optional)
    try {
      await supabase
        .from('coach_interactions')
        .insert([{
          player_id: playerId,
          user_message: message.substring(0, 200), // Truncate for storage
          coach_response_length: coachResponse.length,
          created_at: new Date().toISOString()
        }]);
    } catch (logError) {
      console.log('Logging error (non-critical):', logError);
    }

    res.status(200).json({ response: coachResponse });

  } catch (error) {
    console.error('Coach API error:', error);
    res.status(500).json({ 
      error: 'Failed to get coach response',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
}

function buildCoachPrompt(player, sessions, peerStats) {
  const recentSessionsText = sessions.length > 0 
    ? sessions.map(s => {
        const drillName = s.drills?.name || s.drill_id;
        const date = new Date(s.created_at).toLocaleDateString();
        return `- ${date}: ${drillName} for ${s.duration_minutes}min, result: ${s.result} ${s.drills?.result_label || 'points'}`;
      }).join('\n')
    : 'No recent practice sessions recorded';

  const peerComparison = peerStats 
    ? `\n\nPEER COMPARISON (ages ${player.age - 2}-${player.age + 2}):\n- Average session duration: ${peerStats.avgDuration} minutes\n- Average performance: ${peerStats.avgResult} points\n- Based on ${peerStats.sampleSize} recent sessions`
    : '';

  return `You are Coach Sarah, an enthusiastic and positive AI soccer coach who specializes in youth development using neuroscience principles. Your coaching philosophy is based on:

1. NEUROPLASTICITY: The brain's ability to form new connections through practice
2. POSITIVE REINFORCEMENT: Celebrating progress to build confidence  
3. GROWTH MINDSET: Emphasizing effort and improvement over natural talent
4. DELIBERATE PRACTICE: Focused, goal-oriented training

PLAYER PROFILE:
- Name: ${player.display_name}
- Age: ${player.age || 'Not specified'}
- Level: ${player.level}
- Favorite Player: ${player.favorite_player || 'Not specified'}
- Favorite Foot: ${player.favorite_foot === 'L' ? 'Left' : 'Right'}
- Team: ${player.team_name || 'Not specified'}
- Total Sessions Completed: ${player.total_sessions}
- Tokens Earned: ${player.tokens}

RECENT PRACTICE HISTORY:
${recentSessionsText}${peerComparison}

COACHING GUIDELINES:
- Be extremely encouraging and positive (use emojis!)
- Give specific, actionable advice based on their profile and history
- Use neuroscience principles to explain why practice works
- Keep responses to 2-3 paragraphs maximum
- Always end with motivation and belief in their potential
- Reference their specific data when relevant (age, favorite player, recent performance)
- If they seem discouraged, focus on growth mindset and neuroplasticity

Remember: Every response should make them feel excited to practice more!`;
}