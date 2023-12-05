package com.resy

import com.typesafe.scalalogging.StrictLogging
import play.api.libs.json.{JsArray, JsValue, Json}

import java.time.LocalDateTime
import scala.concurrent.ExecutionContext.Implicits.global
import scala.concurrent.Future
import scala.concurrent.duration._
import scala.util.chaining.scalaUtilChainingOps

class BookReservationWorkflow(apiClient: ResyApiWrapper) extends StrictLogging {

  def getReservationDetails(
    configId: String
  )(implicit bookingDetails: BookingDetails): Future[String] = {
    val findResQueryParams = Map(
      "config_id"  -> configId,
      "day"        -> bookingDetails.day,
      "party_size" -> bookingDetails.partySize
    )

    apiClient.execute(ApiDetails.ReservationDetails, findResQueryParams)
  }

  def bookReservation(
    resDetailsResp: String
  )(implicit bookingDetails: BookingDetails): Future[String] = {
    val resDetails = Json.parse(resDetailsResp)
    logger.info(s"URL Response: $resDetailsResp")

    val paymentMethodId: Option[(String, String)] =
      (resDetails \ "user" \ "payment_methods" \ 0 \ "id").toOption.map { v =>
        "struct_payment_method" -> s"""{"id":${v.toString()}}"""
      }

    logger.info(s"Payment Method Id: $paymentMethodId")

    val bookToken =
      (resDetails \ "book_token" \ "value").get.toString
        .replaceAll("\"", "")

    logger.info(s"Book Token: $bookToken")

    val bookResQueryParams = Map(
      "book_token" -> bookToken,
      "source_id"  -> "resy.com-venue-details"
    ) ++ paymentMethodId.toSeq

    apiClient.execute(ApiDetails.BookReservation, bookResQueryParams)
  }

  def retryFindReservation()(implicit bookingDetails: BookingDetails): Future[String] = {
    findReservation
      .map { findResResp =>
        logger.info(s"Find Reservation Response: $findResResp")

        (Json.parse(findResResp) \ "results" \ "venues" \ 0 \ "slots")
          .as[JsArray]
          .value
          .toSeq
          .pipe(findReservationTime)
      }
      .flatMap {
        case Some(result) => Future.successful(result)
        case None         => retryFindReservation()
      }
      .recoverWith { _ =>
        retryFindReservation()
      }
  }

  def getLeadTime()(implicit bookingDetails: BookingDetails): Future[FiniteDuration] = {
    for {
      venueDetails <- apiClient.execute(
        ApiDetails.Config,
        Map("venue_id" -> bookingDetails.venue.id)
      )
      lt <- Future.successful((Json.parse(venueDetails) \ "lead_time_in_days").as[Int].days)
    } yield {
      lt.tap { leadTime =>
        if (leadTime != bookingDetails.venue.advance) {
          logger.warn(
            s"""Please be aware - the venue's lead time for bookings differs to the local configuration!
               |  You probably want to review when you start trying to book?
               |  Resy says: $leadTime
               |  Config says: ${bookingDetails.venue.advance}""".stripMargin
          )
        }
      }
    }
  }

  private[this] def findReservation()(implicit bookingDetails: BookingDetails): Future[String] = {
    logger.info("Attempting to find reservation slot")

    val findResQueryParams = Map(
      "day"        -> bookingDetails.day,
      "lat"        -> "0",
      "long"       -> "0",
      "party_size" -> bookingDetails.partySize,
      "venue_id"   -> bookingDetails.venue.id
    )

    apiClient.execute(ApiDetails.FindReservation, findResQueryParams)
  }

  private[this] def findReservationTime(
    reservationTimes: Seq[JsValue]
  )(implicit bookingDetails: BookingDetails): Option[String] = {
    reservationTimes
      .tap(_ => logger.info("Attempting to find reservation time from prefs"))
      .map { v =>
        Slot(
          (v \ "date" \ "start").as[LocalDateTime],
          (v \ "config" \ "type").asOpt[String],
          (v \ "config" \ "token").asOpt[String]
        )
      }
      .tap(listBookingTypes)
      .filter(s =>
        bookingDetails.preferences.contains(s.asPreference) || bookingDetails.preferences.contains(
          s.asPreference.copy(diningType = None)
        )
      )
      .map(_.token)
      .head
      .tap(v => logger.info(s"Config Id: $v"))
  }

  private def listBookingTypes: Seq[Slot] => Unit = { slots =>
    logger.info(
      slots.flatMap(_.diningType).distinct.mkString("Distinct dining-types: [\"", "\", \"", "\"]")
    )
  }
}

object BookReservationWorkflow extends BookReservationWorkflow(ResyApiWrapper)
