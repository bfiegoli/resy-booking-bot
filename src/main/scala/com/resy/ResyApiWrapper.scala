package com.resy

import akka.actor.ActorSystem
import com.typesafe.scalalogging.StrictLogging
import play.api.libs.json.Json
import play.api.libs.ws.WSResponse
import play.api.libs.ws.ahc.{AhcCurlRequestLogger, AhcWSClient}

import java.util.UUID
import scala.concurrent.{ExecutionContextExecutor, Future}
import scala.util.chaining.scalaUtilChainingOps

object ResyApiWrapper extends StrictLogging {
  implicit private val system: ActorSystem                  = ActorSystem()
  implicit private val dispatcher: ExecutionContextExecutor = system.dispatcher

  private val ws = AhcWSClient()

  def shutdown(): Unit = ws.close()

  val commonHeaders: BookingDetails => Seq[Tuple2[String, String]] = details =>
    Seq(
      "Authorization"     -> s"""ResyAPI api_key="${details.apiKey}"""",
      "user-agent"        -> s"Mozilla/5.0 ${UUID.randomUUID().toString}",
      "dnt"               -> "1",
      "X-Resy-Auth-Token" -> details.authToken,
      "referer"           -> "https://widgets.resy.com/",
      "origin"            -> "https://widgets.resy.com/"
    )

  val responseHandler: WSResponse => String = {
    case resp if resp.status < 400  =>
      logger.debug(resp.body)
      resp.body
    case resp if resp.status == 412 =>
      throw ReservationAlreadyMade(resp.body)
    case resp =>
      logger.error(s"HTTP ERROR: ${resp.status}: ${resp.body}")
      throw new Exception(resp.statusText)
  }

  def execute(apiDetails: ApiDetails, queryParams: Map[String, String] = Map.empty)(implicit details: BookingDetails): Future[String] = {
    ws.url(apiDetails.url)
      .withRequestFilter(AhcCurlRequestLogger())
      .addHttpHeaders(commonHeaders(details): _*)
      .withMethod(apiDetails.method)
      .pipe { req =>
        (apiDetails.method, apiDetails.contentType) match {
          case ("GET", _) =>
            req.withQueryStringParameters(queryParams.toSeq:_*)
          case ("POST", "application/x-www-form-urlencoded") =>
            req
              .addHttpHeaders("Content-Type" -> apiDetails.contentType)
              .withBody(queryParams)
          case ("POST", contentType) =>
            req
              .addHttpHeaders("Content-Type" -> contentType)
              .withBody(Json.stringify(Json.toJson(queryParams)))
        }
      }
      .execute()
      .map(responseHandler)
  }
}
