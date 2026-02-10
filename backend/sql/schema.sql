-- Ticketing platform: Venues, Events, Tickets
USE TicketingDemo;
GO

-- Venues (where events happen)
IF OBJECT_ID('dbo.Venues', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Venues (
    Id       INT IDENTITY(1,1) PRIMARY KEY,
    Name     NVARCHAR(200) NOT NULL,
    City     NVARCHAR(100),
    Capacity INT
  );
END
GO

-- Events (concerts, games, shows)
IF OBJECT_ID('dbo.Events', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Events (
    Id        INT IDENTITY(1,1) PRIMARY KEY,
    VenueId   INT NOT NULL,
    Title     NVARCHAR(300) NOT NULL,
    EventDate DATETIME2 NOT NULL,
    Status    NVARCHAR(20) DEFAULT 'OnSale',
    CONSTRAINT FK_Events_Venue FOREIGN KEY (VenueId) REFERENCES dbo.Venues(Id)
  );
  CREATE INDEX IX_Events_VenueId ON dbo.Events(VenueId);
  CREATE INDEX IX_Events_EventDate ON dbo.Events(EventDate);
END
GO

-- Tickets (bookings for an event)
IF OBJECT_ID('dbo.Tickets', 'U') IS NULL
BEGIN
  CREATE TABLE dbo.Tickets (
    Id           INT IDENTITY(1,1) PRIMARY KEY,
    EventId      INT NOT NULL,
    CustomerName NVARCHAR(200),
    Quantity     INT NOT NULL DEFAULT 1,
    Total        DECIMAL(10,2) NOT NULL,
    CONSTRAINT FK_Tickets_Event FOREIGN KEY (EventId) REFERENCES dbo.Events(Id)
  );
  CREATE INDEX IX_Tickets_EventId ON dbo.Tickets(EventId);
END
GO
