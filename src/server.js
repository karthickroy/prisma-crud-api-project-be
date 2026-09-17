const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const path = require("path");
const fs = require("fs");
const { PrismaClient } = require("@prisma/client");

// Load mode-specific environment file (.env.development / .env.production) if present
const nodeEnv = process.env.NODE_ENV || "development";
const envFile = path.resolve(__dirname, `../.env.${nodeEnv}`);

if (fs.existsSync(envFile)) {
  dotenv.config({ path: envFile });
}
dotenv.config(); 

const app = express();
const prisma = new PrismaClient();

// Bulletproof CORS: dynamically reflect request origin (allowing Vercel, localhost, etc.)
app.use(
  cors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    optionsSuccessStatus: 200,
  })
);
app.options("*", cors());
app.use(express.json());

const PORT = process.env.PORT || 8000;

// Health-check / Root API route
app.get("/", (req, res) => {
  res.status(200).json({
    status: "online",
    message: "Employee Management API is running",
    endpoints: {
      employees: "/api/employees",
    },
  });
});

// GET ALL
app.get("/api/employees", async (req, res) => {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: {
        createdAt: "desc",
      },
    });

    res.status(200).json(employees);
  } catch (error) {
    console.error("Failed to fetch employees:", error);
    res.status(500).json({
      message: "Failed to fetch employees",
      error: error.message,
    });
  }
});

// GET ONE
app.get("/api/employees/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const employee = await prisma.employee.findUnique({
      where: { id },
    });

    if (!employee) {
      return res.status(404).json({
        message: "Employee not found",
      });
    }

    res.status(200).json(employee);
  } catch (error) {
    console.error(`Failed to fetch employee ${req.params.id}:`, error);
    res.status(500).json({
      message: "Failed to fetch employee",
      error: error.message,
    });
  }
});

// CREATE
app.post("/api/employees", async (req, res) => {
  try {
    const { name, email, role, salary } = req.body;

    if (!name || !email || !role || salary === undefined || salary === "") {
      return res.status(400).json({
        message: "All fields (name, email, role, salary) are required",
      });
    }

    const parsedSalary = Number(salary);
    if (isNaN(parsedSalary)) {
      return res.status(400).json({
        message: "Salary must be a valid number",
      });
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        email,
        role,
        salary: parsedSalary,
      },
    });

    res.status(201).json(employee);
  } catch (error) {
    console.error("Failed to create employee:", error);

    // Handle duplicate email in Prisma
    if (error.code === "P2002") {
      return res.status(409).json({
        message: "An employee with this email already exists",
      });
    }

    res.status(500).json({
      message: "Failed to create employee",
      error: error.message,
    });
  }
});

// UPDATE
app.put("/api/employees/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, role, salary } = req.body;

    const parsedSalary = salary !== undefined && salary !== "" ? Number(salary) : undefined;
    if (parsedSalary !== undefined && isNaN(parsedSalary)) {
      return res.status(400).json({
        message: "Salary must be a valid number",
      });
    }

    const employee = await prisma.employee.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(email && { email }),
        ...(role && { role }),
        ...(parsedSalary !== undefined && { salary: parsedSalary }),
      },
    });

    res.status(200).json(employee);
  } catch (error) {
    console.error(`Failed to update employee ${req.params.id}:`, error);

    if (error.code === "P2002") {
      return res.status(409).json({
        message: "An employee with this email already exists",
      });
    }

    res.status(500).json({
      message: "Failed to update employee",
      error: error.message,
    });
  }
});

// DELETE
app.delete("/api/employees/:id", async (req, res) => {
  try {
    const { id } = req.params;

    await prisma.employee.delete({
      where: { id },
    });

    res.status(200).json({
      message: "Employee deleted successfully",
    });
  } catch (error) {
    console.error(`Failed to delete employee ${req.params.id}:`, error);
    res.status(500).json({
      message: "Failed to delete employee",
      error: error.message,
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running in [${nodeEnv}] mode on http://localhost:${PORT}`);
});