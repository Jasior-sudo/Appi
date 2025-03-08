
const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const app = express();

// Konfiguracja Supabase
const supabase = createClient(
    "https://nymqqcobbzmnngkgxczc.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im55bXFxY29iYnptbm5na2d4Y3pjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDA5Mjg2ODMsImV4cCI6MjA1NjUwNDY4M30.B6Qtv54EtqKae3SlZIgNwZM_EbQDxnjVYkXfaIoNq14",
);

// Middleware do obsługi CORS i parsowania JSON
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Endpoint do odbierania webhooków z Shoper
app.post('/api/webhook/orders', async (req, res) => {
    try {
        console.log('🔗 Otrzymano webhook:', req.body);

        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).send('❌ Brak danych w żądaniu');
        }

        const orderData = req.body;
        const companyId = 1; // Zapisujemy tylko dla tej firmy

        // Odpowiadamy od razu (Shoper nie czeka na zapis do bazy)
        res.status(200).send('✅ Webhook odebrany, zapis w toku');

        // 🔥 Opóźniamy całą operację o 2 minuty
        setTimeout(async () => {
            try {
                console.log(`⏳ Opóźniony zapis zamówienia ${orderData.order_id}`);

               // Sprawdzenie, czy zamówienie jest opłacone
const isPaid = parseFloat(orderData.paid) > 0;
const newStatus = isPaid ? 10 : 11; // 10 jeśli opłacone, 11 jeśli nieopłacone

// 🔥 Aktualizujemy zamówienie w Supabase
const { error: orderError } = await supabase
    .from('orders')
    .upsert([
        {
            company_id: companyId,
            order_id: orderData.order_id,
            user_id: orderData.user_id,
            date: orderData.date !== "0000-00-00 00:00:00" ? orderData.date : null,
            status_date: orderData.status_date !== "0000-00-00 00:00:00" ? orderData.status_date : null,
            confirm_date: orderData.confirm_date !== "0000-00-00 00:00:00" ? orderData.confirm_date : null,
            delivery_date: orderData.delivery_date !== "0000-00-00 00:00:00" ? orderData.delivery_date : null,
            status_id: orderData.status_id,  // ORYGINALNY status
            app_status_id: newStatus, // 🔥 Nowy status w zależności od płatności
            sum: orderData.sum,
            payment_id: orderData.payment_id,
            user_order: orderData.user_order,
            shipping_id: orderData.shipping_id,
            shipping_cost: orderData.shipping_cost,
            email: orderData.email,
            delivery_code: orderData.delivery_code,
            code: orderData.code,
            confirm: orderData.confirm === "1",
            notes: orderData.notes,
            currency_id: orderData.currency_id,
            currency_rate: orderData.currency_rate,
            paid: orderData.paid,  // 🔄 Aktualizacja wartości "paid"
            ip_address: orderData.ip_address,
            discount_client: orderData.discount_client,
            discount_group: orderData.discount_group,
            discount_levels: orderData.discount_levels,
            discount_code: orderData.discount_code,
            shipping_vat: orderData.shipping_vat,
            shipping_vat_value: orderData.shipping_vat_value,
            shipping_vat_name: orderData.shipping_vat_name,
            lang_id: orderData.lang_id,
            origin: orderData.origin,
            parent_order_id: orderData.parent_order_id,
            registered: orderData.registered === "1",
            currency_name: orderData.currency_name,
            shipping_method: orderData.shipping?.name,
            shipping_pickup_point: orderData.shipping?.pickup_point,
            payment_method: orderData.payment?.title,
            status_name: orderData.status?.name
        }
    ]);

if (orderError) console.error(`❌ Błąd zapisu zamówienia ${orderData.order_id}:`, orderError);
else console.log(`✅ Zamówienie ${orderData.order_id} zaktualizowane: status ${newStatus}, paid: ${orderData.paid}`);


                // 2️⃣ **Zapisujemy adresy (billing & delivery)**
                for (const type of ["billing", "delivery"]) {
                    const addressData = orderData[`${type}Address`];
                    if (addressData) {
                        const { error: addressError } = await supabase
                            .from('order_addresses')
                            .upsert([
                                {
                                    company_id: companyId,
                                    order_id: orderData.order_id,
                                    type: type,
                                    firstname: addressData.firstname,
                                    lastname: addressData.lastname,
                                    company: addressData.company,
                                    tax_id: addressData.tax_id,
                                    pesel: addressData.pesel,
                                    city: addressData.city,
                                    postcode: addressData.postcode,
                                    street1: addressData.street1,
                                    street2: addressData.street2,
                                    state: addressData.state,
                                    country: addressData.country,
                                    phone: addressData.phone,
                                    country_code: addressData.country_code
                                }
                            ]);

                        if (addressError) console.error(`❌ Błąd zapisu adresu (${type}):`, addressError);
                    }
                }

                // 3️⃣ **Zapisujemy produkty**
                for (const product of orderData.products) {
                    const { error: productError } = await supabase
                        .from('order_products')
                        .upsert([
                            {
                                company_id: companyId,
                                order_id: orderData.order_id,
                                product_id: product.product_id,
                                stock_id: product.stock_id,
                                price: product.price,
                                discount_perc: product.discount_perc,
                                quantity: product.quantity,
                                delivery_time: product.delivery_time,
                                name: product.name,
                                code: product.code,
                                tax: product.tax_value,
                                tax_value: product.tax_value,
                                unit: product.unit,
                                weight: product.weight
                            }
                        ]);

                    if (productError) console.error(`❌ Błąd zapisu produktu ${product.product_id}:`, productError);
                }

                console.log(`✅ Zamówienie ${orderData.order_id} zapisane po opóźnieniu`);
            } catch (error) {
                console.error("❌ Błąd serwera przy opóźnionym zapisie:", error);
            }
        }, 120000); // ⏳ Opóźnienie o 2 minuty

    } catch (error) {
        console.error("❌ Błąd serwera:", error);
        res.status(500).send('Błąd serwera');
    }
});

// 🔄 Funkcja sprawdzająca płatności co 4 dni
const checkPendingPayments = async () => {
  try {
      console.log("🔍 Sprawdzanie nieopłaconych zamówień...");

      // Pobieramy zamówienia ze statusem 11 (oczekujące na płatność)
      const { data: orders, error } = await supabase
          .from('orders')
          .select('order_id, paid, app_status_id, date')
          .eq('app_status_id', 11);

      if (error) throw error;
      if (!orders || orders.length === 0) {
          console.log("✅ Brak zamówień do aktualizacji.");
          return;
      }

      const updates = [];

      for (const order of orders) {
          const isPaid = parseFloat(order.paid) > 0;
          const orderDate = new Date(order.date);
          const now = new Date();
          const diffDays = Math.floor((now - orderDate) / (1000 * 60 * 60 * 24)); // różnica w dniach

          if (isPaid) {
              console.log(`💰 Zamówienie ${order.order_id} opłacone! Aktualizacja do statusu 10.`);
              updates.push({ order_id: order.order_id, app_status_id: 10 });
          } else if (diffDays >= 4) {
              console.log(`⏳ Zamówienie ${order.order_id} nadal nieopłacone po 4 dniach. Możesz anulować.`);
              updates.push({ order_id: order.order_id, app_status_id: 12 }); // Możesz ustawić 12 na "Anulowane"
          }
      }

      if (updates.length > 0) {
          const { error: updateError } = await supabase
              .from('orders')
              .upsert(updates);

          if (updateError) throw updateError;
          console.log("✅ Zamówienia zostały zaktualizowane.");
      }
  } catch (error) {
      console.error("❌ Błąd podczas aktualizacji zamówień:", error);
  }
};

// 🔄 Jednorazowe sprawdzenie płatności przy starcie serwera
checkPendingPayments();

// 🔄 Uruchamiamy sprawdzanie co 24 godziny (raz dziennie)
setInterval(checkPendingPayments, 15 * 60 * 1000); // Co 15 minut

// Uruchomienie serwera
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 Serwer działa na porcie ${PORT}`);
});
