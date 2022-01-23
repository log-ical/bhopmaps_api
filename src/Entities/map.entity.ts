import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryColumn,
	UpdateDateColumn,
} from 'typeorm';

@Entity('maps')
export class Map {
	@PrimaryColumn({ unique: true })
	public id: string;

	@Column({ default: null })
	public author: string;

	@Column({ default: null })
	public authorId: string;

	@Column({ default: null })
	public mapName: string;

	@Column({ default: null })
	public thumbnail: string;

	@Column('varchar', { default: null, length: 500 })
	public description: string;

	@Column({ default: 0 })
	public downloads: number;

	@Column({ default: 'css' })
	public gameType: string;

	@CreateDateColumn()
	public createdAt: Date;

	@UpdateDateColumn()
	public updatedAt: Date;
}
