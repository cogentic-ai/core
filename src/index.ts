import { Elysia } from "elysia";
import { cors } from "@elysiajs/cors";
import { researchWebsite } from "./agents/researcher.agent";
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
    .post("/research", async ({ body }) => {
      if (typeof body !== "object" || !body || typeof body.url !== "string") {
        throw new Error("URL is required in the request body");
      }
      return await researchWebsite(body.url);
    })
    .post("/analyze", async ({ body }) => {
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

// curl -X POST http://localhost:3000/analyze \
//   -H "Content-Type: application/json" \
//   -d '{
//     "imageUrl": "https://static.wikia.nocookie.net/marveldatabase/images/0/0d/Tales_of_Suspense_Vol_1_49.jpg"
//   }'
