#!/usr/bin/env node
/**
 * Hermes Agent Gateway - Local Simulator (Port 8642)
 *
 * This server simulates the official Nous Research Hermes Agent Framework Gateway.
 * It listens on http://127.0.0.1:8642/v1/chat/completions and provides
 * OpenAI-compatible function/tool calling for Havenso Cafe.
 */

import http from "http";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, "../.env.local");

// Load .env.local manually for standalone script execution
let backendKey = process.env.SIMULATOR_BACKEND_KEY || process.env.GROQ_API_KEY || "";
if (!backendKey && fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (trimmed.startsWith("SIMULATOR_BACKEND_KEY=")) {
      backendKey = trimmed.replace("SIMULATOR_BACKEND_KEY=", "").replace(/["']/g, "").trim();
    } else if (!backendKey && trimmed.startsWith("GROQ_API_KEY=")) {
      backendKey = trimmed.replace("GROQ_API_KEY=", "").replace(/["']/g, "").trim();
    }
  }
}


const PORT = process.env.HERMES_PORT || 8642;
const HOST = "127.0.0.1";

const server = http.createServer(async (req, res) => {
  // CORS Headers
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  const url = new URL(req.url || "/", `http://${req.headers.host}`);

  // Health / Root check
  if (req.method === "GET" && (url.pathname === "/" || url.pathname === "/health")) {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "healthy", service: "hermes-agent-gateway", port: PORT }));
    return;
  }

  // Model list endpoint
  if (req.method === "GET" && url.pathname === "/v1/models") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        object: "list",
        data: [
          { id: "hermes-3", object: "model", owned_by: "nous-research" },
          { id: "hermes-agent", object: "model", owned_by: "nous-research" },
          { id: "nous-hermes", object: "model", owned_by: "nous-research" },
        ],
      })
    );
    return;
  }

  // OpenAI Chat Completions Endpoint
  if (req.method === "POST" && url.pathname === "/v1/chat/completions") {
    let bodyText = "";
    req.on("data", (chunk) => {
      bodyText += chunk;
    });

    req.on("end", async () => {
      try {
        const payload = JSON.parse(bodyText);
        const model = payload.model || "hermes-3";
        const userMsg = payload.messages?.[payload.messages.length - 1]?.content || "";
        const toolsCount = payload.tools?.length || 0;

        console.log(`\n------------------------------------------------------------`);
        console.log(`[Hermes Gateway :${PORT}] Incoming Request`);
        console.log(`> Model Requested : ${model}`);
        console.log(`> User Message    : "${userMsg.slice(0, 80)}${userMsg.length > 80 ? "..." : ""}"`);
        console.log(`> Registered Tools: ${toolsCount} tools`);

        // Forward to underlying reasoning engine
        if (!backendKey) {
          console.error(`[Hermes Gateway Error] SIMULATOR_BACKEND_KEY is not set in .env.local!`);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(
            JSON.stringify({
              error: {
                message: "SIMULATOR_BACKEND_KEY is missing. Please set it in .env.local for Hermes Gateway simulation.",
              },
            })
          );
          return;
        }

        // Multi-model resilience pool: If one model hits rate limit (429), immediately fallback!
        const candidateModels = [
          "openai/gpt-oss-120b",
          "llama-3.3-70b-versatile",
          "qwen/qwen3.8-27b",
          "llama-3.1-8b-instant",
          "openai/gpt-oss-20b",
          "qwen/qwen3.6-27b",
        ];

        let data = null;
        let elapsed = 0;

        for (const backendModel of candidateModels) {
          const startTime = Date.now();
          try {
            console.log(`[Hermes Gateway] Forwarding reasoning to engine (${backendModel})...`);
            const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${backendKey}`,
              },
              body: JSON.stringify({
                model: backendModel,
                messages: payload.messages,
                tools: payload.tools,
                tool_choice: payload.tool_choice || "auto",
                temperature: payload.temperature ?? 0.15,
                max_tokens: payload.max_tokens ?? 1500,
              }),
            });

            if (groqRes.ok) {
              data = await groqRes.json();
              elapsed = Date.now() - startTime;
              break;
            }

            const errBody = await groqRes.text();
            console.warn(`[Hermes Gateway Fallback] Model ${backendModel} status ${groqRes.status}: trying next fallback model...`);
          } catch (e) {
            console.warn(`[Hermes Gateway Fallback] Model ${backendModel} error:`, e);
          }
        }

        if (!data) {
          console.error(`[Hermes Gateway Error] All backend candidate models failed!`);
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: { message: "All reasoning engines busy or rate-limited" } }));
          return;
        }
        const choice = data.choices?.[0];
        const toolCalls = choice?.message?.tool_calls;

        console.log(`[Hermes Gateway] Response ready in ${elapsed}ms`);
        if (toolCalls && toolCalls.length > 0) {
          console.log(`> Tool Call Generated:`, JSON.stringify(toolCalls.map((t) => ({ name: t.function?.name, args: t.function?.arguments }))));
        } else {
          console.log(`> Text Reply: "${(choice?.message?.content || "").slice(0, 100)}..."`);
        }
        console.log(`------------------------------------------------------------`);

        // Return exact response with Hermes model identifier
        data.model = model;
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(data));
      } catch (err) {
        console.error(`[Hermes Gateway Error]`, err);
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: { message: String(err) } }));
      }
    });
    return;
  }

  // Not found
  res.writeHead(404, { "Content-Type": "application/json" });
  res.end(JSON.stringify({ error: { message: "Not found" } }));
});

server.listen(PORT, HOST, () => {
  console.log(`\n============================================================`);
  console.log(`  🚀 HERMES AGENT GATEWAY RUNNING LOCALLY`);
  console.log(`============================================================`);
  console.log(`  Endpoint URL : http://${HOST}:${PORT}/v1`);
  console.log(`  Completions  : http://${HOST}:${PORT}/v1/chat/completions`);
  console.log(`  Health Check : http://${HOST}:${PORT}/health`);
  console.log(`------------------------------------------------------------`);
  console.log(`  Ready to receive agent requests from Havenso Cafe!`);
  console.log(`  Press Ctrl+C to stop.\n`);
});
