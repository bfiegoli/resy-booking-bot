# resy-booking-bot
## Introduction
This is a reservation booking bot designed to snipe reservations from resy.com using the Resy API.  New
reservations become available at designated times by each restaurant on the platform. Some will post publiclly when the reservations open, while others will require a little bit more research. When running the bot, it will sleep
until the specified time of the reservation release, and wake up to try to snipe a reservation.  The bot will attempt to grab a reservation for a couple of seconds
and shutdown, outputting whether is it was or wasn't successful in getting a reservation.

## Configuration
There are a number of steps required to get the bot up and running. Given that the bot is written in Scala you will need Scala installed on your computer. Download the package from https://www.scala-lang.org/download/. You will also need an IDE. The recommended on eis IntelliJ Community Edition, and can be installed from https://www.jetbrains.com/idea/download/?section=mac.

Once you have cloned this repository, installed Scala and IntelliJ you should set up the run configuration. At the top of your screen click on "Run" and then select "Edit Configuration". Create a new Application that you name "Resy Booking Bot". Click the dropdown under build and run and select a version of Java. If you do not have Java installed you will need to download it from the Java website. In the line under that enter "com.resy.ResyBookingBot". It should auto fill. Save your configuration. Your bot will now be ready to actually execute once the proper information is added. 

## Usage
In order to get the bot to run you need to provide a few values prior to execution. These values are located in the CustomDetails object.
There are comments above the variables with what needs to be provided before it can be used but I'll list it here as well for clarity.
* auth_token - Your user profile Auth Token when logging into Resy.  This can be found when logging into Resy if you have the web console open. More details inside on how to find.
* api_key - Your user profile API key.  Can also be found when logging into Resy if you have the web console open.
* venueId - The id of the restaurant you want to make the reservation at. Can be found when viewing available reservations for a restaurant if you have the web console open.
* day - The day you want to make the reservation in YYYY-MM-DD format.  Ideally this should be set to the day after the last available day with restaurant reservations.
* dining_type - This is the specific type of seating you want. There is no Resy standard, so check on each restaurant. Sometimes they say "Indoor", other times "Dining Room". If the restaurant has no reservations available it can be particulatly hard to find this information. You may need to wait until you run the bot once, or twice to see some request responses and extract this information
* times - List of times in priority order in the format HH:MM:SS
* partySize - Size of the party

Once you have entered the correct information for your desired reservation you can select "Run". The bot will compile and sleep dormant in the background until it is time to run. If your computer shuts off, or goes to sleep this will interupt the run, so make sure your settings are configured appropriatly. Once the bot runs you will either get your reservation, or you will see it show an error code. Since this is not a science, an error is not always terrible. The response may give you information such as the restaurant did not release any tables. It may tell you that you used the wrong dining location. It is a good idea to perform a test run before the day you want that reservation if you have never booked at that restaurent before so that you can confirm dining locations.  
