import { NestFactory } from '@nestjs/core';
import * as cookieParser from 'cookie-parser';
import { ValidationPipe } from '@nestjs/common';

import { config } from 'aws-sdk';
import { AppModule } from './app.module';
import helmet from 'helmet';
require('dotenv').config();

async function bootstrap() {
	const app = await NestFactory.create(AppModule);
	app.useGlobalPipes(new ValidationPipe());

	app.use(cookieParser());
	app.use(helmet());
	app.enableCors({
		origin: process.env.ORIGIN_URL || 'https://beta-bhopmaps.vercel.app/',
		credentials: true,
	});

	config.update({
		accessKeyId: process.env.S3_ACCESS,
		secretAccessKey: process.env.S3_SECRET,
		region: process.env.S3_REGION,
	});

	await app.listen(5000);
}
bootstrap();
