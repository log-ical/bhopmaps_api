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
	UploadedFile,
	UseInterceptors,
} from '@nestjs/common';
import { AppService } from './app.service';
import * as bcrypt from 'bcrypt';
import { nanoid } from 'nanoid';
import { JwtService } from '@nestjs/jwt';
import { Response, Request } from 'express';
import { UpdateUserDto } from './Dto/update-user.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { Express } from 'express';

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
		};
	}

	@Post('map/new')
	@UseInterceptors(FileInterceptor('file'))
	async addMap(
		@Req() request: Request,
		@Body('mapName') mapName: string,
		@Body('description') description: string,
		@Body('thumbnail') thumbnail: string,
		@UploadedFile() file: Express.Multer.File,
	) {
		if (mapName.length < 5) {
			throw new BadRequestException(
				'Map name must be at least 3 characters long',
			);
		}

		if (mapName === null || description === null || thumbnail === null) {
			return new BadRequestException('Missing required fields');
		}

		if (description.length > 300) {
			return new BadRequestException(
				'Description can only be 300 characters long',
			);
		}

		if (!request.cookies['jwt']) {
			throw new UnauthorizedException(
				'You must be logged in to create a map',
			);
		}
		// get user body information
		const cookie = request.cookies['jwt'];

		const data = await this.jwtService.verifyAsync(cookie);
		if (!data) {
			throw new UnauthorizedException();
		}

		const user = await this.appService.findOne({ id: data['id'] });
		if (!user) {
			throw new BadRequestException('User not found');
		}

		const dataBuffer = {
			author: user.username,
			authorId: user.id,
			mapName,
			thumbnail,
			description,
			download: file.destination,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const map: any = await this.appService.uploadFile(file.buffer, mapName);

		await this.appService.addMap(
			map.id.replace('.zip', ''),
			user.username,
			user.id,
			dataBuffer.mapName,
			dataBuffer.thumbnail,
			dataBuffer.description,
			map,
			map.download,
		);

		return {
			message: 'Successfully uploaded map',
		};

		// get file information
	}

	@Post('map/:id/delete')
	async deleteMap(@Param('id') id: string, @Req() request: Request) {
		const cookie = request.cookies['jwt'];

		const data = await this.jwtService.verifyAsync(cookie);
		if (!data) {
			throw new UnauthorizedException();
		}

		const map = await this.appService.findMap(id);

		if (data['id'] !== map.authorId) {
			return new UnauthorizedException();
		}

		await this.appService.deleteMap(`${map.id}`);

		return {
			message: 'Successfully deleted map',
		};
	}

	@Get('maps')
	async findAll(): Promise<any> {
		return await this.appService.getAllMaps();
	}
}
