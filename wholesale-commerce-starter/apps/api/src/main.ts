import "./load-env";
import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import cookieParser from "cookie-parser";
import { DEFAULT_API_PORT, DEFAULT_WEB_ORIGIN } from "@almohit/config";
import { AppModule } from "./app.module";
import { ApiExceptionFilter } from "./common/api-exception.filter";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.setGlobalPrefix("api/v1");
  app.useGlobalFilters(new ApiExceptionFilter());

  const origins = (process.env.CORS_ORIGIN ?? DEFAULT_WEB_ORIGIN)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins,
    credentials: true,
  });

  const swagger = new DocumentBuilder()
    .setTitle("Almohit API")
    .setDescription("Wholesale commerce REST API")
    .setVersion("1.0")
    .addCookieAuth(process.env.SESSION_COOKIE_NAME ?? "wholesale_session")
    .build();
  const document = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup("api/docs", app, document, { useGlobalPrefix: false });

  const port = Number(process.env.PORT ?? DEFAULT_API_PORT);
  await app.listen(port);
}

void bootstrap();
