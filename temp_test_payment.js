const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
const BASE_URL = 'https://eventmarketersbackend.onrender.com';

(async () => {
  const unique = Date.now();
  const registerPayload = {
    deviceId: `bp_test_device_${unique}`,
    name: `BP Test User ${unique}`,
    email: `bp.test.${unique}@example.com`,
    phone: '+1234567890',
    password: 'Test@12345',
    appVersion: '1.0.0',
    platform: 'android'
  };

  console.log(' Registering temporary mobile user...');
  const registerRes = await fetch(`${BASE_URL}/api/mobile/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(registerPayload)
  });
  const registerData = await registerRes.json();
  console.log(' Register response status:', registerRes.status);
  console.log(' Register response:', JSON.stringify(registerData, null, 2));
  if (!registerRes.ok || !registerData?.data?.token) {
    throw new Error('Failed to register test user');
  }
  const token = registerData.data.token;

  console.log('\n Creating business profile payment order...');
  const createOrderRes = await fetch(`${BASE_URL}/api/mobile/business-profile/create-payment-order`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({})
  });
  const createOrderData = await createOrderRes.json();
  console.log(' Create-order status:', createOrderRes.status);
  console.log(' Create-order response:', JSON.stringify(createOrderData, null, 2));

  console.log('\n Fetching payment status...');
  const statusRes = await fetch(`${BASE_URL}/api/mobile/business-profile/payment-status`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  });
  const statusData = await statusRes.json();
  console.log(' Status response:', JSON.stringify(statusData, null, 2));
})();
