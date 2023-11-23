# resy-booking-bot
## Introduction
This is a reservation booking bot designed to snipe reservations from resy.com using the Resy API.  New
reservations become available at midnight everyday, 30 days from the current date.  When running the bot, it will sleep
until midnight and wake up to try to snipe a reservation.  It will attempt to grab a reservation for a couple of seconds
and shutdown, outputting whether is it was or wasn't successful in getting a reservation.

## Usage

Configuration for a bot run is supplied in the `src/main/resources/application.conf` file.

The fields are as follows:

`booking-details`
---
  Main configuration section

  `auth-token`: Grabs the auth token from an environment variable `API_KEY` - pass this in at runtime.

  `retry-timeout`: Period the bot will attempt to make a reservation for.

  `api-key`: This is the Resy API key and can be extracted from calls on the website.
  It changes relatively infrequently.

  `date`: The date on which you intend to make your booking

  `party-size`: Number of people being booked for

  `venue`: A reference to one of the defined venues in this file. This uses `${venue."<<name>>"}` syntax
  (please note the quoting to correctly reference venue names with punctuation or spaces)

  `preferences`: An ordered collection of `time`s and `dining-type`s that you want to attempt to book.
  These will be matched in order of their definition. Omitting the `dining-type` will infer that you
  don't have a preference of type and will select whatever is available at that time.

`venues`
---
  A list of all venues that you potentially want to book for.
  Each entry should have a name uniquely identifying it. These are configured as the human readable
  venue names for ease of configuration.

  `id`: Resy's internal Id for the venue

  `name`: The name of the venue

  `advance`: How far in advance you can make bookings for this venue (informational only - the bot will verify advance booking windows)

  `hour-of-day-to-start-booking`: Hour at which new bookings are released (0 = midnight)

  `dining-types`: List of supported dining-types (NB: this isn't validated and is for general information when setting your preferences)

  `info`: Any other human readable info about the venue (Not used by the bot)

The main entry point of the bot is in ResyBookingBot under the main function.  Upon running the bot, it will
evaluate your `application.conf` file and determine if the booking date is open for a reservation. 
If the reservation window is not et open, the system will evaluate how long it needs to sleep before attempting to snipe.
Upon waking, the bot will attempt to secure a reservation for a period of 10 seconds to cover any variation in release times.
When times are retrieved, it will try to find the best available time slot given your priority list of reservation times.  
If a time can be booked, it will make an attempt to snipe it.
Otherwise it will report that it was unable to acquire a reservation.  
In the event it was unable to get any reservations for 10 seconds, the bot will automatically shutdown.