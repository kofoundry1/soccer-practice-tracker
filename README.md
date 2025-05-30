# Soccer Practice Tracker 🏆⚽

A fun, engaging web app designed to encourage kids to practice soccer daily through gamification, rewards, and AI coaching!

## Features

- **Practice Tracking**: Log various soccer drills with timers and result tracking
- **Reward System**: Earn tokens and open mystery packs to collect players, badges, and items
- **Progress Monitoring**: Track sessions, view statistics, and monitor improvement over time
- **Leaderboards**: Compete with other players daily, weekly, monthly, or all-time
- **AI Coach Sarah**: Get personalized coaching advice powered by OpenAI
- **User Profiles**: Customize avatars, track favorite drills, and personal stats

## Tech Stack

- **Frontend**: HTML5, CSS3, JavaScript (Vanilla)
- **Hosting**: Hostinger (static site hosting)
- **Database**: Supabase (PostgreSQL)
- **Backend**: Vercel Functions (Node.js)
- **AI**: OpenAI GPT-4

## Project Structure

```
soccer-practice-tracker/
├── index.html          # Main application (hosted on Hostinger)
├── api/
│   └── coach.js       # AI coaching endpoint (deployed to Vercel)
├── package.json       # Backend dependencies
├── vercel.json        # Vercel configuration
└── README.md          # This file
```

## Setup Instructions

### 1. Supabase Setup

Create the following tables in your Supabase project:

```sql
-- Players table
CREATE TABLE players (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  email_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(50) NOT NULL,
  tokens INTEGER DEFAULT 50,
  total_sessions INTEGER DEFAULT 0,
  level INTEGER DEFAULT 1,
  avatar VARCHAR(10) DEFAULT '⚽',
  team_name VARCHAR(50),
  favorite_foot CHAR(1) DEFAULT 'R',
  favorite_player VARCHAR(50),
  state VARCHAR(50),
  age INTEGER,
  created_at TIMESTAMP DEFAULT NOW(),
  last_login TIMESTAMP
);

-- Drills table
CREATE TABLE drills (
  id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  instructions TEXT NOT NULL,
  result_label VARCHAR(50) NOT NULL
);

-- Practice sessions table
CREATE TABLE practice_sessions (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id),
  drill_id VARCHAR(50) REFERENCES drills(id),
  side VARCHAR(10),
  duration_minutes INTEGER,
  result INTEGER,
  tokens_earned INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Player collection table
CREATE TABLE player_collection (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id),
  item_type VARCHAR(50),
  item_name VARCHAR(100),
  item_emoji VARCHAR(10),
  rarity VARCHAR(20),
  obtained_at TIMESTAMP DEFAULT NOW()
);

-- Coaching logs table (optional)
CREATE TABLE coaching_logs (
  id SERIAL PRIMARY KEY,
  player_id INTEGER REFERENCES players(id),
  user_message TEXT,
  coach_response TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);
```

### 2. Environment Variables (Vercel)

Set these environment variables in your Vercel project:

```
SUPABASE_URL=your_supabase_project_url
SUPABASE_SERVICE_KEY=your_supabase_service_key
OPENAI_API_KEY=your_openai_api_key
```

### 3. Deployment

#### Frontend (Hostinger):
1. Upload `index.html` to your Hostinger hosting
2. Update the `BACKEND_URL` in index.html to your Vercel deployment URL

#### Backend (Vercel):
1. Install Vercel CLI: `npm i -g vercel`
2. Run `vercel` in the project directory
3. Follow the prompts to deploy

## Drill Ideas

The app includes 10 default drills:
- Juggling
- Wall Passes
- Cone Weaving
- Target Shooting
- Step Overs
- Quick Touches
- First Touch Control
- Turning Practice
- Weak Foot Training
- Agility Footwork

## Future Enhancements

- [ ] Mobile app version
- [ ] Video tutorials for drills
- [ ] Team/club features
- [ ] Parent dashboard
- [ ] Achievement badges
- [ ] Social sharing
- [ ] Offline mode
- [ ] Multi-language support

## Contributing

This is a private project, but if you have suggestions or find bugs, please create an issue.

## License

All rights reserved. This project is not open source.

---

Built with ❤️ to help kids love soccer!
