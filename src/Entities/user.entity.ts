import {
	Column,
	CreateDateColumn,
	Entity,
	PrimaryColumn,
	UpdateDateColumn,
} from 'typeorm';

@Entity('users')
export class User {
	@PrimaryColumn({ unique: true })
	id: string;

	@Column()
	username: string;

	@Column()
	passwordHash: string;

	@Column('varchar', { length: 500 })
	avatar: string;

	@Column({ default: false })
	isBeta: boolean;

	@CreateDateColumn()
	createdAt: Date;

	@UpdateDateColumn()
	updatedAt: Date;
}
