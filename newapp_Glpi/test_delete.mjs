import axios from 'axios';
import fs from 'fs';

async function testDelete() {
  try {
    const api = axios.create({
      baseURL: 'http://glpi.local/api.php'
    });

    const { data: tokenData } = await api.post('/token', {
      grant_type: 'password',
      client_id: '7445b9c6a67ef2f343d71030d29a7bb8c73d8c6dd19bcef1e9357e72b2a02b19', // from .env
      client_secret: '846ff1365c9f5183d805f5b4830bd6a674fa2cd949c677de4fa7b838714d56e0',
      scope: 'api',
      username: 'glpi',
      password: 'glpi'
    });

    const token = tokenData.access_token;
    console.log("Got token:", token.substring(0, 10) + '...');

    const headers = { Authorization: `Bearer ${token}` };

    console.log("Creating ticket...");
    const { data: createRes } = await api.post('/v2.3/Assistance/Ticket', { name: "Test Rollback ID", content: "..." }, { headers });
    console.log("Create Response:", JSON.stringify(createRes));
    console.log("Delete status:", delResponse.status);
    console.log("Delete data:", delResponse.data);

    console.log("Fetching tickets again...");
    const { data: ticketsAfter } = await api.get('/v2.3/Assistance/Ticket', { headers });
    console.log("Tickets after delete:", ticketsAfter.length);
    
  } catch (err) {
    console.error("Error:", err.response ? err.response.data : err.message);
  }
}

testDelete();
