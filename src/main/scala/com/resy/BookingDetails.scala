package com.resy

import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import java.time._
import java.util.TimeZone
import scala.concurrent.duration._

final case class Venue(
  id: String,
  hourOfDayToStartBooking: Int = 0,
  advance: FiniteDuration = 7.days,
  diningTypes: List[String] = List.empty,
  info: Option[String] = None,
  timeZone: TimeZone = TimeZone.getTimeZone("EST")
)

final case class Preference(
  time: LocalTime,
  diningType: Option[String] = None
)

final case class BookingDetails(
  authToken: String,
  apiKey: String,
  venue: Venue,
  date: LocalDate,
  preferences: List[Preference],
  partySize: String,
  retryTimeout: FiniteDuration,
  wakeAdjustment: FiniteDuration
) {

  val day: String = date.format(DateTimeFormatter.ISO_DATE)

  def bookingWindowStart(leadTime: FiniteDuration): ZonedDateTime =
    date
      .atStartOfDay(venue.timeZone.toZoneId)
      .minus(leadTime.toDays, ChronoUnit.DAYS)
      .plusHours(venue.hourOfDayToStartBooking)

  def inBookingWindow(leadTime: FiniteDuration): Boolean =
    bookingWindowStart(leadTime).toLocalDateTime.isBefore(LocalDateTime.now())

  def secondsToBookingWindowStart(leadTime: FiniteDuration): FiniteDuration =
    (bookingWindowStart(leadTime).toEpochSecond - LocalDateTime
      .now()
      .toEpochSecond(ZoneOffset.UTC)).seconds
}
