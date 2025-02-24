const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors');
const app = express();

app.use(bodyParser.json());
app.use(cors());

const ORDERS_FILE = './orders.json';

// Funkcja do zapisywania zamówień
const saveOrders = (orders) => {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
};

// Endpoint do odbierania webhooków
app.post('/api/webhook/orders', (req, res) => {
  const orderData = req.body;
  console.log('Otrzymano nowe zamówienie:', orderData);

  let orders = [];
  if (fs.existsSync(ORDERS_FILE)) {
    orders = JSON.parse(fs.readFileSync(ORDERS_FILE));
  }

  orders.push(orderData);
  saveOrders(orders);

  res.status(200).send('Webhook odebrany');
});

// Endpoint do pobierania zamówień
app.get('/api/orders', (req, res) => {
  let orders = [];
  if (fs.existsSync(ORDERS_FILE)) {
    orders = JSON.parse(fs.readFileSync(ORDERS_FILE));
  }
  res.json(orders);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});
