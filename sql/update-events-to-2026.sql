-- Run this to update existing events to dates after 15 Feb 2026
-- (Use if you already have data and don't want to reset the DB.)

USE TicketingDemo;
GO

UPDATE dbo.Events SET Title = 'Summer Music Festival 2026', EventDate = '2026-07-15 19:00:00' WHERE Id = 1;
UPDATE dbo.Events SET Title = 'Comedy Night Live',        EventDate = '2026-03-01 20:00:00' WHERE Id = 2;
UPDATE dbo.Events SET Title = 'Championship Final',       EventDate = '2026-08-20 15:00:00' WHERE Id = 3;
UPDATE dbo.Events SET Title = 'Rock Concert Series',      EventDate = '2026-09-10 18:00:00' WHERE Id = 4;
GO
