const express = require('express');
const connectDb = require('./config/db');
const app = express();
const path = require('path');

//connect db

connectDb();

//init middleware

app.use(express.json({ extended: false }));

//Define routes

app.use('/api/users', require('./route/api/users'));
app.use('/api/posts', require('./route/api/posts'));
app.use('/api/auth', require('./route/api/auth'));
app.use('/api/profile', require('./route/api/profile'));

// Serve static assets in production

if (process.env.NODE_ENV === 'production') {
	//set static folder
	app.use(express.static('client/build'));
	app.get('*', (req, res) => {
		res.sendFile(path.resolve(__dirname, 'client', 'build', 'index.html'));
	});
}

const PORT = process.env.PORT || 5000;

app.listen(PORT, (req, res) => console.log(`Server started on port ${PORT}`));
