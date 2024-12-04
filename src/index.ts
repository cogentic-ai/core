import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'

const app = new Elysia()
  .use(cors())
  .get('/', () => 'Hello from Bun!')
  .get('/health', () => ({ status: 'ok' }))
  .listen(process.env.PORT || 3000)

console.log(
  `🦊 Server is running at ${app.server?.hostname}:${app.server?.port}`
)
