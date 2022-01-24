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
	UseGuards,
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
import { AuthGuard } from '@nestjs/passport';
import { SkipThrottle } from '@nestjs/throttler';

@Controller('api')
export class AppController {
	constructor(
		private readonly appService: AppService,
		private jwtService: JwtService,
	) {}

	@Post('register')
	@UseGuards(AuthGuard('api-key'))
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
			isBeta: true,
			betaKey: process.env.API_KEY,
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

		response.cookie('jwt', jwt, { sameSite: 'none', secure: true });

		return {
			message: 'Successfully logged in',
		};
	}

	@Get('user')
	@SkipThrottle()
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

		const { betaKey, passwordHash, ...userData } = user;

		return {
			userData,
		};
	}

	@Get('map/:id')
	async getMap(@Param('id') id: string) {
		const map = await this.appService.findeOneByMapId(id);
		if (!map) {
			throw new BadRequestException('Map not found');
		}

		return {
			map,
		};
	}

	@Get('map/author/:authorId')
	async getMapsfromAuthor(@Param('authorId') authorId: string) {
		const maps = await this.appService.findAllMapsByAuthor(authorId);
		if (!maps) {
			throw new BadRequestException('Author not found or no maps');
		}

		return maps;
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

		// Update map
		const maps = await this.appService.findAllMapsByAuthor(user.id);

		for (const map of maps) {
			await this.appService.updateMapAuthor(map.id, data.username);
		}

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
		@Body('gameType') gameType: string,
		@UploadedFile() file: Express.Multer.File,
		@UploadedFile() thumbnailFile: Express.Multer.File,
	) {
		if (mapName.length < 5) {
			throw new BadRequestException({
				message: 'Map name must be at least 5 characters long',
			});
		}

		if (mapName === null || description === null || thumbnail === null) {
			throw new BadRequestException({
				message: 'Map name, description and thumbnail are required',
			});
		}

		if (description.length > 1000) {
			throw new BadRequestException({
				message: 'Description can only be 1000 characters long',
			});
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
			throw new UnauthorizedException({
				message: 'User not found',
			});
		}

		const dataBuffer = {
			author: user.username,
			authorId: user.id,
			mapName,
			thumbnail,
			description,
			download: file.destination,
			mapType: gameType,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		const map: any = await this.appService.uploadFile(file.buffer, mapName);
		const thumbnailImage: any = await this.appService.uploadThumbnail(map.id.replace('.zip', ''), thumbnailFile.destination);	

		await this.appService.addMap(
			map.id.replace('.zip', ''),
			user.username,
			user.id,
			dataBuffer.mapName,
			thumbnailImage || dataBuffer.thumbnail,
			dataBuffer.description,
			map,
			dataBuffer.mapType,
		);

		return {
			message: 'Successfully uploaded map',
		};
	}

	@Put('map/:id/download')
	@UseGuards(AuthGuard('api-key'))
	async downloadMap(
		@Param('id') id: string,
		@Res() res: Response,
	): Promise<any> {
		const map = await this.appService.findMap(id);
		if (!map) {
			throw new BadRequestException('Map not found');
		}

		const key = `${map.id}.zip`;
		const file = await this.appService.downloadMap(key);
		// Increment download count
		await this.appService.incrementDownload(id);

		res.send({
			url: file.url,
			status: 200,
			message: 'Successfully downloaded map',
			download: map.downloads,
		});
	}

	// Incremenet map downloads

	@Post('map/:id/delete')
	async deleteMap(@Param('id') id: string, @Req() request: Request) {
		const cookie = request.cookies['jwt'];

		const data = await this.jwtService.verifyAsync(cookie);
		if (!data) {
			return new UnauthorizedException();
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
