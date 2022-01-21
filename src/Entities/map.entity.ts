import { Column, CreateDateColumn, Entity, ManyToMany, PrimaryColumn, UpdateDateColumn } from "typeorm";

@Entity('maps')
export class Map {
    @PrimaryColumn({unique: true})
    public id: string;

    @Column({default: null})
    public author: string

    @Column({default: null})
    authorId: string

    @Column({default: null})
    public mapName: string;

    @Column({default: null})
    public thumbnail: string;

    @Column({default: null})
    public description: string;

    @Column({default: null})
    public download: string;

    @CreateDateColumn()
    public createdAt: Date;
    
    @UpdateDateColumn()
    public updatedAt: Date;
}