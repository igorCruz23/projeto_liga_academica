CREATE TABLE `usuarioPropriedade` (
	`userCpf` varchar(11) NOT NULL,
	`propertyId` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `usuario_propriedade_pk` PRIMARY KEY(`userCpf`,`propertyId`)
);
--> statement-breakpoint
CREATE TABLE `usuarios` (
	`cpf` varchar(11) NOT NULL,
	`name` varchar(160) NOT NULL,
	`user_sex` enum('feminino','masculino','outro','nao_informar') NOT NULL DEFAULT 'nao_informar',
	`createdById` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `usuarios_cpf` PRIMARY KEY(`cpf`)
);
--> statement-breakpoint
ALTER TABLE `usuarioPropriedade` ADD CONSTRAINT `usuario_propriedade_cpf_fk` FOREIGN KEY (`userCpf`) REFERENCES `usuarios`(`cpf`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `usuarioPropriedade` ADD CONSTRAINT `usuario_propriedade_property_fk` FOREIGN KEY (`propertyId`) REFERENCES `ruralProperties`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `usuario_propriedade_property_idx` ON `usuarioPropriedade` (`propertyId`);--> statement-breakpoint
CREATE INDEX `usuarios_creator_idx` ON `usuarios` (`createdById`);