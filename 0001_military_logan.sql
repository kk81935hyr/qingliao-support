CREATE TABLE `support_conversations` (
	`id` int AUTO_INCREMENT NOT NULL,
	`visitorToken` varchar(64) NOT NULL,
	`visitorLabel` varchar(48) NOT NULL,
	`status` enum('open','closed') NOT NULL DEFAULT 'open',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`lastMessageAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `support_conversations_id` PRIMARY KEY(`id`),
	CONSTRAINT `support_conversations_visitorToken_unique` UNIQUE(`visitorToken`)
);
--> statement-breakpoint
CREATE TABLE `support_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`conversationId` int NOT NULL,
	`sender` enum('visitor','agent') NOT NULL,
	`body` text,
	`imageUrl` varchar(1024),
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `support_messages_id` PRIMARY KEY(`id`)
);
