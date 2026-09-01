import Database from "better-sqlite3";
import fs from "fs";
import path from "path";

// Locate sqlite file
const possiblePaths = [
  path.resolve("dev.db"),
  path.resolve("prisma/dev.db"),
];

let dbPath = null;
for (const p of possiblePaths) {
  if (fs.existsSync(p)) {
    dbPath = p;
    break;
  }
}

if (!dbPath) {
  console.error("Database file not found in possible paths:", possiblePaths);
  process.exit(1);
}

console.log(`Connecting to database at: ${dbPath}`);
const db = new Database(dbPath);

try {
  // Wipe transactional/history tables
  const tables = [
    "AuditLog",
    "SupportTicket",
    "Message",
    "Conversation",
    "Payment",
    "OrderItem",
    "Order",
    "CartItem",
    "Cart",
    "CustomerSession",
  ];

  for (const table of tables) {
    try {
      const info = db.prepare(`DELETE FROM "${table}"`).run();
      console.log(`Cleared table "${table}": ${info.changes} rows deleted.`);
    } catch (err) {
      console.warn(`Table "${table}" skip/error:`, err.message);
    }
  }

  // Reset table status to AVAILABLE
  try {
    const tableUpdate = db.prepare(`UPDATE "Table" SET status = 'AVAILABLE'`).run();
    console.log(`Reset ${tableUpdate.changes} tables to AVAILABLE.`);
  } catch (err) {
    console.warn(`Table reset:`, err.message);
  }

  // Vacuum to reclaim space
  db.exec("VACUUM;");
  console.log("Database history completely wiped! Database is clean from scratch.");
} catch (error) {
  console.error("Error wiping database:", error);
} finally {
  db.close();
}
