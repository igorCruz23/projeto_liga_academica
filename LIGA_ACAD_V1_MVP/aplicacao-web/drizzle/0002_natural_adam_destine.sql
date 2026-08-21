ALTER TABLE `financialEntries` MODIFY COLUMN `financial_entry_type` enum('receita','custo_producao','custo_fixo','custo_variavel','despesa_administrativa','imposto','deducao') NOT NULL;--> statement-breakpoint
ALTER TABLE `financialEntries` ADD `activity` varchar(120) DEFAULT 'Não informada' NOT NULL;--> statement-breakpoint
ALTER TABLE `financialEntries` ADD `dueOn` date;--> statement-breakpoint
ALTER TABLE `financialEntries` ADD `financial_settlement_status` enum('liquidado','pendente') DEFAULT 'liquidado' NOT NULL;--> statement-breakpoint
ALTER TABLE `financialEntries` ADD `settledOn` date;--> statement-breakpoint
CREATE INDEX `financial_entries_property_activity_date_idx` ON `financialEntries` (`propertyId`,`activity`,`occurredOn`);--> statement-breakpoint
CREATE INDEX `financial_entries_property_status_idx` ON `financialEntries` (`propertyId`,`financial_settlement_status`);