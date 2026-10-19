process.env.JWT_SECRET = process.env.JWT_SECRET || "test-secret-orders-console";
process.env.MONGO_URL =
  process.env.MONGO_URL_TEST ||
  "mongodb://127.0.0.1:27017/orders_console_test";
process.env.PORT = process.env.PORT || "4001";
process.env.NODE_ENV = "test";
