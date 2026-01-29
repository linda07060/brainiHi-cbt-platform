import axios from 'axios';
import * as qs from 'querystring';

const MODE = process.env.PAYPAL_MODE === 'live' ? 'live' : 'sandbox';
const BASE = MODE === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';

async function getAccessToken(): Promise<string> {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
  if (!clientId || !clientSecret) throw new Error('PayPal credentials missing');
  const tokenUrl = `${BASE}/v1/oauth2/token`;
  const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const body = qs.stringify({ grant_type: 'client_credentials' });
  const res = await axios.post(tokenUrl, body, {
    headers: { Authorization: `Basic ${basic}`, 'Content-Type': 'application/x-www-form-urlencoded' },
  });
  return res.data.access_token as string;
}

export async function createOrderOnPayPal(
  purchaseUnits: any[],
  intent: 'CAPTURE' | 'AUTHORIZE' = 'CAPTURE',
) {
  const token = await getAccessToken();
  const url = `${BASE}/v2/checkout/orders`;
  const res = await axios.post(
    url,
    { intent, purchase_units: purchaseUnits },
    { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } },
  );
  return res.data;
}

export async function captureOrderOnPayPal(orderID: string) {
  const token = await getAccessToken();
  const url = `${BASE}/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`;
  const res = await axios.post(url, {}, { headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });
  return res.data;
}

export async function getOrderOnPayPal(orderID: string) {
  const token = await getAccessToken();
  const url = `${BASE}/v2/checkout/orders/${encodeURIComponent(orderID)}`;
  const res = await axios.get(url, { headers: { Authorization: `Bearer ${token}` } });
  return res.data;
}