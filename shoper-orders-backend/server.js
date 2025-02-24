// server.js
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const cors = require('cors');
const app = express();

const ORDERS_FILE = './orders.json';

// Middleware do obsługi CORS
app.use(cors());

// Middleware do parsowania JSON
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Funkcja do zapisywania zamówień
const saveOrders = (orders) => {
  fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
};

// Endpoint do odbierania webhooków z Shoper
app.post('/api/webhook/orders', (req, res) => {
  try {
    // Logowanie nagłówków i treści żądania
    console.log('Nagłówki żądania:', req.headers);
    console.log('Treść żądania:', req.body);

    // Walidacja JSON - czy body nie jest puste
    if (!req.body || Object.keys(req.body).length === 0) {
      console.log('Puste żądanie otrzymane');
      return res.status(400).send('Brak danych w żądaniu');
    }

    const orderData = req.body;

    // Wczytanie istniejących zamówień
    let orders = [];
    if (fs.existsSync(ORDERS_FILE)) {
      const fileData = fs.readFileSync(ORDERS_FILE);
      if (fileData.length > 0) {
        orders = JSON.parse(fileData);
      }
    }

    // Dodanie nowego zamówienia do listy
    orders.push(orderData);
    saveOrders(orders);

    console.log('Otrzymano nowe zamówienie:', orderData);
    res.status(200).send('Webhook odebrany');
  } catch (error) {
    console.error('Błąd parsowania JSON:', error);
    res.status(500).send('Błąd serwera');
  }
});

// Endpoint do pobierania zamówień z obsługą paginacji
app.get('/api/orders', (req, res) => {
  let orders = [];
  if (fs.existsSync(ORDERS_FILE)) {
    orders = JSON.parse(fs.readFileSync(ORDERS_FILE));
  }

  // Obsługa paginacji
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;

  const paginatedOrders = orders.slice(startIndex, endIndex);

  res.json({
    total: orders.length,        // Całkowita liczba zamówień
    orders: paginatedOrders      // Zamówienia na wybranej stronie
  });
});


// Endpoint testowy
app.get('/api/test', (req, res) => {
  res.send('Serwer działa poprawnie!');
});

// Uruchomienie serwera
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Serwer działa na porcie ${PORT}`);
});
