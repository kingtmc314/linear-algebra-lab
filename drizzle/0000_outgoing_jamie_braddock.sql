CREATE TABLE `knowledge_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`topicId` int NOT NULL,
	`titleZh` varchar(256) NOT NULL,
	`titleEn` varchar(256) NOT NULL,
	`formula` text,
	`descriptionZh` text,
	`descriptionEn` text,
	`exampleZh` text,
	`exampleEn` text,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `knowledge_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `knowledge_topics` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(64) NOT NULL,
	`titleZh` varchar(128) NOT NULL,
	`titleEn` varchar(128) NOT NULL,
	`sortOrder` int NOT NULL DEFAULT 0,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `knowledge_topics_id` PRIMARY KEY(`id`),
	CONSTRAINT `knowledge_topics_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `teacher_documents` (
	`id` int AUTO_INCREMENT NOT NULL,
	`titleZh` varchar(256) NOT NULL,
	`titleEn` varchar(256) NOT NULL,
	`category` enum('notes','syllabus','worksheet','other') NOT NULL DEFAULT 'notes',
	`filename` varchar(256) NOT NULL,
	`mimeType` varchar(128) NOT NULL,
	`fileSize` bigint NOT NULL,
	`storageKey` varchar(512) NOT NULL,
	`storageUrl` varchar(1024) NOT NULL,
	`descriptionZh` text,
	`descriptionEn` text,
	`uploadedBy` int NOT NULL,
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	CONSTRAINT `teacher_documents_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` int AUTO_INCREMENT NOT NULL,
	`openId` varchar(64) NOT NULL,
	`name` text,
	`email` varchar(320),
	`loginMethod` varchar(64),
	`role` enum('user','admin') NOT NULL DEFAULT 'user',
	`createdAt` timestamp NOT NULL DEFAULT (now()),
	`updatedAt` timestamp NOT NULL DEFAULT (now()) ON UPDATE CURRENT_TIMESTAMP,
	`lastSignedIn` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_openId_unique` UNIQUE(`openId`)
);
