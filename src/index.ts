import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { comicAnalyzer } from "./agents/comic-analyzer";

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
    .post("/analyze-comic", async ({ body }) => {
      if (
        typeof body !== "object" ||
        !body ||
        typeof body.imageUrl !== "string"
      ) {
        throw new Error("Image URL is required in the request body");
      }

      return await comicAnalyzer.run(
        `Analyze this comic book cover: ${body.imageUrl}`,
        {
          deps: {
            openaiKey: process.env.OPENAI_API_KEY!,
          },
          debug: true,
        }
      );
    })
    .listen(process.env.PORT || 3000);

  console.log(
    `🦊 Server is running at ${app.server?.hostname}:${app.server?.port}`
  );
} catch (error) {
  console.error("Failed to start server:", error);
  process.exit(1);
}
