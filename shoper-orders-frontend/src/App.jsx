import React, { useEffect, useState } from 'react';
import axios from 'axios';

const App = () => {
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const response = await axios.get('https://twoj-backend-url.com/api/orders');
        setOrders(response.data);
      } catch (error) {
        console.error('Błąd przy pobieraniu zamówień:', error);
      }
    };

    fetchOrders();
  }, []);

  return (
    <div>
      <h2>Lista zamówień</h2>
      <ul>
        {orders.length > 0 ? (
          orders.map((order, index) => (
            <li key={index}>
              <strong>ID:</strong> {order.order_id} - <strong>Status:</strong> {order.status}
            </li>
          ))
        ) : (
          <p>Brak zamówień</p>
        )}
      </ul>
    </div>
  );
};

export default App;
