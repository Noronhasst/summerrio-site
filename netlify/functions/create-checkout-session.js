/* create-checkout-session.js — Netlify Serverless Function */
const Stripe = require('stripe');

exports.handler = async function (event) {
    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

    try {
        const { items } = JSON.parse(event.body);

        // Validate input
        if (!items || !Array.isArray(items) || items.length === 0) {
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'Cart is empty or invalid.' }),
            };
        }

        // Build Stripe line_items from cart
        const line_items = items.map(item => ({
            price_data: {
                currency: 'aud',
                product_data: {
                    name: item.name,
                    description: item.size ? `Size: ${item.size}` : undefined,
                },
                unit_amount: Math.round(item.price * 100), // Convert dollars to cents
            },
            quantity: item.qty || 1,
        }));

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items,
            shipping_address_collection: {
                allowed_countries: ['AU', 'NZ', 'US', 'GB', 'BR'],
            },
            success_url: 'https://summerrio.com.au/success.html?session_id={CHECKOUT_SESSION_ID}',
            cancel_url: 'https://summerrio.com.au/cancel.html',
        });

        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({ url: session.url }),
        };

    } catch (error) {
        console.error('Stripe error:', error.message);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: error.message || 'Failed to create checkout session.' }),
        };
    }
};
