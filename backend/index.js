const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });

const express = require("express");
const mysql = require("mysql2/promise");
const bodyParser = require("body-parser");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { formatOrderNotification, sendActivityNotification } = require("./notifications");

const PORT = process.env.PORT || 3001;
let mysqlPool = process.env.MYSQL_URL ? mysql.createPool(process.env.MYSQL_URL) : null;
let mysqlReady = false;

const demoHoldings = [
  { name: "BHARTIARTL", qty: 2, avg: 538.05, price: 541.15, net: "+0.58%", day: "+2.99%" },
  { name: "HDFCBANK", qty: 2, avg: 1383.4, price: 1522.35, net: "+10.04%", day: "+0.11%" },
  { name: "HINDUNILVR", qty: 1, avg: 2335.85, price: 2417.4, net: "+3.49%", day: "+0.21%" },
  { name: "INFY", qty: 1, avg: 1350.5, price: 1555.45, net: "+15.18%", day: "-1.60%", isLoss: true },
  { name: "ITC", qty: 5, avg: 202.0, price: 207.9, net: "+2.92%", day: "+0.80%" },
  { name: "KPITTECH", qty: 5, avg: 250.3, price: 266.45, net: "+6.45%", day: "+3.54%" },
  { name: "M&M", qty: 2, avg: 809.9, price: 779.8, net: "-3.72%", day: "-0.01%", isLoss: true },
  { name: "RELIANCE", qty: 1, avg: 2193.7, price: 2112.4, net: "-3.71%", day: "+1.44%" },
  { name: "SBIN", qty: 4, avg: 324.35, price: 430.2, net: "+32.63%", day: "-0.34%", isLoss: true },
  { name: "SGBMAY29", qty: 2, avg: 4727.0, price: 4719.0, net: "-0.17%", day: "+0.15%" },
  { name: "TATAPOWER", qty: 5, avg: 104.2, price: 124.15, net: "+19.15%", day: "-0.24%", isLoss: true },
  { name: "TCS", qty: 1, avg: 3041.7, price: 3194.8, net: "+5.03%", day: "-0.25%", isLoss: true },
  { name: "WIPRO", qty: 4, avg: 489.3, price: 577.75, net: "+18.08%", day: "+0.32%" },
];

const demoPositions = [
  { product: "CNC", name: "EVEREADY", qty: 2, avg: 316.27, price: 312.35, net: "+0.58%", day: "-1.24%", isLoss: true },
  { product: "CNC", name: "JUBLFOOD", qty: 1, avg: 3124.75, price: 3082.65, net: "+10.04%", day: "-1.35%", isLoss: true },
];

const app = express();
const allowedOrigins = new Set(
  (process.env.CORS_ORIGINS ||
    "http://localhost:3002,http://localhost:3003,http://localhost:3004,http://127.0.0.1:3002,http://127.0.0.1:3003,http://127.0.0.1:3004")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
);

const setAuthCookie = (res, token) => {
  res.cookie("zerodha_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000,
    path: "/",
  });
};

const sanitizeUser = (user) => ({
  _id: user._id ?? user.id,
  name: user.name,
  email: user.email,
  phone: user.phone,
  createdAt: user.createdAt || user.created_at || new Date().toISOString(),
});

const formatMysqlDateTime = (date) =>
  date.toISOString().slice(0, 23).replace("T", " ");

const createToken = (user) => {
  const secret = process.env.JWT_SECRET || "zerodha-demo-secret";
  return jwt.sign({ id: user._id ?? user.id ?? user.email }, secret, { expiresIn: "7d" });
};

const getAuthenticatedUser = async (req) => {
  const authHeader = req.headers.authorization || "";
  const cookieToken = (req.headers.cookie || "")
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("zerodha_token="))
    ?.slice("zerodha_token=".length);
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : cookieToken;

  if (!token) {
    return null;
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET || "zerodha-demo-secret");
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return null;
    }
    throw error;
  }

  const [users] = await mysqlPool.execute(
    "SELECT id, name, email, phone FROM users WHERE id = ? LIMIT 1",
    [decoded.id]
  );
  return users[0] || null;
};

const authenticationDatabaseUnavailable = (res) =>
  res.status(503).json({ error: "MySQL is not configured or unavailable. Set MYSQL_URL in backend/.env and restart the API." });

const unavailableNotification = (message) => ({
  sms: { status: "skipped", message },
});

const seedRows = async (table, columns, rows) => {
  const [countRows] = await mysqlPool.query(`SELECT COUNT(*) AS rowCount FROM ${table}`);
  if (Number(countRows[0].rowCount) > 0 || rows.length === 0) {
    return;
  }

  const placeholders = rows.map(() => `(${columns.map(() => "?").join(", ")})`).join(", ");
  const values = rows.flatMap((row) => row);
  await mysqlPool.execute(`INSERT INTO ${table} (${columns.join(", ")}) VALUES ${placeholders}`, values);
};

const initializeMysql = async () => {
  if (!mysqlPool) {
    return;
  }

  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(120) NOT NULL,
      email VARCHAR(254) NOT NULL,
      phone CHAR(10) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY users_email_unique (email),
      UNIQUE KEY users_phone_unique (phone)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS holdings (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(40) NOT NULL,
      qty INT NOT NULL,
      avg DECIMAL(15, 2) NOT NULL,
      price DECIMAL(15, 2) NOT NULL,
      net VARCHAR(20) NOT NULL,
      day VARCHAR(20) NOT NULL,
      is_loss BOOLEAN NOT NULL DEFAULT FALSE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS positions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      product VARCHAR(20) NOT NULL,
      name VARCHAR(40) NOT NULL,
      qty INT NOT NULL,
      avg DECIMAL(15, 2) NOT NULL,
      price DECIMAL(15, 2) NOT NULL,
      net VARCHAR(20) NOT NULL,
      day VARCHAR(20) NOT NULL,
      is_loss BOOLEAN NOT NULL DEFAULT FALSE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
  await mysqlPool.query(`
    CREATE TABLE IF NOT EXISTS orders (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      name VARCHAR(40) NOT NULL,
      qty INT NOT NULL,
      price DECIMAL(15, 2) NOT NULL,
      mode ENUM('BUY', 'SELL') NOT NULL,
      placed_at DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await seedRows(
    "holdings",
    ["name", "qty", "avg", "price", "net", "day", "is_loss"],
    demoHoldings.map((row) => [row.name, row.qty, row.avg, row.price, row.net, row.day, Boolean(row.isLoss)])
  );
  await seedRows(
    "positions",
    ["product", "name", "qty", "avg", "price", "net", "day", "is_loss"],
    demoPositions.map((row) => [row.product, row.name, row.qty, row.avg, row.price, row.net, row.day, Boolean(row.isLoss)])
  );

  mysqlReady = true;
};

app.use(
  cors({
    origin: (origin, callback) => {
      callback(null, !origin || allowedOrigins.has(origin));
    },
    credentials: true,
  })
);
app.use(bodyParser.json());

app.get("/", (req, res) => {
  res.json({
    message: "Zerodha backend is running.",
    status: "ok",
    database: mysqlReady ? "connected" : "unavailable",
    frontend: "http://localhost:3003",
    signup: "http://localhost:3001/signup",
    login: "http://localhost:3001/login",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    database: mysqlReady ? "connected" : "unavailable",
  });
});

// app.get("/addHoldings", async (req, res) => {
//   let tempHoldings = [
//     {
//       name: "BHARTIARTL",
//       qty: 2,
//       avg: 538.05,
//       price: 541.15,
//       net: "+0.58%",
//       day: "+2.99%",
//     },
//     {
//       name: "HDFCBANK",
//       qty: 2,
//       avg: 1383.4,
//       price: 1522.35,
//       net: "+10.04%",
//       day: "+0.11%",
//     },
//     {
//       name: "HINDUNILVR",
//       qty: 1,
//       avg: 2335.85,
//       price: 2417.4,
//       net: "+3.49%",
//       day: "+0.21%",
//     },
//     {
//       name: "INFY",
//       qty: 1,
//       avg: 1350.5,
//       price: 1555.45,
//       net: "+15.18%",
//       day: "-1.60%",
//       isLoss: true,
//     },
//     {
//       name: "ITC",
//       qty: 5,
//       avg: 202.0,
//       price: 207.9,
//       net: "+2.92%",
//       day: "+0.80%",
//     },
//     {
//       name: "KPITTECH",
//       qty: 5,
//       avg: 250.3,
//       price: 266.45,
//       net: "+6.45%",
//       day: "+3.54%",
//     },
//     {
//       name: "M&M",
//       qty: 2,
//       avg: 809.9,
//       price: 779.8,
//       net: "-3.72%",
//       day: "-0.01%",
//       isLoss: true,
//     },
//     {
//       name: "RELIANCE",
//       qty: 1,
//       avg: 2193.7,
//       price: 2112.4,
//       net: "-3.71%",
//       day: "+1.44%",
//     },
//     {
//       name: "SBIN",
//       qty: 4,
//       avg: 324.35,
//       price: 430.2,
//       net: "+32.63%",
//       day: "-0.34%",
//       isLoss: true,
//     },
//     {
//       name: "SGBMAY29",
//       qty: 2,
//       avg: 4727.0,
//       price: 4719.0,
//       net: "-0.17%",
//       day: "+0.15%",
//     },
//     {
//       name: "TATAPOWER",
//       qty: 5,
//       avg: 104.2,
//       price: 124.15,
//       net: "+19.15%",
//       day: "-0.24%",
//       isLoss: true,
//     },
//     {
//       name: "TCS",
//       qty: 1,
//       avg: 3041.7,
//       price: 3194.8,
//       net: "+5.03%",
//       day: "-0.25%",
//       isLoss: true,
//     },
//     {
//       name: "WIPRO",
//       qty: 4,
//       avg: 489.3,
//       price: 577.75,
//       net: "+18.08%",
//       day: "+0.32%",
//     },
//   ];

//   tempHoldings.forEach((item) => {
//     let newHolding = new HoldingsModel({
//       name: item.name,
//       qty: item.qty,
//       avg: item.avg,
//       price: item.price,
//       net: item.day,
//       day: item.day,
//     });

//     newHolding.save();
//   });
//   res.send("Done!");
// });

// app.get("/addPositions", async (req, res) => {
//   let tempPositions = [
//     {
//       product: "CNC",
//       name: "EVEREADY",
//       qty: 2,
//       avg: 316.27,
//       price: 312.35,
//       net: "+0.58%",
//       day: "-1.24%",
//       isLoss: true,
//     },
//     {
//       product: "CNC",
//       name: "JUBLFOOD",
//       qty: 1,
//       avg: 3124.75,
//       price: 3082.65,
//       net: "+10.04%",
//       day: "-1.35%",
//       isLoss: true,
//     },
//   ];

//   tempPositions.forEach((item) => {
//     let newPosition = new PositionsModel({
//       product: item.product,
//       name: item.name,
//       qty: item.qty,
//       avg: item.avg,
//       price: item.price,
//       net: item.net,
//       day: item.day,
//       isLoss: item.isLoss,
//     });

//     newPosition.save();
//   });
//   res.send("Done!");
// });

app.get("/allHoldings", async (req, res) => {
  if (!mysqlReady) {
    return authenticationDatabaseUnavailable(res);
  }

  try {
    const [allHoldings] = await mysqlPool.query(
      "SELECT id AS _id, name, qty, avg, price, net, day, is_loss AS isLoss FROM holdings ORDER BY id"
    );
    return res.json(allHoldings);
  } catch (error) {
    console.error("Holdings query error:", error);
    return res.status(500).json({ error: "Could not load holdings." });
  }
});

app.get("/allPositions", async (req, res) => {
  if (!mysqlReady) {
    return authenticationDatabaseUnavailable(res);
  }

  try {
    const [allPositions] = await mysqlPool.query(
      "SELECT id AS _id, product, name, qty, avg, price, net, day, is_loss AS isLoss FROM positions ORDER BY id"
    );
    return res.json(allPositions);
  } catch (error) {
    console.error("Positions query error:", error);
    return res.status(500).json({ error: "Could not load positions." });
  }
});

app.get("/allOrders", async (req, res) => {
  if (!mysqlReady) {
    return authenticationDatabaseUnavailable(res);
  }

  try {
    const [allOrders] = await mysqlPool.query(
      "SELECT id AS _id, name, qty, price, mode, placed_at AS placedAt FROM orders ORDER BY id DESC"
    );
    return res.json(allOrders);
  } catch (error) {
    console.error("Orders query error:", error);
    return res.status(500).json({ error: "Could not load orders." });
  }
});

app.post("/newOrder", async (req, res) => {
  const { name, qty, price, mode, placedAt } = req.body;
  if (
    typeof name !== "string" || !name.trim() ||
    !Number.isInteger(Number(qty)) || Number(qty) <= 0 ||
    !Number.isFinite(Number(price)) || Number(price) <= 0 ||
    !["BUY", "SELL"].includes(mode)
  ) {
    return res.status(400).json({ error: "Provide a stock name, positive quantity and price, and BUY or SELL mode." });
  }

  if (placedAt !== undefined && typeof placedAt !== "string") {
    return res.status(400).json({ error: "Provide a valid order timestamp." });
  }

  const orderDate = placedAt === undefined ? new Date() : new Date(placedAt);
  if (Number.isNaN(orderDate.getTime())) {
    return res.status(400).json({ error: "Provide a valid order timestamp." });
  }

  const orderPayload = {
    name: name.trim(),
    qty: Number(qty),
    price: Number(price),
    mode,
    placedAt: orderDate.toISOString(),
  };

  if (!mysqlReady) {
    return authenticationDatabaseUnavailable(res);
  }

  try {
    const [result] = await mysqlPool.execute(
      "INSERT INTO orders (name, qty, price, mode, placed_at) VALUES (?, ?, ?, ?, ?)",
      [
        orderPayload.name,
        orderPayload.qty,
        orderPayload.price,
        orderPayload.mode,
        formatMysqlDateTime(orderDate),
      ]
    );
    let notification;
    try {
      const user = await getAuthenticatedUser(req);
      notification = user
        ? await sendActivityNotification(
            user,
            formatOrderNotification(orderPayload)
          )
        : unavailableNotification("Sign in to receive account notifications.");
    } catch (error) {
      console.error("Order notification setup error:", error);
      notification = unavailableNotification("Could not load your account for notifications.");
    }

    return res.status(201).json({
      message: "Order saved.",
      order: { _id: result.insertId, ...orderPayload },
      notification,
      demoMode: false,
    });
  } catch (error) {
    console.error("Order save error:", error);
    return res.status(500).json({ error: "Could not save order." });
  }
});

app.post("/notify-demo-transaction", async (req, res) => {
  if (!mysqlReady) {
    return authenticationDatabaseUnavailable(res);
  }

  const { type, amount } = req.body;
  const numericAmount = Number(amount);
  if (
    !["Add funds", "Withdraw"].includes(type) ||
    !Number.isFinite(numericAmount) ||
    numericAmount <= 0
  ) {
    return res.status(400).json({ error: "Provide a valid demo transaction type and amount." });
  }

  try {
    const user = await getAuthenticatedUser(req);
    if (!user) {
      return res.status(401).json({ error: "Sign in to receive account notifications." });
    }

    const formattedAmount = numericAmount.toLocaleString("en-IN", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    const notification = await sendActivityNotification(
      user,
      `Demo ${type.toLowerCase()} of ₹${formattedAmount} recorded. This is a demo transaction only; no real payment or withdrawal was made.`
    );
    return res.json({ notification });
  } catch (error) {
    console.error("Demo transaction notification error:", error);
    return res.status(500).json({ error: "Could not send transaction notifications." });
  }
});

app.get("/allSignups", async (req, res) => {
  if (!mysqlReady) {
    return authenticationDatabaseUnavailable(res);
  }

  try {
    const [allSignups] = await mysqlPool.query(
      "SELECT phone, created_at AS createdAt FROM users ORDER BY created_at DESC"
    );
    return res.json(allSignups);
  } catch (error) {
    console.error("Signup query error:", error);
    return res.status(500).json({ error: "Could not load signups." });
  }
});

app.post("/signup", async (req, res) => {
  if (!mysqlReady) {
    return authenticationDatabaseUnavailable(res);
  }

  const { name, email, phone, password } = req.body;
  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const normalizedPhone = typeof phone === "string" ? phone.trim() : "";
  const normalizedPassword = typeof password === "string" ? password : "";

  if (!normalizedName || normalizedName.length < 2 || normalizedName.length > 120) {
    return res.status(400).json({ error: "Name must be between 2 and 120 characters long." });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) || normalizedEmail.length > 254) {
    return res.status(400).json({ error: "Enter a valid email address." });
  }

  if (!/^[6-9]\d{9}$/.test(normalizedPhone)) {
    return res.status(400).json({ error: "Enter a valid 10-digit mobile number starting with 6-9." });
  }

  if (normalizedPassword.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters long." });
  }

  try {
    const passwordHash = await bcrypt.hash(normalizedPassword, 10);
    const [result] = await mysqlPool.execute(
      "INSERT INTO users (name, email, phone, password_hash) VALUES (?, ?, ?, ?)",
      [normalizedName, normalizedEmail, normalizedPhone, passwordHash]
    );
    const user = {
      id: result.insertId,
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      createdAt: new Date().toISOString(),
    };

    const token = createToken(user);
    setAuthCookie(res, token);
    return res.status(201).json({
      message: "Account created successfully.",
      token,
      user: sanitizeUser(user),
      demoMode: false,
    });
  } catch (error) {
    if (error.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ error: "An account with this email or phone number already exists." });
    }
    console.error("Signup error:", error);
    return res.status(500).json({ error: "Could not save signup." });
  }
});

app.post("/login", async (req, res) => {
  if (!mysqlReady) {
    return authenticationDatabaseUnavailable(res);
  }

  const { email, password } = req.body;
  const normalizedEmail = typeof email === "string" ? email.trim().toLowerCase() : "";
  const normalizedPassword = typeof password === "string" ? password : "";

  if (!normalizedEmail || !normalizedPassword) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const [users] = await mysqlPool.execute(
      "SELECT id, name, email, phone, password_hash AS passwordHash, created_at AS createdAt FROM users WHERE email = ? LIMIT 1",
      [normalizedEmail]
    );
    const user = users[0];
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isValidPassword = await bcrypt.compare(normalizedPassword, user.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = createToken(user);
    setAuthCookie(res, token);
    return res.status(200).json({
      message: "Login successful.",
      token,
      user: sanitizeUser(user),
      demoMode: false,
    });
  } catch (error) {
    console.error("Login error:", error);
    return res.status(500).json({ error: "Could not log in." });
  }
});

app.get("/me", async (req, res) => {
  if (!mysqlReady) {
    return authenticationDatabaseUnavailable(res);
  }

  const authHeader = req.headers.authorization || "";
  const cookieToken = (req.headers.cookie || "")
    .split(";")
    .map((cookie) => cookie.trim())
    .find((cookie) => cookie.startsWith("zerodha_token="))
    ?.slice("zerodha_token=".length);
  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : cookieToken;

  if (!token) {
    return res.status(401).json({ error: "No token provided." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || "zerodha-demo-secret");
    const [users] = await mysqlPool.execute(
      "SELECT id, name, email, phone, created_at AS createdAt FROM users WHERE id = ? LIMIT 1",
      [decoded.id]
    );
    const user = users[0];
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }

    return res.status(200).json({ user: sanitizeUser(user), demoMode: false });
  } catch (error) {
    if (error.name === "JsonWebTokenError" || error.name === "TokenExpiredError") {
      return res.status(401).json({ error: "Invalid token." });
    }
    console.error("User lookup error:", error);
    return res.status(500).json({ error: "Could not load user." });
  }
});

const startServer = async (options = {}) => {
  const targetPort = options.port || PORT;

  if (Object.prototype.hasOwnProperty.call(options, "mysqlUrl")) {
    if (mysqlPool) {
      await mysqlPool.end();
    }
    mysqlPool = options.mysqlUrl ? mysql.createPool(options.mysqlUrl) : null;
  }
  mysqlReady = false;

  if (mysqlPool) {
    try {
      await initializeMysql();
      console.log("MySQL connected. Authentication storage is ready.");
    } catch (error) {
      throw new Error(`MySQL connection failed: ${error.message}`);
    }
  } else {
    mysqlReady = false;
    console.warn("MYSQL_URL is not configured. Database-backed API endpoints will be unavailable.");
  }

  const server = app.listen(targetPort, () => {
    const mode = mysqlReady ? "MySQL" : "no database";
    console.log(`API ready on port ${targetPort} (${mode} mode).`);
  });
  server.on("error", (error) => {
    if (error.code === "EADDRINUSE") {
      console.error(`API could not start because port ${targetPort} is already in use. Stop the other backend process or configure a different PORT.`);
      return;
    }
    console.error("API server error:", {
      code: error.code || "unknown",
      message: error.message,
    });
  });

  return server;
};

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer, demoHoldings, demoPositions, formatMysqlDateTime };
