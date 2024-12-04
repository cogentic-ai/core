import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { chat } from "./services/chat.service";

const app = new Elysia()
  .use(cors())
  .get("/", () => "Hello from Bun!")
  .get("/health", () => ({ status: "ok" }))
  .post("/chat", async ({ body }) => {
    if (typeof body !== "object" || !body || typeof body.message !== "string") {
      throw new Error("Message is required in the request body");
    }
    return await chat(body.message);
  })
  .listen(process.env.PORT || 3000);

console.log(
  `🦊 Server is running at ${app.server?.hostname}:${app.server?.port}`
);
