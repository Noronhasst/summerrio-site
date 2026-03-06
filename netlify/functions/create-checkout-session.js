/* create-checkout-session.js — Netlify Serverless Function */
const Stripe = require('stripe');

const ALLOWED_ORIGINS = [
    'https://www.summerrio.com.au',
    'https://summerrio.com.au',
];

exports.handler = async function (event) {
    const origin = event.headers?.origin || '';
    const corsHeaders = {
        'Access-Control-Allow-Origin': ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0],
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Content-Type': 'application/json',
    };

    // Handle CORS preflight
    if (event.httpMethod === 'OPTIONS') {
        return { statusCode: 204, headers: corsHeaders, body: '' };
    }

    // Only allow POST
    if (event.httpMethod !== 'POST') {
        return {
            statusCode: 405,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }

    // Check env var up front so we get a clear error
    if (!process.env.STRIPE_SECRET_KEY) {
        console.error('STRIPE_SECRET_KEY is not set');
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: 'Payment system is not configured. Please contact support.' }),
        };
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-11-20.acacia' });

    try {
        const { items } = JSON.parse(event.body);

        // Validate input
        if (!items || !Array.isArray(items) || items.length === 0) {
            return {
                statusCode: 400,
                headers: corsHeaders,
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

        // Determine the base URL for success/cancel redirects
        const baseUrl = ALLOWED_ORIGINS.includes(origin) ? origin : 'https://www.summerrio.com.au';

        // Create Stripe Checkout Session
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            mode: 'payment',
            line_items,
            shipping_address_collection: {
                allowed_countries: ['AU', 'NZ', 'US', 'GB', 'BR'],
            },
            success_url: `${baseUrl}/success.html?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${baseUrl}/cancel.html`,
        });

        return {
            statusCode: 200,
            headers: corsHeaders,
            body: JSON.stringify({ url: session.url }),
        };

    } catch (error) {
        console.error('Stripe error:', error.message);
        return {
            statusCode: 500,
            headers: corsHeaders,
            body: JSON.stringify({ error: error.message || 'Failed to create checkout session.' }),
        };
    }
};
