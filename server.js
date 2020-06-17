const express = require('express');
const connectDb = require('./config/db');
const app = express();

//connect db

connectDb();

//init middleware

app.use(express.json({ extended: false }));

app.get('/', (req, res) => res.send('API running'));

//Define routes

app.use('/api/users', require('./route/api/users'));
app.use('/api/posts', require('./route/api/posts'));
app.use('/api/auth', require('./route/api/auth'));
app.use('/api/profile', require('./route/api/profile'));

const PORT = process.env.PORT || 5000;

app.listen(PORT, (req, res) => console.log(`Server started on port ${PORT}`));
