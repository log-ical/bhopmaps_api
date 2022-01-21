import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Param,
	Post,
	Put,
	Req,
	Res,
	UnauthorizedException,
} from '@nestjs/common';
import { AppService } from './app.service';
import * as bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { JwtService } from '@nestjs/jwt';
import { Response, Request } from 'express';
import { NotFoundError } from 'rxjs';
import { UpdateUserDto } from './Dto/update-user.dto';

@Controller('api')
export class AppController {
	constructor(
		private readonly appService: AppService,
		private jwtService: JwtService,
	) {}

	@Post('register')
	async register(
		@Body('username') username: string,
		@Body('password') password: string,
		@Body('avatar') avatar?: string,
	) {
		const hashedPassword = await bcrypt.hash(password, 12);

		const user = await this.appService.create({
			username: username.toLowerCase(),
			id: nanoid(8),
			passwordHash: hashedPassword,
			avatar:
				avatar ||
				'https://cdn.discordapp.com/attachments/907567825776947210/933846888719982602/default_avatar.png',
		});

		delete user.passwordHash;

		return user;
	}

	@Post('login')
	async login(
		@Body('username') username: string,
		@Body('password') password: string,
		@Res({ passthrough: true }) response: Response,
	) {
		const user = await this.appService.findOne({ username });

		if (!user) {
			throw new BadRequestException('Invalid credentials');
		}

		if (!(await bcrypt.compare(password, user.passwordHash))) {
			throw new BadRequestException('Invalid credentials');
		}

		const jwt = await this.jwtService.signAsync({ id: user.id });

		response.cookie('jwt', jwt, { httpOnly: true });

		return {
			message: 'Successfully logged in',
		};
	}

	@Get('user')
	async user(@Req() request: Request) {
		try {
			const cookie = request.cookies['jwt'];

			const data = await this.jwtService.verifyAsync(cookie);

			if (!data) {
				throw new UnauthorizedException();
			}

			const user = await this.appService.findOne({ id: data['id'] });

			const { passwordHash, ...result } = user;

			return result;
		} catch (e) {
			throw new UnauthorizedException();
		}
	}

	@Get('user/:username')
	async getUser(@Param('username') username: string) {
		const user = await this.appService.findOne({ username });

		if (!user) {
			throw new BadRequestException('User not found');
		}

		const { id, passwordHash, ...userData } = user;

		return {
			userData,
		};
	}

	@Post('logout')
	async logout(@Res({ passthrough: true }) response: Response) {
		response.clearCookie('jwt');

		return {
			message: 'Successfully logged out',
		};
	}

	@Put('user/edit')
	async editUser(@Req() request: Request, @Body() data: UpdateUserDto) {
		const cookie = request.cookies['jwt'];

		const data2 = await this.jwtService.verifyAsync(cookie);

		if (!data2) {
			throw new UnauthorizedException();
		}

		const user = await this.appService.findOne({ id: data2['id'] });

		if (!user) {
			throw new BadRequestException('User not found');
		}

		delete user.passwordHash;

		const updated = Object.assign(user, data);

		return await this.appService.update(user.id, updated);
	}

	@Delete('user/delete')
	async deleteUser(@Req() request: Request) {
		const cookie = request.cookies['jwt'];

		const data = await this.jwtService.verifyAsync(cookie);
		if (!data) {
			throw new UnauthorizedException();
		}

		const user = await this.appService.findOne({ id: data['id'] });
		if (!user) {
			throw new BadRequestException('User not found');
		}

		await this.appService.delete(user.id);
		return {
			message: 'Successfully deleted user',
		}
	}
}
