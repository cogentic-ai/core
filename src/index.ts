import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { chat } from "./agents/chat.agent";
import { researchWebsite } from "./agents/researcher.agent";

console.log("Starting server...");
console.log("Environment:", {
  PORT: process.env.PORT,
  NODE_ENV: process.env.NODE_ENV,
});

try {
  const app = new Elysia()
    .use(cors())
    .get("/", () => "Hello from Bun!")
    .get("/health", () => {
      console.log("Health check called");
      return { status: "ok" };
    })
    .post("/chat", async ({ body }) => {
      if (typeof body !== "object" || !body || typeof body.message !== "string") {
        throw new Error("Message is required in the request body");
      }
      return await chat(body.message);
    })
    .post("/research", async ({ body }) => {
      if (typeof body !== "object" || !body || typeof body.url !== "string") {
        throw new Error("URL is required in the request body");
      }
      return await researchWebsite(body.url);
    })
    .listen(process.env.PORT || 3000);

  console.log(
    `🦊 Server is running at ${app.server?.hostname}:${app.server?.port}`
  );
} catch (error) {
  console.error("Failed to start server:", error);
  process.exit(1);
}
