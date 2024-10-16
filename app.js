const express = require("express");
const multer = require("multer");
const bodyParser = require("body-parser");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const helmet = require("helmet");
const { body, validationResult, query } = require("express-validator");
const rateLimit = require("express-rate-limit");
const path = require("path");

dotenv.config();

const app = express();

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.error("MongoDB connection error:", err));

const User = require("./models/user");

app.use(helmet());

const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: "Too many requests from this IP, please try again after 15 minutes.",
});
app.use(generalLimiter);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

const authToken = (req, res, next) => {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (token == null)
    return res.status(401).json({ error: "Access token required" });

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: "Invalid or expired token" });
    req.user = user;
    next();
  });
};

const authorizeRoles = (roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ error: "Forbidden: You do not have access to this resource" });
    }
    next();
  };
};

const upload = multer({ dest: "uploads/" });

app.post(
  "/register",
  [
    body("username").isString().notEmpty().withMessage("Username is required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
    body("role")
      .isIn(["human", "ghost"])
      .withMessage("Role must be either human or ghost"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { username, password, role } = req.body;

    try {
      const existingUser = await User.findOne({ username });
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }

      const user = new User({ username, password, role });
      await user.save();

      res.status(201).json({ message: "User registered successfully" });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ error: "Server error during registration" });
    }
  }
);

app.post(
  "/login",
  [
    body("username").isString().notEmpty().withMessage("Username is required"),
    body("password").isString().notEmpty().withMessage("Password is required"),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { username, password } = req.body;

    try {
      const user = await User.findOne({ username });
      if (!user) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(400).json({ error: "Invalid credentials" });
      }

      const token = jwt.sign(
        { username: user.username, role: user.role },
        process.env.ACCESS_TOKEN_SECRET,
        { expiresIn: "1h" }
      );

      res.json({ token });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Server error during login" });
    }
  }
);

app.post(
  "/detect",
  authToken,
  authorizeRoles(["human"]),
  [
    body("latitude")
      .isFloat({ min: -90, max: 90 })
      .withMessage("Invalid latitude"),
    body("longitude")
      .isFloat({ min: -180, max: 180 })
      .withMessage("Invalid longitude"),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { latitude, longitude } = req.body;
    if (!req.file) {
      return res.status(400).json({ error: "Image and location required" });
    }
    res.json({
      ghost_detected: true,
      ghost_type: "Poltergeist",
      bounding_box: {
        x: 120,
        y: 80,
        width: 200,
        height: 200,
      },
    });
  }
);

app.post(
  "/ghost/detect",
  authToken,
  authorizeRoles(["ghost"]),

  (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: "Image required" });
    }
    res.json({
      human_detected: true,
      human_age: 29,
      human_identity: "John Doe",
      spook_level: "Terrified",
    });
  }
);

app.get(
  "/sightings",
  authToken,
  authorizeRoles(["human"]),
  [
    query("latitude")
      .isFloat({ min: -90, max: 90 })
      .withMessage("Invalid latitude"),
    query("longitude")
      .isFloat({ min: -180, max: 180 })
      .withMessage("Invalid longitude"),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { latitude, longitude } = req.query;

    if (req.user.role === "human") {
      res.json({
        sightings: [
          {
            ghost_type: "Banshee",
            location: "13 Haunted Lane",
            time: "02:00 AM",
          },
          { ghost_type: "Wraith", location: "Old Cemetery", time: "03:15 AM" },
        ],
      });
    } else if (req.user.role === "ghost") {
      res.json({
        human_sightings: [
          {
            human_name: "Jane Smith",
            location: "Haunted Mansion",
            time: "10:00 PM",
          },
          {
            human_name: "Bob the Builder",
            location: "Spooky Forest",
            time: "11:45 PM",
          },
        ],
      });
    } else {
      res.status(400).json({ error: "Invalid role" });
    }
  }
);

app.get(
  "/ghost-info",
  authToken,
  authorizeRoles(["human"]),
  [
    query("ghost_type")
      .isString()
      .notEmpty()
      .withMessage("Ghost type required"),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { ghost_type } = req.query;

    if (ghost_type.toLowerCase() === "poltergeist") {
      res.json({
        ghost_type: "Poltergeist",
        favorite_food: "Cold pizza",
        favorite_time_of_night: "2:00 AM",
        typical_age: "300 years",
        origin: "Medieval Europe",
        description:
          "A mischievous spirit known for moving objects and causing trouble.",
      });
    } else {
      res.json({
        ghost_type: ghost_type,
        favorite_food: "Unknown",
        favorite_time_of_night: "Unknown",
        typical_age: "Unknown",
        origin: "Unknown",
        description: "No information available for this ghost type.",
      });
    }
  }
);

app.get("/users", authToken, authorizeRoles(["human"]), (req, res) => {
  res.json({
    users: [
      { username: "GhostHunter22", sightings_count: 5 },
      { username: "SpookySeeker", sightings_count: 12 },
    ],
  });
});

app.post(
  "/spirit-guide",
  authToken,
  authorizeRoles(["human"]),
  [body("question").isString().notEmpty().withMessage("Question required")],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { question } = req.body;
    res.json({
      answer: "That’s a bad idea... trust me.",
    });
  }
);

app.get(
  "/spook-level",
  authToken,
  authorizeRoles(["human", "ghost"]),
  [
    query("latitude")
      .isFloat({ min: -90, max: 90 })
      .withMessage("Invalid latitude"),
    query("longitude")
      .isFloat({ min: -180, max: 180 })
      .withMessage("Invalid longitude"),
  ],
  (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    const { latitude, longitude } = req.query;
    res.json({
      spook_level: 9,
      description: "Extremely haunted. Watch your back!",
    });
  }
);

app.get(
  "/ghost/spooky-name",
  authToken,
  authorizeRoles(["ghost"]),
  (req, res) => {
    res.json({
      spooky_name: "The Shadow Whisperer",
    });
  }
);

app.get(
  "/ghost/favorite-haunts",
  authToken,
  authorizeRoles(["ghost"]),
  (req, res) => {
    res.json({
      favorite_haunts: [
        { location: "Old Lighthouse", scares_given: 15 },
        { location: "Abandoned Hospital", scares_given: 20 },
      ],
    });
  }
);

app.use((err, req, res, next) => {
  console.error(err.stack);
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ error: err.message });
  }
  res.status(500).json({ error: "Internal Server Error" });
});

app.listen(3000, () => {
  console.log(`Ghost-Detector API is running on port ${PORT}`);
});
