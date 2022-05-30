package com.resy

object BookingDetails {
  // Your user profile Auth Token
  val auth_token: String = CustomDetails.auth_token

  // Your user profile API key
  val api_key: String = CustomDetails.api_key

  // RestaurantId where you want to make the reservation
  val venueId: String = CustomDetails.venueId

  // YYYY-MM-DD of reservation
  val day: String = CustomDetails.pref_day

  //indoor or outdoor etc. Should match the type exactly on the resy venue (case doesn't matter). Leave blank if you don't care or don't now
  val dining_type: String = CustomDetails.dining_type

  // Seq of YYYY-MM-DD HH:MM:SS times of reservations in military time format
  val times: Seq[String] = CustomDetails.pref_times

  // Size of party
  val partySize: String = CustomDetails.partySize

  //Hour of Day to Wake Up the Bot and start searching - In Military Time: 0-23
  val hourOfDayToStartBooking: Int = CustomDetails.hourOfDayToStartBooking
}
