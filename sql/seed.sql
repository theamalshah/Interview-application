USE TicketingDemo;
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Venues)
BEGIN
  SET IDENTITY_INSERT dbo.Venues ON;
  INSERT INTO dbo.Venues (Id, Name, City, Capacity) VALUES
    (1, 'Grand Arena', 'London', 20000),
    (2, 'Riverside Theatre', 'Manchester', 1200),
    (3, 'Stadium North', 'Glasgow', 52000);
  SET IDENTITY_INSERT dbo.Venues OFF;
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Events)
BEGIN
  SET IDENTITY_INSERT dbo.Events ON;
  INSERT INTO dbo.Events (Id, VenueId, Title, EventDate, Status) VALUES
    (1, 1, 'Summer Music Festival 2026', '2026-07-15 19:00:00', 'OnSale'),
    (2, 2, 'Comedy Night Live', '2026-03-01 20:00:00', 'OnSale'),
    (3, 1, 'Championship Final', '2026-08-20 15:00:00', 'OnSale'),
    (4, 3, 'Rock Concert Series', '2026-09-10 18:00:00', 'OnSale');
  SET IDENTITY_INSERT dbo.Events OFF;
END
GO

IF NOT EXISTS (SELECT 1 FROM dbo.Tickets)
BEGIN
  INSERT INTO dbo.Tickets (EventId, CustomerName, Quantity, Total) VALUES
    (1, 'Alex Smith', 2, 149.98),
    (1, 'Jordan Lee', 1, 74.99),
    (2, 'Sam Taylor', 4, 180.00);
END
GO
