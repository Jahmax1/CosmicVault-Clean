const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../server');
const User = require('../User');

describe('User Routes', () => {
  beforeAll(async () => {
    await mongoose.connect(process.env.MONGO_URI_TEST, { useNewUrlParser: true, useUnifiedTopology: true });
  });

  afterEach(async () => {
    await User.deleteMany({});
  });

  afterAll(async () => {
    await mongoose.connection.close();
  });

  it('should fetch user data with valid token', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'password',
      balance: [{ currency: 'USD', amount: 100 }],
    });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    const res = await request(app)
      .get('/api/data')
      .set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.balance[0].amount).toBe(100);
  });

  it('should deposit money with valid 2FA', async () => {
    const user = await User.create({
      email: 'test@example.com',
      password: 'password',
      balance: [{ currency: 'USD', amount: 100 }],
      twoFactorEnabled: false,
    });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET);
    const res = await request(app)
      .post('/api/deposit')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 50, currency: 'USD' });
    expect(res.status).toBe(200);
    expect(res.body.balance[0].amount).toBe(150);
  });
});