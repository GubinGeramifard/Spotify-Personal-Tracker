require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const trackRoutes = require('./routes/tracks');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL,
  credentials: true,
}));

app.use(cookieParser(process.env.SESSION_SECRET));
app.use(express.json());

app.use('/auth', authRoutes);
app.use('/api', trackRoutes);

app.get('/health', (req, res) => res.json({ status: 'ok' }));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
