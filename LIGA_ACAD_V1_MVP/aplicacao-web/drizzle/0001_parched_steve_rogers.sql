CREATE TABLE `financialEntries` (
	`id` int AUTO_INCREMENT NOT NULL,
	`propertyId` int NOT NULL,
	`createdById` int NOT NULL,
	`financial_entry_type` enum('receita','custo_producao','despesa_administrativa','imposto','deducao') NOT NULL,
	`category` varchar(100) NOT NULL,
	`description` text NOT NULL,
	`occurredOn` date NOT NULL,
	`amount` decimal(14,2) NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `financialEntries_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `ruralProperties` (
	`id` int AUTO_INCREMENT NOT NULL,
	`ownerId` int NOT NULL,
	`name` varchar(140) NOT NULL,
	`municipality` varchar(100),
	`state` varchar(2),
	`totalArea` decimal(12,2),
	`mainActivity` varchar(120),
	`description` text,
	`isActive` boolean NOT NULL DEFAULT true,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `ruralProperties_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `userProfiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`userId` int NOT NULL,
	`user_profile_role` enum('produtor','gestor','estudante','consultor','administrador') NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `userProfiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `userProfiles_userId_unique` UNIQUE(`userId`)
);
--> statement-breakpoint
CREATE INDEX `financial_entries_property_date_idx` ON `financialEntries` (`propertyId`,`occurredOn`);--> statement-breakpoint
CREATE INDEX `financial_entries_creator_idx` ON `financialEntries` (`createdById`);--> statement-breakpoint
CREATE INDEX `rural_properties_owner_idx` ON `ruralProperties` (`ownerId`);--> statement-breakpoint
CREATE INDEX `user_profiles_role_idx` ON `userProfiles` (`user_profile_role`);