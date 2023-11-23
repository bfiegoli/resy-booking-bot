package com.resy

import akka.actor.ActorSystem
import com.resy.BookReservationWorkflow._
import com.typesafe.scalalogging.StrictLogging
import org.apache.commons.lang3.time.DurationFormatUtils
import play.api.libs.json._
import pureconfig._
import pureconfig.generic.auto._

import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.duration._
import scala.concurrent.{Await, Future, TimeoutException}
import scala.util.{Failure, Success, Try}

object ResyBookingBot extends App with StrictLogging {

  implicit private val config: BookingDetails =
    ConfigSource.default.at("booking-details").loadOrThrow[BookingDetails]

  logger.info(s"Starting Resy Booking Bot with config: $config")

  private val system = ActorSystem()

  private def bookReservationWorkflow(): Unit = {
    logger.info(s"Attempting to snipe reservation")

    val result: Future[Option[String]] = for {
      findResResp    <- retryFindReservation
      resDetailsResp <- getReservationDetails(findResResp)
      bookResResp    <- bookReservation(resDetailsResp)
    } yield {
      val bookDetails = Json.parse(bookResResp)
      logger.info(s"Booking Response: $bookDetails")
      (bookDetails \\ "reservation_id").headOption.map(_.toString)
    }

    Try(Await.result(result, config.retryTimeout)) match {
      case Failure(_: TimeoutException) =>
        logger.error(s"Failed to snipe - Retry period exceeded")
      case Failure(f: ReservationAlreadyMade) =>
        logger.error(s"Failed to snipe - Reservation already in place! On ${f.date} at ${f.time} id: ${f.id}")
      case Failure(t) =>
        logger.error(s"Failed to snipe - ${t.getMessage}", t)
      case Success(Some(token)) =>
        logger.info(s"Successfully sniped reservation")
        logger.info(s"ReservationId: $token")
      case Success(None) =>
        logger.info("Failed to snipe - reservation already exists?")
    }

    logger.info("Shutting down Resy Booking Bot")

    ResyApiWrapper.shutdown()

    System.exit(0)
  }

  val futLeadTime: Future[Int] = for {
    venueDetails <- ResyApiWrapper.execute(ApiDetails.Config, Map("venue_id" -> config.venue.id))
    lt <- Future.successful((Json.parse(venueDetails) \ "lead_time_in_days").as[Int])
  } yield lt

  val leadTime = Await.result(futLeadTime, config.retryTimeout)

  if(leadTime.days != config.venue.advance) {
    logger.warn("Please be aware - the venue's lead time for bookings differs to the local configuration!")
    logger.warn(s"You probably want to amend when you start trying to book")
    logger.warn(s"Resy says: ${leadTime.days}")
    logger.warn(s"Config says: ${config.venue}")
  }

  if (config.inBookingWindow(leadTime)) {
    logger.info("Within booking window for venue - attempting immediate reservation")
    bookReservationWorkflow()
  } else {
    val durationToSleep: FiniteDuration = config.secondsToBookingWindowStart(leadTime) - config.wakeAdjustment
    logger.info(s"Booking window is ${leadTime.days} - bringing us to: ${config.bookingWindowStart(leadTime)}")
    logger.info(s"Sleeping for ${DurationFormatUtils.formatDuration(durationToSleep.toMillis, "d' days 'HH:mm:ss")}")
    system.scheduler.scheduleOnce(durationToSleep)(bookReservationWorkflow())
  }
}
