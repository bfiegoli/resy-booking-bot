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
  val venueId = "58848"

  // YYYY-MM-DD of reservation
  val pref_day = "2023-11-13"

  //indoor or outdoor etc. Should match the type exactly on the resy venue (case doesn't matter). Leave blank if you don't care or don't now
  val dining_type= "Dining Room"
  //If you don't want a dining type just use ""

  // Seq of YYYY-MM-DD HH:MM:SS times of reservations in military time format in EST
  val pref_times = Seq(

    "2023-11-13 19:30:00",
    "2023-11-13 19:00:00",
    "2023-11-13 20:00:00",
    "2023-11-13 20:30:00",
    "2023-11-13 18:30:00",
    "2023-11-13 18:00:00"

  )

  // Size of party
  val partySize = "4"

  val hourOfDayToStartBooking = 10
  //in military time

  //TODO UP TO HERE
}


//L'Artusi = 25973    //9 am - 14 days in advance, "Indoor Dining", "Outdoor Patio"
//Via Carota = 2567    // 10 am - 30 days in advance "Indoor Dining Room"
//4 Charles Prime Rib = 834 //9 am - "Dining Room", "Patio" 30 days in advance - contact@nycprimerib.com - 212-561-5992
//Carbone = 6194 //10 am - 30 days in advance, "Indoor Dining", "Amex Patio", "Outdoor Dining"
//Don Angie = 1505 //9 am - 6 days, "Indoor Table", "Cabin Outdoor"
//Dame = 34341  //12 pm / 3 Weeks Out - Closed Sat and Sunday/Walk ins Only on Monday - Largest Table is a Table of 8, "Outdoor", "Counter", "High Top w Backless Stools", "Booth"
//Una Pizza Napoletna = 6066 //8?? or 9?? - 14 days in advance I think, "Dining Room"
//The Four Horsemen = 2492 // "Dining Room" - 30 days in advance at 7 AM
//Bonnie's = 54591 // 13 days in advance at 10 AM "Dining Room", but as of 10/22 seems to just be "Dining"
//Raoul's = 7241 // 7 Days in Advance (12 AM) "Indoor"
//El Rio Grande = 1740 // "Dining Room"
//Laser Wolf = 58848 // "Dining Room" 21 days out, tables up to 8 - Reservations open at 10 AM EST
//The Nine's = 7490 // "Dinner" 14 days out
//Wenwen = 59536 // "Dining" 14 days out at midnight
//Rezdora = 5771 // "Indoor Dining"
//Peak = 10087 // "Dining Room" 21 days out 9 AM
//iSodi = 443 // 13 days in Advance// 12 AM// "Dining Room" and "Sidewalk"
//Ernestos = 6588 // "Dining Room" 14 days out at Midnight
//Lillia = 418 // "Indoor", "Piazza" 30 days out at
//Frenchette = 1946 // "Dining Room" 30 days out
//Misi = 2015 // "Dining Room" 28 days out
//Semma = 1263 // "Dining Room" 30 days out 12 AM// "Dining Room"
//Dhamaka = 48994 // "Indoor" 12 AM 30 days in advance
//Rich Table - San Francisco = 5785 // "Indoor Dining" 30 days in advance 12 AM PST (3 AM EST)
//Cafe Spagetti = 59220 // "Dining Room", "Backyard" 10 AM 14 days in advance - Sal Lamboglia Cell - 917-400-9498
//Monkey Bar = 60058 // "Dining" - 9 AM EST - 14 days out
//Double Chicken Please = 42534 // “Bar”, "Booth" // 12 AM - 6 Days Out
//Torrisi = 64593 // "Dining Room" // "Bar Room" // "Bar Table" - 30 days out at 10 AM ET
//Centurion Lounge = 30 days out at 9 AM
//Tatiana = 65452 = 28 days in advance at 12 ET
//Blue Box Cafe = 70161 = 30 days out at 12 ET // "Dining Room"

//To find new ID, inspect and go to network tab, find?lat and take response into JSON viewer


//"2022-06-18 19:30:00",
//"2022-06-18 19:00:00",
//"2022-06-18 20:00:00",
//"2022-06-18 18:30:00",
//"2022-06-18 20:30:00",
//"2022-06-18 18:00:00",
//"2022-06-18 21:00:00",
//"2022-06-18 17:30:00"