require('dotenv').config();

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();

const corsOptions = {
  origin: 'https://openapi.foodsafetykorea.go.kr',
  optionsSuccessStatus: 200,
};

app.use(cors(corsOptions));
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'public', 'index.html'), (err) => {
    if (err) {
      console.error('Error sending file:', err);
      res.status(500).send('Internal Server Error');
    }
  });
});

app.get('/details*', function (req, res) {
  res.sendFile(path.join(__dirname, 'public', 'details.html'), (err) => {
    if (err) {
      console.error('Error sending file:', err);
      res.status(500).send('Internal Server Error');
    }
  });
});

app.get('/api/data', async (req, res) => {
  try {
    const { start, end, ...queryParams } = req.query;

    if (!start || !end) {
      return res
        .status(400)
        .json({ error: 'Start and end parameters are required' });
    }

    const queryString = new URLSearchParams(queryParams).toString();
    const formattedQueryString = queryString ? `/${queryString}` : '';
    const url = `https://openapi.foodsafetykorea.go.kr/api/${process.env.API_KEY}/COOKRCP01/json/${start}/${end}${formattedQueryString}`;
    const response = await axios.get(url);
    const data = response.data;

    res.json(data);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});
