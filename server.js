const express = require('express');
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/create-checkout-session', async (req, res) => {
  const { price } = req.body;

  const session = await stripe.checkout.sessions.create({
    payment_method_types: ['card'],
    line_items: [
      {
        price_data: {
          currency: 'aud',
          product_data: {
            name: 'SummerRio Bikini',
          },
          unit_amount: price,
        },
        quantity: 1,
      },
    ],
    mode: 'payment',
    success_url: 'https://summerrio.com.au/success.html',
    cancel_url: 'https://summerrio.com.au/cancel.html',
  });

  res.json({ id: session.id });
});

app.listen(4242, () => console.log('Running on port 4242'));
