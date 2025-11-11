const TOKEN = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzZXNzaW9uSWQiOiJxVG1ZQ0U2ODZ4bTRUWjBreDhyb2MiLCJ1c2VySWQiOiJjbWhzenFyYzAwMDAybG9hcjM0MXZuNWhpIiwidGVuYW50SWQiOiJjbWhzenFyYWEwMDAwbG9hcmcwZjNyNG9lIiwiZW1haWwiOiJkdmRtYXJjaGV0dG9AZ21haWwuY29tIiwicm9sZSI6ImFkbWluIiwiaWF0IjoxNzYyODcyMDkwLCJleHAiOjE3NjI5NTg0OTB9.OFuG9OETjkiwTNWndfOcI6S5sHE1x49l4FXng9pFlTU";

// Decode JWT (without verification, just for info)
const payload = JSON.parse(Buffer.from(TOKEN.split('.')[1], 'base64').toString());
console.log('JWT Payload:', JSON.stringify(payload, null, 2));
console.log('\nTenant ID:', payload.tenantId);
console.log('User ID:', payload.userId);
console.log('Email:', payload.email);
