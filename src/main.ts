import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
require('dotenv').config();

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  app.use(cookieParser())
  app.enableCors({
    origin: process.env.ORIGIN_URL,
    credentials: true
  })


  await app.listen(5000);
}
bootstrap();
