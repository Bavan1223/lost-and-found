// =============================================
// tests/auth.test.js — Authentication Tests
// =============================================
//
// WHY TEST?
// Tests are your safety net. Every time you add
// a feature, you know the old ones still work.
// Companies run tests before EVERY deployment.
//
// SUPERTEST: Simulates real HTTP requests to your Express
// app — no browser needed, no running server needed.
// =============================================

const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../server');

// Test data — use a unique email to avoid conflicts
const testUser = {
  name: 'Test Student',
  email: `test_${Date.now()}@campus.edu`,
  password: 'password123',
  studentId: 'STU001',
};

let authToken = ''; // Will store JWT after login test

// =============================================
// SETUP & TEARDOWN
// =============================================
beforeAll(async () => {
  // Connect to test database before tests run
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(process.env.MONGODB_URI);
  }
});

afterAll(async () => {
  // Clean up test data
  await mongoose.connection.collection('users').deleteMany({
    email: testUser.email
  });
  await mongoose.connection.close();
});

// =============================================
// TEST SUITE: Registration
// =============================================
describe('POST /api/auth/register', () => {
  
  it('should register a new user successfully', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser);

    expect(res.statusCode).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.email).toBe(testUser.email);
    // Password should NEVER be in response
    expect(res.body.user.password).toBeUndefined();
  });

  it('should reject duplicate email registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testUser); // Same email again

    expect(res.statusCode).toBe(400);
    expect(res.body.success).toBe(false);
  });

  it('should reject registration without required fields', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'incomplete@campus.edu' }); // Missing name, password

    expect(res.statusCode).toBe(400);
  });
});

// =============================================
// TEST SUITE: Login
// =============================================
describe('POST /api/auth/login', () => {
  
  it('should login with correct credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: testUser.password,
      });

    expect(res.statusCode).toBe(200);
    expect(res.body.token).toBeDefined();
    
    // Save token for subsequent tests
    authToken = res.body.token;
  });

  it('should reject wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testUser.email,
        password: 'wrongpassword',
      });

    expect(res.statusCode).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it('should reject non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'nobody@campus.edu',
        password: 'anything',
      });

    expect(res.statusCode).toBe(401);
  });
});

// =============================================
// TEST SUITE: Protected Route
// =============================================
describe('GET /api/auth/me', () => {
  
  it('should return user profile with valid token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testUser.email);
  });

  it('should reject request without token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  it('should reject request with fake token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer fake.token.here');

    expect(res.statusCode).toBe(401);
  });
});
