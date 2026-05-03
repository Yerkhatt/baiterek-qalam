import { existsSync } from "fs";
import { createServer } from "net";
import { resolve } from "path";
import { config } from "dotenv";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { AppModule } from "./app.module";

/** Default local API port (avoid common 3000/3001 conflicts). */
const DEFAULT_API_PORT = 2745;

const rootEnv = resolve(__dirname, "../../../.env");
const apiEnv = resolve(__dirname, "../../.env");
if (existsSync(rootEnv)) {
  config({ path: rootEnv });
} else if (existsSync(apiEnv)) {
  config({ path: apiEnv });
}

function listenPortCandidates(): number[] {
  const raw = process.env.PORT;
  if (raw != null && raw !== "") {
    return [Number(raw)];
  }
  if (process.env.NODE_ENV === "production") {
    return [DEFAULT_API_PORT];
  }
  return Array.from({ length: 5 }, (_, i) => DEFAULT_API_PORT + i);
}

/** True if nothing is listening on this TCP port (closes the probe socket immediately). */
async function canListenOn(port: number): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const server = createServer();
    server.once("error", (err: NodeJS.ErrnoException) => {
      server.close();
      if (err.code === "EADDRINUSE") resolve(false);
      else reject(err);
    });
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
  });
}

/** Pick the first free port without calling Nest `listen`, so busy ports never trigger Nest's EADDRINUSE error log. */
async function resolveListenPort(candidates: number[]): Promise<{ port: number; usedFallback: boolean }> {
  if (candidates.length === 0) {
    throw new Error("[api] No listen ports configured.");
  }
  for (const port of candidates) {
    if (await canListenOn(port)) {
      const usedFallback = candidates.length > 1 && port !== DEFAULT_API_PORT;
      return { port, usedFallback };
    }
  }
  const list = candidates.join(", ");
  throw new Error(
    `[api] Port(s) already in use (${list}). Stop the other process or set PORT in .env to a free port (e.g. PORT=2750).`
  );
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { cors: true });
  const candidates = listenPortCandidates();
  const { port, usedFallback } = await resolveListenPort(candidates);

  if (!process.env.PORT && usedFallback) {
    // eslint-disable-next-line no-console
    console.warn(
      `[api] Port ${DEFAULT_API_PORT} was busy; listening on ${port}. Point the web app at this URL (NEXT_PUBLIC_API_URL / SERVER_API_URL) or stop the process on ${DEFAULT_API_PORT}.`
    );
  }

  await app.listen(port);
}

bootstrap();
