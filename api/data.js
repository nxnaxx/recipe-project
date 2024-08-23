const axios = require('axios');

module.exports = async (req, res) => {
  res.setHeader(
    'Access-Control-Allow-Origin',
    'https://openapi.foodsafetykorea.go.kr',
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

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

    res.status(200).json(data);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
