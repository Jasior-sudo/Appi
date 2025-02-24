// server.js
const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 5000;

// Ścieżka do pliku z zamówieniami
const ORDERS_FILE = './orders.json';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Endpoint do pobierania zamówień z obsługą paginacji
app.get('/api/orders', (req, res) => {
  let orders = [];
  if (fs.existsSync(ORDERS_FILE)) {
    try {
      // Odczytujemy zawartość pliku
      const fileContent = fs.readFileSync(ORDERS_FILE, 'utf8').trim();

      // Sprawdzamy, czy plik nie jest pusty
      if (fileContent) {
        orders = JSON.parse(fileContent);
      } else {
        console.warn('Plik zamówień jest pusty.');
      }
    } catch (error) {
      console.error('Błąd przy odczytywaniu lub parsowaniu pliku zamówień:', error);
      return res.status(500).json({ error: 'Błąd przy odczytywaniu pliku zamówień.' });
    }
  } else {
    console.warn('Plik zamówień nie istnieje.');
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

// Endpoint do dodawania nowego zamówienia
app.post('/api/orders', (req, res) => {
  const newOrder = req.body;
  let orders = [];

  if (fs.existsSync(ORDERS_FILE)) {
    try {
      const fileContent = fs.readFileSync(ORDERS_FILE, 'utf8').trim();
      if (fileContent) {
        orders = JSON.parse(fileContent);
      }
    } catch (error) {
      console.error('Błąd przy odczytywaniu lub parsowaniu pliku zamówień:', error);
      return res.status(500).json({ error: 'Błąd przy odczytywaniu pliku zamówień.' });
    }
  }

  orders.push(newOrder);

  try {
    fs.writeFileSync(ORDERS_FILE, JSON.stringify(orders, null, 2));
    res.status(201).json(newOrder);
  } catch (error) {
    console.error('Błąd przy zapisywaniu pliku zamówień:', error);
    res.status(500).json({ error: 'Błąd przy zapisywaniu pliku zamówień.' });
  }
});

// Obsługa błędów 404
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint nie został znaleziony.' });
});

// Start serwera
app.listen(PORT, () => {
  console.log(`Serwer uruchomiony na porcie ${PORT}`);
});
