package com.resy

import java.time.{LocalDate, LocalDateTime, LocalTime, ZoneOffset}
import java.time.format.DateTimeFormatter
import java.time.temporal.ChronoUnit
import scala.concurrent.duration._

final case class Venue(
  id: String,
  hourOfDayToStartBooking: Int,
  advance: FiniteDuration,
  diningTypes: List[String],
  info: Option[String]
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
                                 retryTimeout: FiniteDuration
) {

  val day: String = date.format(DateTimeFormatter.ISO_DATE)

  def bookingWindowStart(leadTime: Int): LocalDateTime =
    date.minus(leadTime, ChronoUnit.DAYS)
      .atStartOfDay()
      .plusHours(venue.hourOfDayToStartBooking)

  def inBookingWindow(leadTime: Int): Boolean = bookingWindowStart(leadTime).isBefore(LocalDateTime.now())

  def minutesToBookingWindowStart(leadTime: Int): FiniteDuration =
    (bookingWindowStart(leadTime).toEpochSecond(ZoneOffset.UTC) - LocalDateTime.now().toEpochSecond(ZoneOffset.UTC)).seconds.toMinutes.minutes
}
