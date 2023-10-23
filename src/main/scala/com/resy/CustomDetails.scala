package com.resy

object  CustomDetails {
  // Your user profile Auth Token

  //Brandon F
  val auth_token: String = "eyJ0eXAiOiJKV1QiLCJhbGciOiJFUzI1NiJ9.eyJleHAiOjE2OTk2MjI2NDksInVpZCI6MjEwMDU0OSwiZ3QiOiJjb25zdW1lciIsImdzIjpbXSwibGFuZyI6ImVuLXVzIiwiZXh0cmEiOnsiZ3Vlc3RfaWQiOjEzMzAwMTQ2fX0.ABYHgSs9IIhSfcJrnLGU2mwca-k5-TElBzW5QPXF7VJ_qFUwJopnFbPln88I8QNrL9LtVWudH-4s_C3581lXvU2_ADCoT-y0xBQs_Nn3LLqMifsjxRg9epVdzLeCoVkrigIMtXcD7TV9cpMxzUvw-S2NeTI0ahM6rNfCBnpHGYcLwPsU"
  //Go to Resy - Open up Console and go run network requests - Search for "find" and go to headers and find the "X-Resy-Auth-Token:"
  // Your user profile API key. Always put in " "

  val api_key: String = "VbWk7s3L4KiK5fzlO7JD3Q5EYolJI7n5"
  // Called ResyAPI api_key="VbWk7s3L4KiK5fzlO7JD3Q5EYolJI7n5" in the code inspector
  //Find this info in find?lat in headers - Changes ~ once per month


  //TODO REMEMBER TO CHANGE ALL BELOW

  // RestaurantId where you want to make the reservation
  val venueId = "65452"

  // YYYY-MM-DD of reservation
  val pref_day = "2023-11-19"

  //indoor or outdoor etc. Should match the type exactly on the resy venue (case doesn't matter). Leave blank if you don't care or don't now
  val dining_type= ""
  //If you don't want a dining type just use ""

  // Seq of YYYY-MM-DD HH:MM:SS times of reservations in military time format in EST
  val pref_times = Seq(

    "2023-11-19 19:30:00",
    "2023-11-19 19:00:00",
    "2023-11-19 20:00:00",
    "2023-11-19 20:30:00",
    "2023-11-19 18:30:00",
    "2023-11-19 18:00:00"

  )

  // Size of party
  val partySize = "4"

  val hourOfDayToStartBooking = 12
  //in military time

  //TODO UP TO HERE
}


//El Rio Grande = 1740 // "Dining Room" - Used for testing - Always has available reservations
//L'Artusi = 25973 - 9 am - 14 days in advance - "Indoor Dining", "Outdoor Patio"
//Via Carota = 2567 - 10 am - 30 days in advance - "Indoor Dining Room"
//4 Charles Prime Rib = 834 - 9 am - 30 days in advance - "Dining Room", "Patio" - contact@nycprimerib.com - 212-561-5992
//Carbone = 6194 - 10 am - 30 days in advance - "Indoor Dining", "Amex Patio", "Outdoor Dining"
//Don Angie = 1505 - 9 am - 6 days in advance - "Indoor Table", "Cabin Outdoor"
//Dame = 34341 - 12 pm - 3 weeks in advance - "Outdoor", "Counter", "High Top w Backless Stools", "Booth" - Closed Sat and Sunday/Walk ins Only on Monday - Largest Table is a Table of 8
//Una Pizza Napoletna = 6066 - 8?? or 9?? - 14 days in advance - "Dining Room"
//The Four Horsemen = 2492 - 7 am - 30 days in advance - "Dining Room"
//Bonnie's = 54591 - 10 am - 13 days in advance - "Indoor"
//Raoul's = 7241 - 12 am - 7 days in advance - "Indoor"
//Laser Wolf = 58848 - 10 am - 21 days out - "Dining Room" - Tables up to 8
//The Nine's = 7490 - 14 days in advance - "Dinner"
//Wenwen = 59536 - 12 am - 14 days in advance - "Dining"
//Rezdora = 5771 - "Indoor Dining"
//Peak = 10087 - 9 am - 21 days in advance - "Dining Room"
//iSodi = 443 - 12 am - 13 days in Advance - "Dining Room", "Sidewalk"
//Ernestos = 6588 - 12 am - 14 days in advance - "Dining Room"
//Lillia = 418 - 30 days in advance - "Indoor", "Piazza"
//Frenchette = 1946 - 30 days in adcance - "Dining Room"
//Misi = 2015 = 28 days in advance - "Dining Room"
//Semma = 1263 - 12 am - 30 days in advance - "Dining Room"
//Dhamaka = 48994 - 12 am - 30 days in advance - "Indoor"
//Cafe Spagetti = 59220 - 10 am - 14 days in advance - "Dining Room", "Backyard" - Sal Lamboglia Cell - 917-400-9498
//Monkey Bar = 60058 - 9 am - 14 days in advance - "Dining"
//Double Chicken Please = 42534 - 12 am - 6 days in advance - “Bar”, "Booth"
//Torrisi = 64593 - 10 am - 30 days in advance - "Dining Room", "Bar Room", "Bar Table"
//Tatiana = 65452 = 28 days in advance at 12 ET
//AMEX Centurion Lounge = 66930 - 9 am - 30 days in advance
//Blue Box Cafe = 70161 = 12 am - 30 days in advance - "Dining Room"

//To find new ID, inspect and go to network tab, find?lat and take response into JSON viewer


//"2022-06-18 19:30:00",
//"2022-06-18 19:00:00",
//"2022-06-18 20:00:00",
//"2022-06-18 18:30:00",
//"2022-06-18 20:30:00",
//"2022-06-18 18:00:00",
//"2022-06-18 21:00:00",
//"2022-06-18 17:30:00"