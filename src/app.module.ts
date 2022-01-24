import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './Entities/user.entity';
import { Map } from './Entities/map.entity';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth.module';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
require('dotenv').config();

@Module({
	imports: [
		TypeOrmModule.forRoot({
			type: 'mysql',
			host: process.env.DB_HOST,
			port: 25060,
			username: process.env.DB_USER,
			password: process.env.DB_PW,
			database: process.env.DB_NAME,
			entities: [User, Map],
			synchronize: true,
		}),
		TypeOrmModule.forFeature([User, Map]),
		JwtModule.register({
			secret: process.env.JWT_SECRET,
			signOptions: { expiresIn: '1d' },
		}),
		ConfigModule.forRoot(),
		AuthModule,
		ThrottlerModule.forRoot({
			ttl: 60,
			limit: 10,
		}),
	],
	controllers: [AppController],
	providers: [AppService],
})
export class AppModule {}
