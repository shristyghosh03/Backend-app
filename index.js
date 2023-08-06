const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const sql = require('mssql');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = 3000;
const config = {
  server: 'DESKTOP-HO0S505',
  options: {
    trustedConnection: true, // Windows Authentication
    enableArithAbort: true,
  },
  database: 'Backend_app',
};

const JWT_SECRET = 'your-secret-key';

// Middleware
app.use(bodyParser.json());

// Database setup
let pool;

(async function () {
  try {
    pool = await sql.connect(config);
    console.log('Connected to the SQL Server database.');
  } catch (error) {
    console.error('Error connecting to the database:', error);
  }
})();

// Routes
app.post('/register', async (req, res) => {
  const { username, email, password } = req.body;

  // Basic validation
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const id = uuidv4();
  const query = `
    INSERT INTO Users (Id, Username, Email, Password)
    VALUES (@Id, @Username, @Email, @Password)
  `;
  const params = { Id: id, Username: username, Email: email, Password: password };

  try {
    await pool.request().input('Id', sql.UniqueIdentifier, id).input('Username', sql.VarChar, username).input('Email', sql.VarChar, email).input('Password', sql.VarChar, password).query(query);
    res.status(201).json({ id, username, email });
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ message: 'Error creating user.' });
  }
});

app.post('/token', (req, res) => {
  // In a real-world application, you should validate the user's credentials and then issue a token.
  // For this example, we'll simply return a dummy token.

  const token = jwt.sign({ user: 'dummy-user' }, JWT_SECRET, { expiresIn: '1h' });
  res.status(200).json({ token });
});

// Authentication middleware
function authenticateToken(req, res, next) {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ message: 'Authentication token not found.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: 'Invalid or expired token.' });
    }
    req.user = user;
    next();
  });
}

app.get('/users', authenticateToken, async (req, res) => {
  const query = 'SELECT Id, Username, Email FROM Users';
  try {
    const result = await pool.request().query(query);
    res.status(200).json(result.recordset);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ message: 'Error fetching users.' });
  }
});

app.get('/users/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const query = 'SELECT Id, Username, Email FROM Users WHERE Id = @Id';
  const params = { Id: id };
  try {
    const result = await pool.request().input('Id', sql.UniqueIdentifier, id).query(query);
    if (result.recordset.length > 0) {
      res.status(200).json(result.recordset[0]);
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ message: 'Error fetching user.' });
  }
});

app.put('/users/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { username, email, password } = req.body;

  // Basic validation
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required.' });
  }

  const query = 'UPDATE Users SET Username = @Username, Email = @Email, Password = @Password WHERE Id = @Id';
  const params = { Id: id, Username: username, Email: email, Password: password };

  try {
    const result = await pool.request().input('Id', sql.UniqueIdentifier, id).input('Username', sql.VarChar, username).input('Email', sql.VarChar, email).input('Password', sql.VarChar, password).query(query);
    if (result.rowsAffected[0] > 0) {
      res.status(200).json({ id, username, email });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ message: 'Error updating user.' });
  }
});

app.delete('/users/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const query = 'DELETE FROM Users WHERE Id = @Id';
  const params = { Id: id };
  try {
    const result = await pool.request().input('Id', sql.UniqueIdentifier, id).query(query);
    if (result.rowsAffected[0] > 0) {
      res.status(200).json({ message: 'User deleted successfully.' });
    } else {
      res.status(404).json({ message: 'User not found' });
    }
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ message: 'Error deleting user.' });
  }
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server started on port ${PORT}`);
});
