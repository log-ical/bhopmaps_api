import {
	BadRequestException,
	Body,
	Controller,
	Delete,
	Get,
	Header,
	Param,
	Post,
	Put,
	Req,
	Res,
	StreamableFile,
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
import { Stream } from 'stream';
import { createReadStream, read } from 'fs';
import { join } from 'path/posix';

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
				'https://bhopmaps.s3.eu-central-1.amazonaws.com/default_avatar/default_avatar.png?response-content-disposition=inline&X-Amz-Security-Token=IQoJb3JpZ2luX2VjEAEaDGV1LWNlbnRyYWwtMSJGMEQCIFlOfXgOpsC00CRYA0GKH8YkqKIgTasBuftvTHf4SaOnAiBHZ2OThDs3K4%2BUOJrSronaH7uzx4Vm8qibP267wFitvSrkAggqEAAaDDUwNDc4MTU2NjA2MiIM5itSmWExKckF0HWgKsECy0TtJ1tW%2BJCrScE1h%2FZfg%2B2SSsIuApoJ01uJWtuQ%2BVoOEXR%2Bkwn2gZzgeEm9qy5w2qKJd26qGFp0l7lzg%2FZaX0DPLcwbo3z6MG5IFdK90d9ZjUonq2eWhGVyeuTo0seK451Jrmasg%2BzdEL2C3aTIPka2PClIOZWhUBRTePWP0hsE2GMFzZszVLQUCjcGjGdnJzKEoMyE5QIZAjh3VQKk7S3EW93l%2FQDUgGuf1sBer85OYH6EJmHmGBg2iLErO9AABdVY9L0GkzKFXqtZ229dGprlHFM4QrjUNIxxAhFs1gnuz2nKCLW85H5pWsLBUQRwdHlDVTXrp2XQ8VJ4jKOp5svw%2Fl0ehpSQ41ctv7RLMyqqKAI3BbV65ZPtwlrGkK10vyqZOr%2FT6sQx76CERmXwRo5t86pltUrkTViou3Y%2Bj1F9ML7sqY8GOrQCPVdX8S2JdGPvqV5xHT%2F%2Bv2OPvxYkzZ8nMXU%2ByvB0DzSLe6sNvUfm3VFGBbKN0CES7WMFfz6iTKUe6CwQCW4nrwu2Cq5jjwjXIz2%2BWpir1Rze3jZ0Q5JpnHDZ7uMvU8YQNhBLXp7Bs%2FggPnMhUehGXRMk7%2FgM7h91zVjnPgme4ydD%2Bzoo6LvQZIXE1K54BNulNXRSwDsX6AXdZK3yluqh%2F5TRSJ4pE2O5%2BZHXXoJWzShV5pZK4C61%2BoFrrJw4%2F187HqjaMbEnNh7l1ntHWSMdFJytFRN3FlxUe7IIQT%2BlUvJUEKT61NXOtLhu0vggSpQ7Pks6w5Ejit4umZFucxGFSEJS0lUdGImmjmVPu5O3zFaEvT4nr4TB9prZ4VqxZ3ghYcTeHmAGIZXhgWyCt6TrNnK6TlA%3D&X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Date=20220121T190353Z&X-Amz-SignedHeaders=host&X-Amz-Expires=300&X-Amz-Credential=ASIAXLB2TOBXLRSWY5L7%2F20220121%2Feu-central-1%2Fs3%2Faws4_request&X-Amz-Signature=0b69a81006409e3d2bb63067c5b3c31de8872b46f9096700cd436d1b74cca304',
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

		const { passwordHash, ...userData } = user;

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
		@UploadedFile() file: Express.Multer.File,
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

		if (description.length > 300) {
			throw new BadRequestException({
				message: 'Description can only be 300 characters long',
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

	// @Get('map/:id/download')
	// async getFile(
	// 	@Res({ passthrough: true }) res,
	// 	@Param('id') id: string,
	// ): Promise<StreamableFile> {
	// 	const file = await this.appService.downloadFile(id);
	// 	const readStream = createReadStream(join(process.cwd()));
	// 	return new StreamableFile(readStream);
	// }

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
