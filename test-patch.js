const fetch = require('node-fetch');

async function test() {
  const url = 'https://api.lyfflow.com/v1/products/58daef74-4176-4294-bd3f-ad5b6ae082c5/update/4061e356-ea29-4d64-a293-e9878298df43';
  const payload = {
    name: 'test',
    code: 'c1',
    description: 'desc',
    price: '20.0',
    category: 'cat',
    tags: ['tag1'],
    variants: 'var1',
    availability: true
  };
  
  try {
    const res = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Origin': 'https://www.lyfflow.com'
      },
      body: JSON.stringify(payload)
    });
    
    console.log('Status:', res.status);
    console.log('Headers:', res.headers.raw());
    const text = await res.text();
    console.log('Body:', text);
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
