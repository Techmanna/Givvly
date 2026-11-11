import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import { ValidationPipe } from "@nestjs/common";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { apiReference } from "@scalar/nestjs-api-reference";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";
import { TransformInterceptor } from "./common/interceptors/transform.interceptor";
import { AllExceptionsFilter } from "./common/filters/http-exception.filter";
import { isAllowedCorsOrigin } from "./common/utils/cors.util";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
    rawBody: true,
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>("PORT", 4000);
  const rawCors = configService.get<string | string[]>("CORS_ORIGINS", [
    "http://localhost:3000",
    "https://givvly.store",
    "https://www.givvly.store",
  ]);
  const appUrl = configService.get<string>("APP_URL");

  const corsOrigins: string[] = [
    "https://givvly.store",
    "https://www.givvly.store",
    "http://localhost:3000",
  ];
  if (Array.isArray(rawCors)) {
    corsOrigins.push(...rawCors.map((s) => s.trim()));
  } else if (typeof rawCors === "string") {
    corsOrigins.push(...rawCors.split(",").map((s) => s.trim()));
  }
  if (appUrl) {
    corsOrigins.push(appUrl.trim());
  }

  // Security Middleware with CSP adjusted for Scalar assets
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: [
            "'self'",
            "'unsafe-inline'",
            "'unsafe-eval'",
            "https://cdn.jsdelivr.net",
          ],
          styleSrc: [
            "'self'",
            "'unsafe-inline'",
            "https://fonts.googleapis.com",
            "https://cdn.jsdelivr.net",
          ],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: [
            "'self'",
            "data:",
            "https://cdn.givvly.store",
            "https://*.paystack.co",
            "https://cdn.jsdelivr.net",
          ],
        },
      },
    })
  );

  app.use(cookieParser());
  app.enableCors({
    origin: (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => {
      if (isAllowedCorsOrigin(origin, corsOrigins)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
    methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "X-Request-Id",
      "X-CSRF-Token",
      "Idempotency-Key",
      "Accept",
    ],
    exposedHeaders: ["X-Request-Id"],
  });

  // Global Envelope & Error Handling
  app.setGlobalPrefix("api/v1");
  app.useGlobalInterceptors(new TransformInterceptor());
  app.useGlobalFilters(new AllExceptionsFilter());

  // Global standard validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidUnknownValues: false,
    })
  );

  // OpenAPI Swagger Specification
  const swaggerConfig = new DocumentBuilder()
    .setTitle("Givvly Enterprise API")
    .setDescription(
      "Next-Generation Digital Gifting, Event Registry & Celebration Infrastructure.\n\n" +
      "### Core Architecture & Invariants\n" +
      "- **Strict Subunits**: All currency values are strictly integer subunits (kobo, cents, pence).\n" +
      "- **Balanced Ledger**: Double-entry bookkeeping enforces sum(DEBIT) === sum(CREDIT) on every financial transaction.\n" +
      "- **Decoupled Payments & Currencies**: Pluggable multi-gateway adapters (Paystack default) supporting NGN, USD, GBP, EUR, GHS, KES.\n" +
      "- **Atomic Concurrency**: Compare-and-set row locks on registry reservation holds and pool target increments.\n" +
      "- **Two Role Security**: Strictly `USER` (celebration hosts, gift buyers) and `ADMIN` (catalog management, order fulfillment)."
    )
    .setVersion("1.0.0")
    .addBearerAuth(
      {
        type: "http",
        scheme: "bearer",
        bearerFormat: "JWT",
        description: "Session access token",
      },
      "bearerAuth"
    )
    .addCookieAuth("givvly_at", {
      type: "apiKey",
      in: "cookie",
      name: "givvly_at",
      description: "HttpOnly authentication session cookie",
    })
    .addTag("Authentication & Sessions", "User registration, Argon2id authentication, and session family rotation")
    .addTag("Events & Celebration Registries", "Event registry lifecycle, slug management, and NUBAN bank accounts")
    .addTag("Payments & Money Gifting", "Direct cash contributions, transaction fee splitting, and payment initialization")
    .addTag("Registry & Reservation Engine", "Physical gift reservations, 10-minute atomic holds, and gift purchases")
    .addTag("Group Gifting & Crowdfunded Pools", "Crowdfunded pools, overfunding guards, and host cash resolution")
    .addTag("E-Commerce Catalog & Collections", "Browse curated gift items, filters, hampers, and collections")
    .addTag("Orders & Fulfillment", "Direct checkout, gift boxes, order tracking, reviews, and disputes")
    .addTag("Admin Console (Operations, Catalog & Users)", "Catalog CRUD, user management, order transitions, and financial trial balance")
    .addTag("Notifications & Communication Preferences", "Multi-channel email/in-app notifications and preferences")
    .addTag("Media & Presigned Uploads", "S3/CDN presigned direct uploads with MIME and size verification")
    .addTag("Digital Gifts & Instant Vouchers", "Airtime/Data instant top-up and digital gift card vouchers")
    .addTag("Webhooks (Payment Gateways & Providers)", "Cryptographically verified webhook ingestion pipeline")
    .addTag("Payouts & Host Transfers", "Automated and manual host withdrawal settlement")
    .addTag("System Health & Probes", "Liveness and readiness probes for database and Redis")
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);

  // Serve OpenAPI specification JSON
  app.getHttpAdapter().get("/openapi.json", (req, res) => {
    res.json(document);
  });

  // Mount Modern Scalar API Reference UI
  app.use(
    "/reference",
    apiReference({
      spec: {
        content: document,
      },
      theme: "purple",
      pageTitle: "Givvly API Reference",
      darkMode: true,
    })
  );

  app.use(
    "/docs",
    apiReference({
      spec: {
        content: document,
      },
      theme: "purple",
      pageTitle: "Givvly API Reference",
      darkMode: true,
    })
  );

  // Graceful shutdown hooks
  app.enableShutdownHooks();

  await app.listen(port);
  console.log(`🚀 Givvly API running on: http://localhost:${port}/api/v1`);
  console.log(`📖 Modern Scalar API Documentation available at: http://localhost:${port}/docs`);
}

void bootstrap();
