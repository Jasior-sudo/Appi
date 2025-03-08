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

const COMPANY_ID = 1; // Identyfikator firmy w bazie

// ✅ **1. Webhook do odbierania zamówień z Shopera**
app.post('/api/webhook/orders', async (req, res) => {
    try {
        console.log('🔗 Otrzymano webhook zamówienia:', req.body);

        if (!req.body || Object.keys(req.body).length === 0) {
            return res.status(400).send('❌ Brak danych w żądaniu');
        }

        const orderData = req.body;

        // Odpowiadamy od razu (Shoper nie czeka na zapis do bazy)
        res.status(200).send('✅ Webhook odebrany, zapis w toku');

        // ⏳ Opóźniamy zapis zamówienia o 2 minuty
        setTimeout(async () => {
            try {
                console.log(`⏳ Zapis zamówienia ${orderData.order_id}`);

                // ✅ **Zapisujemy zamówienie**
                const isFullyPaid = orderData.paid >= orderData.sum;

                const { error: orderError } = await supabase
                    .from('orders')
                    .upsert([
                        {
                            company_id: COMPANY_ID,
                            order_id: orderData.order_id,
                            user_id: orderData.user_id,
                            date: orderData.date !== "0000-00-00 00:00:00" ? orderData.date : null,
                            status_date: orderData.status_date !== "0000-00-00 00:00:00" ? orderData.status_date : null,
                            confirm_date: orderData.confirm_date !== "0000-00-00 00:00:00" ? orderData.confirm_date : null,
                            delivery_date: orderData.delivery_date !== "0000-00-00 00:00:00" ? orderData.delivery_date : null,
                            status_id: orderData.status_id,
                            app_status_id: isFullyPaid ? 3 : 2, // 3 - Opłacone, 2 - Oczekujące
                            sum: orderData.sum,
                            payment_id: orderData.payment_id,
                            shipping_id: orderData.shipping_id,
                            shipping_cost: orderData.shipping_cost,
                            email: orderData.email,
                            payment_method: orderData.payment?.title,
                            status_name: orderData.status?.name
                        }
                    ]);

                if (orderError) throw orderError;

                // ✅ **Zapisujemy adresy (billing & delivery)**
                for (const type of ["billing", "delivery"]) {
                    const addressData = orderData[`${type}Address`];
                    if (addressData) {
                        const { error: addressError } = await supabase
                            .from('order_addresses')
                            .upsert([
                                {
                                    company_id: COMPANY_ID,
                                    order_id: orderData.order_id,
                                    type: type,
                                    firstname: addressData.firstname,
                                    lastname: addressData.lastname,
                                    city: addressData.city,
                                    postcode: addressData.postcode,
                                    street1: addressData.street1,
                                    phone: addressData.phone
                                }
                            ]);

                        if (addressError) console.error(`❌ Błąd zapisu adresu (${type}):`, addressError);
                    }
                }

                // ✅ **Zapisujemy produkty**
                for (const product of orderData.products) {
                    const { error: productError } = await supabase
                        .from('order_products')
                        .upsert([
                            {
                                company_id: COMPANY_ID,
                                order_id: orderData.order_id,
                                product_id: product.product_id,
                                price: product.price,
                                quantity: product.quantity,
                                name: product.name,
                                tax: product.tax_value,
                                weight: product.weight
                            }
                        ]);

                    if (productError) console.error(`❌ Błąd zapisu produktu ${product.product_id}:`, productError);
                }

                console.log(`✅ Zamówienie ${orderData.order_id} zapisane`);
            } catch (error) {
                console.error("❌ Błąd serwera przy zapisie zamówienia:", error);
            }
        }, 120000); // Opóźnienie o 2 minuty

    } catch (error) {
        console.error("❌ Błąd serwera:", error);
        res.status(500).send('Błąd serwera');
    }
});

// ✅ **2. Webhook do aktualizacji płatności**
app.post('/api/webhook/payments', async (req, res) => {
    try {
        console.log('🔗 Otrzymano webhook płatności:', req.body);

        if (!req.body || !req.body.order_id || !req.body.paid) {
            return res.status(400).send('❌ Brak wymaganych danych');
        }

        const { order_id, paid } = req.body;

        // Pobieramy zamówienie
        const { data: order, error: fetchError } = await supabase
            .from('orders')
            .select('sum')
            .eq('order_id', order_id)
            .single();

        if (fetchError || !order) {
            console.error("❌ Zamówienie nie znalezione:", fetchError);
            return res.status(404).send('❌ Zamówienie nie znalezione');
        }

        const isFullyPaid = paid >= order.sum;

        // Aktualizacja płatności w zamówieniu
        const { error: updateError } = await supabase
            .from('orders')
            .update({
                paid: paid,
                app_status_id: isFullyPaid ? 3 : 2 // 3 - Opłacone, 2 - Oczekujące
            })
            .eq('order_id', order_id);

        if (updateError) throw updateError;

        console.log(`✅ Zamówienie ${order_id} zaktualizowane`);

        res.status(200).send('✅ Płatność zaktualizowana');
    } catch (error) {
        console.error("❌ Błąd serwera przy aktualizacji płatności:", error);
        res.status(500).send('Błąd serwera');
    }
});

// ✅ **3. Automatyczne sprawdzanie płatności co 24h**
const checkPendingPayments = async () => {
    try {
        console.log("🔄 Sprawdzanie oczekujących płatności...");
        
        const { data: pendingOrders, error } = await supabase
            .from('orders')
            .select('order_id, sum, paid')
            .eq('app_status_id', 2);

        if (error) throw error;

        for (const order of pendingOrders) {
            if (order.paid >= order.sum) {
                console.log(`✅ Aktualizacja statusu zamówienia ${order.order_id} na "Opłacone"`);

                await supabase
                    .from('orders')
                    .update({ app_status_id: 3 })
                    .eq('order_id', order.order_id);
            }
        }

        console.log("✅ Sprawdzanie zakończone");
    } catch (error) {
        console.error("❌ Błąd sprawdzania płatności:", error);
    }
};
// ✅ **Uruchamianie sprawdzania płatności na starcie serwera**
checkPendingPayments();

// ✅ **Uruchamianie sprawdzania płatności co 24h**
setInterval(checkPendingPayments, 24 * 60 * 60 * 1000);

// ✅ **Uruchomienie serwera**
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Serwer działa na porcie ${PORT}`);
});
