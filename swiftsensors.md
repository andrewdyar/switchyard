API Documentation
This document is for developers looking to integrate the Swift Sensors service into a custom webapp or a mobile app. API endpoints adhere to a RESTful structure for communication between a client and the Swift Sensors Cloud servers.
API Documentation
Introduction
About This Document
Terminology
Authentication and Authorization
Foundation
Tree
Hardware Tree
Hardware Group
Sensor Tree
Sensor Group
Accounts
Account
Collectors
Collectors
Collector
Collector Provisioning
Collector WiFi Networks
Devices
Devices
Device
Device Provisioning
Disabled Device
Sensors
Sensor
Sensor Conversions
Sensor Thresholds
Notifications
Sensor Notifications
Complex Notifications
Hardware Notifications
Test Notification
Notification Associations
Sensor --> Sensor Notifications
Sensor Notification --> Sensors
Sensor --> Complex Notifications
Complex Notification --> Sensors
Hardware --> Hardware Notifications
Hardware Notification --> Hardware
Time Series
Time Series Data
Users
User
User Profile
Brand
Brand Info
Brand Logo
Other
Photo Image
Export
Eagle Eye Networks
Dashboards
Tags
Error Codes
Deprecated
Deprecated API Endpoints
About This Document
API URL Templates and Host Names
This documentation contains URLs that point to the production SwiftSensors environment:

https://api.swiftsensors.net
            
Each URL may contain one or more "template parameters" like "{accountId}" or "{collectorId}". These are placeholders that must be replaced with the appropriate ID for the account and object that is being requested. The applicable IDs can be found by extracting data from other request responses. The Error Codes section near the end of this document explains all possible error codes that may be returned.
Terminology
Term Differences
The terms used for some entities in this API documentation have been changed on the official Swift Sensors Console to be more user-friendly. When this document refers to Collectors, Devices, and Sensors, the Console refers to these same entities as Gateways, Sensors, and Measurements, respectively. To eliminate confusion, the following is a definition of terms (Console equivalents are shown in parentheses in blue):
Definition of Terms
Account
The root-level container for all hardware, users, and other items that are billed together. An account can have subaccounts, and those subaccounts can have their own subaccounts, and so on.
Brand
Designed for resellers who prefer to operate using their own brand, each account can be branded with a custom service name and logo visible to all Users of the account and all subaccounts. There are two versions of the logo, optimized for mobile and desktop devices.
Collector (Gateway)
A grid-powered Swift Sensors Hardware component used to download Sensor data from nearby Devices using RF or Bluetooth and to upload it to the Swift Sensors Cloud via Ethernet, WiFi, or Cellular.
Complex Notification (Composite Alert)
A set of rules that define when, how, and to whom a notification is sent when notification criteria is met for multiple sensors at the same time. Complex Notifications are useful when users want a combination of several sensors to act together to trigger a notification. To provide flexibility, notification criteria can be set to either abnormal or normal threshold status for each attached sensor, and up to four sensors can be attached to each complex notification. Optionally, each notification can have Silent or Active Periods that define times of the day and days of the week when the notification should be enabled or disabled. Finally, each notification is associated with one or more users to receive the notification using up to three delivery methods.
Conversion
A reusable mathematical formula applied to some Measurements that report raw electric current or resistance but measure a different property such as temperature. This formula is usually defined by entering the input range and units and output range and units. The Swift Sensors server calculates the appropriate linear conversion formula.
Dashboard
A custom page with a collection of ordered data panels, configured by the User. Some panels provide data about one Measurement. Other panels aggregate, summarize, or filter data about all Measurements in a specific container. A container can be an account, a Hardware Group, a Sensor Group, a Collector, or a Device.
Device (Sensor)
A battery-powered Swift Sensors Hardware component used to measure physical properties using one or more onboard Sensors and to send this data to a nearby Collector via RF or Bluetooth.
Hardware
Physical components provided by Swift Sensors, such as Collectors and Devices.
Hardware Group
An optional container for one or more Collectors and/or Hardware Groups. Used in the Hardware Tree to organize physical assets into a location hierarchy and to provide threshold status aggregation.
Hardware Notification (Hardware Alert)
A set of rules that define when, how, and to whom a notification is sent when Hardware goes offline or is low on battery. Each Notification is associated with one or more Collectors and/or Devices to act as a trigger. Each Notification is also associated with one or more Users to receive the Notification using up to three delivery methods.
Hardware Tree (Hardware List)
A hierarchical representation of all Hardware for an account, optionally organized into nested Hardware Groups. Connected Devices are shown beneath each Collector. When the "Show Measurements" option is enabled, Sensors are also shown beneath each Device.
Photo
Hardware, Hardware Groups, and Sensor Groups can be associated with a custom photo to help identify a particular Collector, Device or location.
Sensor (Measurement)
An electrical instrument mounted on a Device designed to measure a physical property continuously or at regular intervals. Multiple Sensors may be installed on a single Device. Each Sensor can be assigned one Threshold to act as a trigger for one or more Sensor Notifications.
Sensor Group (Measurement Group)
An optional container for one or more Sensors and/or Sensor Groups. Used in the Sensor Tree to organize Sensors into a logical hierarchy and to provide threshold status aggregation.
Sensor Notification (Measurement Alert)
A set of rules that define when, how, and to whom a notification is sent when a Sensor's Threshold status becomes abnormal. Each Notification is associated with one or more Sensors with a Threshold to act as a trigger. Optionally, each notification can have Silent or Active Periods that define times of the day and days of the week when the notification should be enabled or disabled. Finally, each Notification is associated with one or more Users to receive the Notification using up to three delivery methods.
Sensor Tree (Measurement List)
A hierarchical representation of all Sensors for an account, optionally organized into nested Sensor Groups.
Subaccount
A child account of a parent account. An account can have multiple subaccounts, which can also have subaccounts, which can also have subaccounts, and so on.
Swift Sensors Cloud
A collection of Swift Sensors servers designed to efficiently store and retrieve Swift Sensors data.
Threshold
A collection of up to four abnormal operating range boundaries that define the normal and abnormal operating range of Sensors of a specific property. A threshold can be assigned to one or more measurements of the same property.
User
A person with access to data in at least one account. Users with Multi-Account roles may have access to data in subaccounts of their account, with various levels of control, depending on their Role. Each user can be subscribed to one or more Sensor Notifications and/or Hardware Notifications defined on the same account.
Authentication and Authorization
API Key
The SwiftServer Web Client API requires that every API request to the server has the "X-API-Key" header containing the valid API key for the account. This key will be validated with the sign-in process pairing the authorization token with the API key. Failure to add the API key to the sign-in request will result in a 400 (BAD REQUEST) response with an internal error code of 9997 indicating a mismatched API key. Other error codes include 9998 indicating API quota has been exceeded or 9999 indicating an invalid API key was used.
**If your account does not already have an API key, please contact Swift Sensors Support (support@swiftsensors.com)

X-API-Key: SAMPLE_API_KEY
        
Authorization Header with Token
The SwiftServer Web Client API also requires that every request to the server, except as noted, has an "Authorization" header containing a valid bearer token. The token can be retrieved from the "sign-in" endpoint. Once a token is received from the server, simply add the header to requests to the SwiftServer Web Client API. The format is "Authorization: {token_type} {access_token}" replacing "{token_type}" and "{access_token}" JSON properties received from the sign-in response. When no token is present or the provided token expires, the server will return a 403 (FORBIDDEN) response. In this case a new access token must be obtained.

Authorization: Bearer SAMPLE_TOKEN
        
Specifying the Account ID
For most requests, the SwiftServer Web Client API also requires the account ID as part of the URL. In those cases, {accountId} should be replaced with the account_id, which can be retrieved from the "sign-in" endpoint.

https://api.swiftsensors.net/api/client/v1/accounts/{accountId}...
        
Sign In (POST)
"Authorization" header containing a valid bearer token is not required with this request.
This endpoint follows a traditional authentication pattern where the credentials are submitted and the response contains the result. The language parameter is optional and when specified it will change the selected language of the user after successfully being authenticated.

Request URL: https://api.swiftsensors.net/api/client/v1/sign-in
Request Method: POST
Content-Type: application/json
Request Body:
{
    "email": "email@clientapp.com",
    "password": "abc12345",
    "language": "en" // sending null means do not change the user's language
}

Response Status: 200 (OK)
Response Body:
{
    "access_token": "ABC",
    "expires_in": 86400,
    "token_type": "Bearer",
    "refresh_token": "XYZ",
    "account_id": ".12345."
}
        
Refresh Token (POST)
Provides a valid authorization token from the refresh token provided on the previous token. Avoids re-authentication to receive a new token.

Request URL: https://api.swiftsensors.net/api/token/v2/refresh
Request Method: POST
Content-Type: text/plain
Request Body: YZX

Response Status: 200 (OK)
Response Body:
{
    "access_token": "ABC",
    "expires_in": 86400,
    "token_type": "Bearer",
    "refresh_token": "XYZ"
}
        
Foundation
Server Info (GET)
"Authorization" header containing a valid bearer token is not required with this request.
Provides relevant server information related to the specific machine being accessed.

Request URL: https://api.swiftsensors.net/api/client/v1/server-info
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    "serverVersion": "20170421123018  0000000000000000000000000000000000000000",
    "webappVersion": "20170421123018  0000000000000000000000000000000000000000"
}
        
Static Types (GET)
"Authorization" header containing a valid bearer token is not required with this request.
Get the static information about properties, unit types, and conversion formulas.

Request URL: https://api.swiftsensors.net/api/client/v1/statictypes
Request Method: GET

Request Body: None
Response Body:
{
    "properties": [
        { "id": 1, "name": "Temperature", "storedTypeId": 2 },
        { "id": 2, "name": "Humidity", "storedTypeId": 4 },
        { "id": 3, "name": "Vibration", "storedTypeId": 5 },
        { "id": 4, "name": "Speed", "storedTypeId": 11 },
        { "id": 5, "name": "Door", "storedTypeId": 17 },
        { "id": 6, "name": "Electric Current", "storedTypeId": 12 },
        { "id": 7, "name": "Electric Potential (DC)", "storedTypeId": 14 },
        { "id": 8, "name": "Electric Resistance", "storedTypeId": 15 },
        { "id": 9, "name": "Angle", "storedTypeId": 16 },
        { "id": 10, "name": "Water Presence", "storedTypeId": 18 },
        { "id": 11, "name": "Contact", "storedTypeId": 19 },
        { "id": 12, "name": "Activity", "storedTypeId": 20 },
        { "id": 13, "name": "Voltage Presence", "storedTypeId": 21 },
        { "id": 14, "name": "Button", "storedTypeId": 22 },
        { "id": 15, "name": "Pressure", "storedTypeId": 23 },
        { "id": 16, "name": "Volume Flow", "storedTypeId": 27 },
        { "id": 17, "name": "Distance", "storedTypeId": 30 },
        { "id": 18, "name": "Concentration", "storedTypeId": 34 },
        { "id": 19, "name": "Motor", "storedTypeId": 35 },
        { "id": 20, "name": "Quantity", "storedTypeId": 36 },
        { "id": 21, "name": "Force", "storedTypeId": 37 },
        { "id": 22, "name": "Illuminance", "storedTypeId": 39 },
        { "id": 23, "name": "Siren", "storedTypeId": 40 },
        { "id": 24, "name": "Rotation", "storedTypeId": 41 },
        { "id": 25, "name": "Sound Pressure Level", "storedTypeId": 43 },
        { "id": 26, "name": "Mass","storedTypeId": 44 },
        { "id": 27, "name": "Value", "storedTypeId": 48 },
        { "id": 28, "name": "Volume", "storedTypeId": 55 },
        { "id": 29, "name": "Electric Potential (AC)", "storedTypeId": 57 },
        { "id": 30, "name": "Power", "storedTypeId": 61 },
        { "id": 31, "name": "Soil Moisture", "storedTypeId": 62 },
        { "id": 32, "name": "Count", "storedTypeId": 70 },
        { "id": 33, "name": "Air Quality", "storedTypeId": 68 },
        { "id": 34, "name": "Density", "storedTypeId": 71 }
    ],
    "units": [
        { "id": 1, "name": "Fahrenheit", "propertyId": 1, "abbrev": "°F", "defaultPrecision": 1, "cat": "Scalar" },
        { "id": 2, "name": "Celsius", "propertyId": 1, "abbrev": "°C", "defaultPrecision": 1, "cat": "Scalar" },
        { "id": 3, "name": "Kelvin", "propertyId": 1, "abbrev": "°K", "defaultPrecision": 1, "cat": "Scalar" },
        { "id": 4, "name": "Relative humidity", "propertyId": 2, "abbrev": "%", "defaultPrecision": 0, "cat": "Scalar" },
        { "id": 5, "name": "Standard gravity", "propertyId": 3, "abbrev": "g", "defaultPrecision": 2, "cat": "Scalar" },
        { "id": 6, "name": "Meters per second²", "propertyId": 3, "abbrev": "m/s²", "defaultPrecision": 1, "cat": "Scalar" },
        { "id": 7, "name": "Feet per second²", "propertyId": 3, "abbrev": "ft/s²", "defaultPrecision": 1, "cat": "Scalar" },
        { "id": 8, "name": "Knots", "propertyId": 4, "abbrev": "kn", "defaultPrecision": 1, "cat": "Scalar" },
        { "id": 9, "name": "Kilometers per hour", "propertyId": 4, "abbrev": "kph", "defaultPrecision": 0, "cat": "Scalar" },
        { "id": 10, "name": "Miles per hour", "propertyId": 4, "abbrev": "mph", "defaultPrecision": 0, "cat": "Scalar" },
        { "id": 11, "name": "Meters per second", "propertyId": 4, "abbrev": "m/s", "defaultPrecision": 1, "cat": "Scalar" },
        { "id": 12, "name": "Amps", "propertyId": 6, "abbrev": "A", "defaultPrecision": 3, "cat": "Scalar" },
        { "id": 13, "name": "Milliamps", "propertyId": 6, "abbrev": "mA", "defaultPrecision": 2, "cat": "Scalar" },
        { "id": 14, "name": "Volts", "propertyId": 7, "abbrev": "V", "defaultPrecision": 3, "cat": "Scalar" },
        { "id": 15, "name": "Ohms", "propertyId": 8, "abbrev": "Ω", "defaultPrecision": 1, "cat": "Scalar" },
        { "id": 16, "name": "Degrees", "propertyId": 9, "abbrev": "°", "defaultPrecision": 2, "cat": "Scalar" },
        { "id": 17, "name": "Open/Closed", "propertyId": 5, "abbrev": "", "defaultPrecision": 0, "valuesEnum": "Open,Closed", "cat": "Binary" },
        { "id": 18, "name": "Yes/No", "propertyId": 10, "abbrev": "", "defaultPrecision": 0, "valuesEnum": "No,Yes", "cat": "Binary" },
        { "id": 19, "name": "Yes/No", "propertyId": 11, "abbrev": "", "defaultPrecision": 0, "valuesEnum": "No,Yes", "cat": "Binary" },
        { "id": 20, "name": "Yes/No", "propertyId": 12, "abbrev": "", "defaultPrecision": 0, "valuesEnum": "No,Yes", "cat": "Binary" },
        { "id": 21, "name": "Yes/No", "propertyId": 13, "abbrev": "", "defaultPrecision": 0, "valuesEnum": "No,Yes", "cat": "Binary" },
        { "id": 22, "name": "On/Off", "propertyId": 14, "abbrev": "", "defaultPrecision": 0, "valuesEnum": "Off,On", "cat": "Binary" },
        { "id": 23, "name": "Pascals", "propertyId": 15, "abbrev": "Pa", "defaultPrecision": 0, "cat": "Scalar" },
        { "id": 24, "name": "Pounds per inch²", "propertyId": 15, "abbrev": "psi", "defaultPrecision": 1, "cat": "Scalar" },
        { "id": 25, "name": "Bar", "propertyId": 15, "abbrev": "bar", "defaultPrecision": 2, "cat": "Scalar" },
        { "id": 26, "name": "Feet³ per second", "propertyId": 16, "abbrev": "ft³/s", "defaultPrecision": 2, "cat": "Scalar" },
        { "id": 27, "name": "Meter³ per second", "propertyId": 16, "abbrev": "m³/s", "defaultPrecision": 2, "cat": "Scalar" },
        { "id": 28, "name": "Gallons per minute", "propertyId": 16, "abbrev": "gal/m", "defaultPrecision": 2, "cat": "Scalar" },
        { "id": 29, "name": "Kilopascals", "propertyId": 15, "abbrev": "kPa", "defaultPrecision": 2, "cat": "Scalar" },
        { "id": 30, "name": "Meters", "propertyId": 17, "abbrev": "m", "defaultPrecision": 2, "cat": "Scalar" },
        { "id": 31, "name": "Centimeters", "propertyId": 17, "abbrev": "cm", "defaultPrecision": 2, "cat": "Scalar" },
        { "id": 32, "name": "Feet", "propertyId": 17, "abbrev": "ft", "defaultPrecision": 2, "cat": "Scalar" },
        { "id": 33, "name": "Inches", "propertyId": 17, "abbrev": "in", "defaultPrecision": 2, "cat": "Scalar" },
        { "id": 34, "name": "Parts Per Million", "propertyId": 18, "abbrev": "ppm", "defaultPrecision": 0, "cat": "Scalar" },
        { "id": 35, "name": "Predictive Failure", "propertyId": 19, "abbrev": "", "defaultPrecision": 0, "valuesEnum": "Normal,Failure", "cat": "Binary" },
        { "id": 36, "name": "Number", "propertyId": 20, "abbrev": "", "defaultPrecision": 0, "cat": "Scalar" },
        { "id": 37, "name": "Newtons", "propertyId": 21, "abbrev": "N", "defaultPrecision": 2, "cat": "Scalar" },
        { "id": 38, "name": "Pound-Force", "propertyId": 21, "abbrev": "lbf", "defaultPrecision": 2, "cat": "Scalar" },
        { "id": 39, "name": "Lux", "propertyId": 22, "abbrev": "lx", "defaultPrecision": 0, "cat": "Scalar" },
        { "id": 40, "name": "On/Off", "propertyId": 23, "abbrev": "", "defaultPrecision": 0, "valuesEnum": "Off,On", "cat": "Binary" },
        { "id": 41, "name": "Rpm", "propertyId": 24, "abbrev": "rpm", "defaultPrecision": 0, "cat": "Scalar" },
        { "id": 42, "name": "Hectopascals", "propertyId": 15, "abbrev": "hPa", "defaultPrecision": 2, "cat": "Scalar" },
        { "id": 43, "name": "Decibels", "propertyId": 25, "abbrev": "dB", "defaultPrecision": 0, "cat": "Scalar" },
        { "id": 44, "name": "Grams", "propertyId": 26, "abbrev": "g", "defaultPrecision": 2, "cat": "Scalar" },
        { "id": 45, "name": "Kilogram", "propertyId": 26, "abbrev": "kg", "defaultPrecision": 2, "cat": "Scalar" },
        { "id": 46, "name": "Pounds", "propertyId": 26, "abbrev": "lb", "defaultPrecision": 2, "cat": "Scalar" },
        { "id": 47, "name": "Inches per second²", "propertyId": 3, "abbrev": "in/s²", "defaultPrecision": 1, "cat": "Scalar" },
        { "id": 48, "name": "Number", "propertyId": 27, "abbrev": "", "defaultPrecision": 0, "cat": "Scalar" },
        { "id": 49, "name": "Liter", "propertyId": 28, "abbrev": "l", "defaultPrecision": 1, "cat": "Scalar" },
        { "id": 50, "name": "Cubic Inches", "propertyId": 28, "abbrev": "in³", "defaultPrecision": 1, "cat": "Scalar" },
        { "id": 51, "name": "Quart", "propertyId": 28, "abbrev": "qt", "defaultPrecision": 1, "cat": "Scalar" },
        { "id": 52, "name": "Gallon US", "propertyId": 28, "abbrev": "gal(US)", "defaultPrecision": 1, "cat": "Scalar" },
        { "id": 53, "name": "Milliliter", "propertyId": 28, "abbrev": "ml", "defaultPrecision": 1, "cat": "Scalar" },
        { "id": 54, "name": "Cubic Feet", "propertyId": 28, "abbrev": "ft³", "defaultPrecision": 1, "cat": "Scalar" },
        { "id": 55, "name": "Cubic Meters", "propertyId": 28, "abbrev": "m³", "defaultPrecision": 1, "cat": "Scalar" },
        { "id": 56, "name": "Millimeters", "propertyId": 17, "abbrev": "mm", "defaultPrecision": 1, "cat": "Scalar" },
        { "id": 57, "name": "V RMS", "propertyId": 29, "abbrev": "Vrms", "defaultPrecision": 2, "cat": "Scalar" },
        { "id": 58, "name": "V Peak", "propertyId": 29, "abbrev": "Vpk", "defaultPrecision": 2, "cat": "Scalar" },
        { "id": 59, "name": "V P-P", "propertyId": 29, "abbrev": "Vpp", "defaultPrecision": 2, "cat": "Scalar" },
        { "id": 60, "name": "Meters per minute", "propertyId": 4, "abbrev": "m/min", "defaultPrecision": 1, "cat": "Scalar" },
        { "id": 61, "name": "Watts", "propertyId": 30, "abbrev": "W", "defaultPrecision": 2, "cat": "Scalar" },
        { "id": 62, "name": "Percent", "propertyId": 31, "abbrev": "%", "defaultPrecision": 0, "cat": "Scalar" },
        { "id": 63, "name": "Off/On", "propertyId": 11, "abbrev": "", "defaultPrecision": 0, "valuesEnum": "Off,On", "cat": "Binary" },
        { "id": 64, "name": "Open/Closed", "propertyId": 11, "abbrev": "", "defaultPrecision": 0, "valuesEnum": "Open,Closed", "cat": "Binary" },
        { "id": 65, "name": "Stopped/Running", "propertyId": 11, "abbrev": "", "defaultPrecision": 0, "valuesEnum": "Stopped,Running", "cat": "Binary" },
        { "id": 66, "name": "Dry/Wet", "propertyId": 10, "abbrev": "", "defaultPrecision": 0, "valuesEnum": "Dry,Wet", "cat": "Binary" },
        { "id": 67, "name": "Percent", "propertyId": 27, "abbrev": "%", "defaultPrecision": 0, "cat": "Scalar" },
        { "id": 68, "name": "Index", "propertyId": 33, "abbrev": "", "defaultPrecision": 0, "cat": "Scalar" },
        { "id": 69, "name": "Parts per billion", "propertyId": 18, "abbrev": "ppb", "defaultPrecision": 0, "cat": "Scalar" },
        { "id": 70, "name": "Count", "propertyId": 32, "abbrev": "", "defaultPrecision": 0, "cat": "Scalar" },
        { "id": 71, "name": "Milligrams per meter³", "propertyId": 34, "abbrev": "mg/m³", "defaultPrecision": 3, "cat": "Scalar" },
        { "id": 72, "name": "Micrograms per meter³", "propertyId": 34, "abbrev": "µg/m³", "defaultPrecision": 1, "cat": "Scalar" },
        { "id": 73, "name": "Feet per second", "propertyId": 4, "abbrev": "fps", "defaultPrecision": 1, "cat": "Scalar" },
        { "id": 74, "name": "Feet per minute", "propertyId": 4, "abbrev": "fpm", "defaultPrecision": 0, "cat": "Scalar" },
        { "id": 75, "name": "Score", "propertyId": 33, "abbrev": "%", "defaultPrecision": 0, "cat": "Scalar" },
        { "id": 76, "name": "Decibels", "propertyId": 25, "abbrev": "dB", "defaultPrecision": 0, "cat": "Event" },
        { "id": 77, "name": "Liters per second", "propertyId": 16, "abbrev": "L/s", "defaultPrecision": 1, "cat": "Scalar" }
    ],
    "conversionFormulas": [
        { "id": 1, "name": "Linear", "formula": "Bx+A", "numberOfVariables": 2, "isInputBinary": false, "isOutputBinary": false },
        { "id": 2, "name": "Quadratic", "formula": "Cx²+Bx+A", "numberOfVariables": 3, "isInputBinary": false, "isOutputBinary": false },
        { "id": 3, "name": "Binary", "formula": "value >= A", "numberOfVariables": 1, "isInputBinary": false, "isOutputBinary": true },
        { "id": 4, "name": "Inverse", "formula": "0 <--> 1", "numberOfVariables": 0, "isInputBinary": true, "isOutputBinary": true },
        { "id": 5, "name": "Productivity", "formula": "Ax", "numberOfVariables": 1, "isInputBinary": false, "isOutputBinary": false },
        { "id": 6, "name": "NTC Table", "numberOfVariables": 0, "isInputBinary": false, "isOutputBinary": false }
    ],
    "conversionTemplates": [
        {
            "id": 1, "formulaId": 6, "name": "PT1000", "description": "PT1000 PTC Table",
            "defaultDisplayedUnitTypeId": 2, "inputUnitTypeId": 15, "outputUnitTypeId": 2,
            "inputRange": [ 663.15, 2843.03 ], "outputRange": [ -85.0, 510.0 ]
        },
        {
            "id": 2, "formulaId": 6, "name": "MA300TA103", "description": "MA300TA103 NTC Table",
            "defaultDisplayedUnitTypeId": 2, "inputUnitTypeId": 15, "outputUnitTypeId": 2,
            "inputRange": [ 3603.46, 32739.8 ], "outputRange": [ 50.0, 0.0 ]
        },
        {
            "id": 3, "formulaId": 6, "name": "GA10K4D25", "description": "GA10K4D25 NTC Table",
            "defaultDisplayedUnitTypeId": 2, "inputUnitTypeId": 15, "outputUnitTypeId": 2,
            "inputRange": [ 426.0, 239828.0 ], "outputRange": [ 125.0, -40.0 ]
        },
        {
            "id": 4, "formulaId": 6, "name": "JI-103C1R2", "description": "JI-103C1R2 NTC Table",
            "defaultDisplayedUnitTypeId": 2, "inputUnitTypeId": 15, "outputUnitTypeId": 2,
            "inputRange": [ 164.4, 333600.0 ], "outputRange": [ 155.0, -40.0 ]
        },
        {
            "id": 5, "formulaId": 6, "name": "NTCAIMME3C90373", "description": "NTCAIMME3C90373 NTC Table",
            "defaultDisplayedUnitTypeId": 2, "inputUnitTypeId": 15, "outputUnitTypeId": 2,
            "inputRange": [ 582.84, 32624.2 ], "outputRange": [ 105.0, 0.0 ]
        },
        {
            "id": 6, "formulaId": 6, "name": "PT100", "description": "PT100 PTC Table",
            "defaultDisplayedUnitTypeId": 2, "inputUnitTypeId": 15, "outputUnitTypeId": 2,
            "inputRange": [ 18.52, 247.09 ], "outputRange": [ -200.0, 400.0 ]
        }
    ]
}
        
Get Time Zones (GET)
"Authorization" header containing a valid bearer token is not required with this request.
Retrieves the list of supported time zones.

Request URL: https://api.swiftsensors.net/api/client/v1/time-zones
Request Method: GET

Response Status: 200 (OK)
Response Body:
[
    {
        "timeZoneId": "UTC",
        "regionId": "UTC",
        "locale": "Coordinated Universal Time",
        "abbreviation": "UTC",
        "offset": 0,
        "offsetDisplay": "+00:00",
        "observesDst": false,
        "offsetDst": 0
    },
    {
        "regionId": "Asia",
        "locale": "Asia",
        "nodes": [
            {
                "timeZoneId": "Asia/Gaza",
                "regionId": "Asia",
                "locale": "Gaza",
                "abbreviation": "EET",
                "offset": 120,
                "offsetDisplay": "+02:00",
                "observesDst": true,
                "offsetDst": 60
            },
            {
                "timeZoneId": "Asia/Makassar",
                "regionId": "Asia",
                "locale": "Makassar",
                "abbreviation": "WITA",
                "offset": 480,
                "offsetDisplay": "+08:00",
                "observesDst": false,
                "offsetDst": 0
            }
        ]
    }
]
        
Get Countries List (GET)
"Authorization" header containing a valid bearer token is not required with this request.
Get list of country codes for international phone numbers.

Request URL: https://api.swiftsensors.net/api/client/v1/countries
Request Method: GET

Response Status: 200 (OK)
Response Body:
[
    { "id": "US +1" }
]
        
Hardware Tree
Hardware Tree Map (GET) - V1
The hardware tree map structure adheres to the following rules:
Each object in the map has a key that combines the object type and the object id separated by an underscore delimiter. The key format is "t_id" where t can be "a" for account, "s" for sensor, "d" for device, "c" for collector and "g" for hardware group. For example, the key "c_123" represents a collector with id 123. Note that the account key has empty string for id, so "a_" is the account. Each object has a "parent" property with the key for the parent object, and a "children" property listing the keys for any direct child objects.
Account can contain zero-or-more groups, and zero or more collectors.
Group can contain zero-or-more collectors AND zero-or-more groups (enabling of nested groups).
Collector can contain zero-or-more devices.
Device can contain one-or-more sensors.
If (collector name==null) then isNew=true, name="SG3-1010N ({last 4 digits of guid})" example "SG3-1010N (51A8)".
If (device name==null) then isNew=true, name="SS3-105 ({last 5 digits of deviceMac})" example "SS3-105 (68:16)".
If (sensor description==null) then isNew=true.

For sensor tree nodes:
    unitId - displayUnitTypeId from the sensor table
    value - storedTypeId from property type retrieved from static types
    conversionId - specifies the conversion assigned to a sensor (property is absent if null)
    shiftScheduleId - specifies the shift schedule assigned to a sensor (property is absent if null)
    thresholdStatus - this enum specifies the current threshold status and is defined below.
        

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/treemap
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    "serverTime": 1516819450172,
    "lastTreeChangeTime": 1516750359,
    "lastSensorTreeChangeTime": 1516227618,
    "webappVersion": "1.0",
    "treeMap": {
        "a_": {
            "name": "Kraft",
            "timeZoneId": "America/Chicago",
            "children": [ "g_11", "c_22" ]
        },
        "g_11": {
            "name": "Building 1",
            "parent": "a_",
            "children": [ ]
        },
        "c_22": {
            "name": "SG3-1010N (25NA)",
            "isNew": true,                  // not sent if false
            "time": 1516819449,
            "timeZoneId": "America/Chicago",// not sent if null
            "latitude": 12.34535,           // not sent if null
            "longitude": 12.34535,          // not sent if null
            "parent": "a_",
            "children": [ "d_33" ],
            "hwId": "10:20:30:AB:EB:00",
            "Ip": "192.168.10.5"

        },
        "d_33": {
            "name": "Sensor (89:03)",
            "isNew": true, // not sent if false
            "time": 1516819439,
            "batteryLevel": 99,
            "latitude": 12.34535,           // not sent if null
            "longitude": 12.34535,          // not sent if null
            "parent": "c_22",
            "children": [ "s_44" ],
            "hwId": "10:20:30:AB:EB:00",
            "errorCode": 12,                // not sent if 0 (NONE) - see Device Error Codes in Device section
            "errorTime": 1516750359,        // not sent if errorCode is not sent - time when error started
        },
        "s_44": {
            "profileName": "Contact",
            "unitId": 19,
            "conversionId": 1,              // not sent if null
            "prodConversionId": 2,          // not sent if null
            "value": 1.0,
            "precision": 0,
            "time": 1516819439,
            "thresholdStatus": 0,
            "thresholdId": 1,               // not sent if null
            "lastNormalTime": 0,
            "isHidden": false,              // not sent if false
            "shiftScheduleId": 3,           // not sent if null
            "parent": "d_33"
        }
    }
}
        
Enum: thresholdStatus
This enum specifies the current threshold status of a sensor by comparing an online sensor's latest value against the threshold boundaries of the currently assigned threshold. The enum ordering allows the UI to sort the threshold statuses of multiple sensors in a group to find the sensor with the most severe threshold status. The parent group can then be color-coded based on the most severe status as a way to indicate to the user which groups contain sensors that require attention.

0 - NONE             // blue   - no threshold is currently assigned
1 - NORMAL           // green  - value is within normal operating range
2 - LOW_WARNING      // yellow - value is at or below the Low Warning boundary
3 - HIGH_WARNING     // yellow - value is at or above the High Warning boundary
4 - LOW_CRITICAL     // red    - value is at or below the Low Critical boundary
5 - HIGH_CRITICAL    // red    - value is at or above the High Critical boundary
        
Hardware Tree Update (GET)
As a supplemental request to the get tree request, retrieves a limited set of data for sensors and collectors. Returns a full list of sensors and their associated value, the time the value was received, threshold status, and the last time the sensor was in a "normal" threshold status. For collectors, the query will return only position enabled collectors where the last position time is more recent than the last time the tree was changed.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/treeupdate
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    "lastTreeChangeTime": 1234213434,
    "lastSensorTreeChangeTime": 1234213434,
    "serverTime": 1445961284000, //in milliseconds
    "webappVersion": "1.0",
    "sensorData": {
        "1000": [ 1445961284, 72.5, 1, 1445961284 ], // [time, value, thresholdStatus, lastNormalTime]
        "1001": [ 1445961284, 72.5, 2, 1445961284 ],
        "1002": [ 1445961284, 72.5, 3, 1445961284 ]
    }
}
        
Hardware Tree Changed (GET)
As a supplemental request to the get tree request, retrieves the last time the tree was changed for the account. Tree will change on events such as adding or removing collectors, devices, or groups.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/treechanged
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    "lastTreeChangeTime": 1234213434,
    "lastSensorTreeChangeTime": 1234213434
}
        
Get Hardware Updates (POST)
Retrieves updated information related to hardware specific data for devices and collectors.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/hardware/updates
Request Method: POST
Request Body:
{
    "collectorIds": [ 1, 2, 3, 4 ], // null=all collectors, []=no collectors, [1,2]=specific collectors
    "deviceIds": [ 1, 2, 3, 4 ]     // null=all devices,    []=no devices,    [1,2]=specific devices
}

Response Status: 200 (OK)
Response Body:
{
    "collectorsData": {
        "1": 1445961284,                            // "collectorId": lastContactTime
        "2": 1445961284,
        "3": null,                                  // null means no value is available
        "4": 1445961284
    },
    "devicesData": {
        "1": [ 100, 1445961284, 12, 1445961284 ],   // "deviceId": [ batteryLevel, lastContactTime, errorCode, errorTime ]
        "2": [ 33, 1445961284, 0, 0 ],
        "3": null,                                  // null means no value is available
        "4": [ 5, 1445961284, 0, 0 ]
    }
}
        
Hardware Group
Get Hardware Group (GET)
Gets the metadata associated to the specified group.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/groups/{groupId}
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    //Mandatory
    "id": 444,
    "accountId": ".1.",

    //Optional
    "parentGroupId": 2, // null or 0 if assigned to root
    "name": "Texas",
    "description": "Texas",
    "uploadedImageId": "https://s3-us-west-2.amazonaws.com/swift-images/non-guessable-unique-id.jpeg",
    "groupIds": [ 1, 2 ],
    "collectorIds": [ 3, 4 ]
}
        
Edit Hardware Group (POST)
Updates the metadata associated to the specified group.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/groups/{groupId}
Request Method: POST
Request Body:
{
    //Mandatory
    "id": 444,
    "accountId": ".1.",

    //Optional
    "parentGroupId": 2, // null or 0 indicates directly under account
    "name": "Texas",
    "description": "all the collectors and subgroups within Texas",
    "uploadedImageId": "https://s3-us-west-2.amazonaws.com/swift-images/non-guessable-unique-id.jpeg",
    "groupIds": [ 1, 2 ],
    "collectorIds": [ 3, 4 ]
}

Response Status: 200 (OK)
Response Body:
{
    "id": 444,
    "accountId": ".1.",
    "parentGroupId": 2, // null if directly under account
    "name": "Texas",
    "description": "all the collectors and subgroups within Texas",
    "uploadedImageId": "https://s3-us-west-2.amazonaws.com/swift-images/non-guessable-unique-id.jpeg",
    "groupIds": [ 1, 2 ],
    "collectorIds": [ 3, 4 ]
}
        
Add Hardware Group (POST)
Creates a new group for the specified account at the root level (if parentGroupId is null) or underneath the specified parent group

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/groups
Request Method: POST
Request Body:
{
    "id": 0,                    // or null
    "accountId": ".1.",
    "parentGroupId": 2,         // null or 0 will add it directly under the account
    "name": "Texas",
    "description": "all the collectors and subgroups within Texas"
}

Response Status: 200 (OK)
Response Body:
{
    "id": 4,
    "accountId": ".1.",
    "parentGroupId": 2,
    "name": "Texas",
    "description": "all the collectors and subgroups within Texas"
}
        
Delete Hardware Group (DELETE)
Deletes an empty group from the tree. If the group is not empty, the request will fail. Returns the id of the group that was deleted.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/groups/{groupId}
Request Method: DELETE

Response Status: 200 (OK)
Response Body: None
        
Sensor Tree
Sensor Tree Map (GET) - V1
The sensor tree map structure adheres to the following rules:
Each object in the map has a key that combines the object type and the object id separated by an underscore delimiter. The key format is "t_id" where t can be "a" for account, "s" for sensor, and "r" for sensor group. Sensor Tree Map has only account and sensor group items, but keys in the children list also reference sensors from the hardware tree. For example, the key "s_123" represents a sensor with id 123. Note that the account key has empty string for id, so "a_" is the account. Each object has a "parent" property with the key for the parent object, and a "children" property listing the keys for any direct child objects.
Account contains zero or more sensor groups and zero or more sensorIds.
Sensor group can contain zero-or-more sensorIds AND zero-or-more sensor groups (enabling of nested groups.)
        

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/sensortreemap
Request Method: GET

Response Status: 200 (OK)
Response Body:

{
    "lastSensorTreeChangeTime": 1516227618,
    "sensorTreeMap": {
        "a_": {
            "children": [ "r_11", "s_44" ]    // has sensor group and sensor typeIds
        },
        "r_11": {
            "name": "Sensor Group 1",
            "parent": "a_",
            "children": [ ]            // has sensor group and sensor typeIds
        }
    }
}
        
Sensor Group
Get Sensor Group (GET)
Gets the metadata associated to the specified sensor group.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/sensorgroups/{groupId}
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    "id": 444,
    "accountId": ".1.",
    "parentGroupId": 2, // null if directly under the account
    "name": "Texas",
    "description": "Texas",
    "uploadedImageId": "https://s3-us-west-2.amazonaws.com/swift-images/non-guessable-unique-id.jpeg",
    "sensorIds": [ 11, 22 ],
    "groupIds": [ 1, 2 ]
}
        
Edit Sensor Group (POST)
Updates the metadata associated to the specified sensor group

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/sensorgroups/{groupId}
Request Method: POST
Request Body:
{
    //Mandatory
    "id": 444,
    "accountId": ".1.",

    //Optional
    "parentGroupId": 2, // null or 0 - directly under the account
    "name": "Texas",
    "description": "all the collectors and subgroups within Texas",
    "uploadedImageId": "https://s3-us-west-2.amazonaws.com/swift-images/non-guessable-unique-id.jpeg",
    "sensorIds": [ 11, 22 ],
    "groupIds": [ 1, 2 ]
}

Response Status: 200 (OK)
Response Body:
{
    "id": 444,
    "accountId": ".1.",
    "parentGroupId": 2,
    "name": "Texas",
    "description": "all the collectors and subgroups within Texas",
    "uploadedImageId": "https://s3-us-west-2.amazonaws.com/swift-images/non-guessable-unique-id.jpeg",
    "sensorIds": [ 11, 22 ],
    "groupIds": [ 1, 2 ]
}
        
Add Sensor Group (POST)
Creates a new sensor group for the specified account at the root level (if parentGroupId is null) or underneath the specified parent sensor group.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/sensorgroups
Request Method: POST
Request Body:
{
    "id": 0,                    // or null
    "accountId": ".1.",
    "parentGroupId": 2,         // 0 or null - add it directly under the account
    "name": "Texas",
    "description": "all the collectors and subgroups within Texas",
    "sensorIds": [ 11, 22 ],
    "groupIds": [ 1, 2 ]
}

Response Status: 200 (OK)
Response Body:
{
    "id": 4,
    "accountId": ".1.",
    "parentGroupId": 2,
    "name": "Texas",
    "description": "all the collectors and subgroups within Texas",
    "sensorIds": [ 11, 22 ],
    "groupIds": [ 1, 2 ]
}
        
Delete Sensor Group (DELETE)
Deletes an empty sensor group from the tree. If the sensor group is not empty, the request will fail. Returns the id of the group that was deleted.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/sensorgroups/{groupId}
Request Method: DELETE

Response Status: 200 (OK)
Response Body: None
        
Accounts
Get Account List (GET) - V2
Gets the list of accounts and subaccounts that the current user can access.
QueryString Params (Super users only): familyAccountId: filters the results to the specified account family (home account and its subaccounts). Specifying the home account id or any of its subaccount ids will return the same account family. This querystring parameter is used only by Super users.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts
Request URL (Super users only): https://api.swiftsensors.net/api/client/v2/accounts?familyAccountId=.1.2.
Request Method: GET

Response Status: 200 (OK)
Response Body:
[
    {
        "id": ".1.",
        "accountName": "Swift Sensors, Inc.",
        "isEnabled": true,
        "subAccounts": [
            {
                "id": ".1.2.",
                "accountName": "Sub Account A",
                "isEnabled": true,
                "subAccounts": [
                    {
                        "id": ".1.2.3",
                        "accountName": "Sub Account B",
                        "isEnabled": true
                    }
                ]
            }
        ]
    },
    {
        "id": ".4.",
        "accountName": "My Sub Account",
        "isEnabled": true,
        "isMonitored": true
    }
]
        
Get Branch Account List (GET) - V2
Get all accounts in the specified account branch.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts?branchAccountId=.1.2.
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    "id": ".1.2.",
    "accountName": "Sub Account A",
    "isEnabled": true,
    "level": 1,
    "isMonitored": true,
    "subAccounts": [
        {
            "id": ".1.2.8",
            "accountName": "Sub Sub Account B",
            "isEnabled": true,
            "level": 2,
            "isMonitored": true
            // "subAccounts" property is not sent if empty
        }
    ]
}
        
Get Account Summary (POST)
Returns account summary for the given account or account branch. Measurement status totals exclude hidden measurements.
The dashboard now supports a new Account Summary panel. This panel is designed to provide a summary of the entire account including all subaccounts. Sensor threshold status totals are shown on the left as a pie chart, broken into critical, warning, normal, and none. Abnormal hardware totals are shown on the right split into three categories: offline gateways, offline sensors, and low-battery sensors, showing both the abnormal and total counts.
Account Summary panels for many subaccounts can be placed in a dashboard of a parent account to create a corporate overview. Clicking the left or right side of each panel automatically switches the console to that account and takes the user to the account summary page which provides more details. If the subaccount itself has subaccounts, users can continue to drill into those subaccounts by clicking on Account Summary panels shown in a new subaccounts section.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/summary
Request Method: POST
Request Body:
{
    "showAll": true,			    // true means all totals include subaccounts				        (optional, default is true)
    "collectorOfflineMins": 6		// minutes since last contact before declaring collector offline 	(optional, default is 6)
    "deviceOfflineMins": 35		    // minutes since last contact before declaring device offline		(optional, default is 35)
    "lowBatteryThreshold" : 30		// battery is considered low at or below this percentage threshold 	(optional, default is 30)
}

Response Status: 200 (OK)
Response Body:
{
    "n": "Swift Sensors, Inc.",		// account name
    "status": [ 4, 8, 20, 5, 0 ]	// measurements status [ totCritical, totWarning, totNormal, totNone, totOffline ]
    "hw": [ 1, 0, 1, 0, 0, 0 ]		// hardware statistics [ totCollectors, offCollectors, totDevices, offDevices, totBatteries, lowBatteries ]
}
        
Get Account (GET)
Gets the metadata for the account.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}
Request Method: GET
Response Status: 200 (OK)
Response Body:
{
    "id": ".1.",
    "accountName": "Test Account",
    "isEnabled": true,
    "language": "en",
    "level": 0,
    "timeZone": {
        "timeZoneId": "America/Chicago",
        "regionId": "America",
        "locale": "Chicago",
        "abbreviation": "CST",
        "observesDst": true,
        "offsetDst": 60,
        "offset": -360,
        "offsetDisplay": "-06:00",
        "inDaylightTime": true
    }
    "creationTime": 1474303074,
    "lastTreeChangedTime": 1474399472,
    "brandId": "d3hJ22pzHsSe",
    "uploadedImageId": "https://s3-us-west-2.amazonaws.com/swift-images/non-guessable-unique-id.jpeg",
    "defaultCalibrationIntervalMonths": 12,
    "reCalibrationLeadTimeDays": 90
}
        
Add Account (POST)
Creates a new account under the given parentAccountId. (For users with role Super, parentAccountId can be null which indicates that the new account is without a parent on the root.) In the request URL, homeAccountId is the id of the user's home account.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{homeAccountId}/new
Request Method: POST
Request Body:
{
    "accountName": "New Account",
    "parentAccountId": ".1.",
    "timeZone": {
        "timeZoneId": "America/Chicago"
    },
    "isEnabled": true,
    "isMonitored": true,
    "language": "en",
    "collectorGuid": "",        // optional when adding subaccount
    "email": "",                // optional when adding subaccount
    "password": "",             // optional when adding subaccount
    "firstName": "",            // optional when adding subaccount
    "middleName": "",           // optional when adding subaccount
    "lastName": ""              // optional when adding subaccount
}

Response Status: 200 (OK)
Response Body:
{
    "id": ".1.",
    "accountName": "Test Account",
    "isEnabled": true,
    "language": "en",
    "level": 0,
    "timeZone": {
        "timeZoneId": "America/Chicago",
        "regionId": "America",
        "locale": "Chicago",
        "abbreviation": "CST",
        "observesDst": true,
        "offsetDst": 60,
        "offset": -360,
        "offsetDisplay": "-06:00",
        "inDaylightTime": true
    }
    "creationTime": 1474303074,
    "lastTreeChangedTime": 1474399472,
    "defaultCalibrationIntervalMonths": 12,
    "reCalibrationLeadTimeDays": 90
}
        
Delete Account (DELETE)
Deletes the specified account including users, groups, collectors, devices, and sensors. WARNING: The sensor data will also be deleted and this action cannot be undone.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}
Request Method: DELETE

Response Status: 200 (OK)
Response Body: None
        
Edit Account (POST)
Updates the metadata associated to the specified account.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}
Request Method: POST
Request Body:
{
    "id": ".1.",
    "accountName": "Test Account",
    "isEnabled": true,
    "language": "en",
    "level": 0,
    "timeZone": {
        "timeZoneId": "America/Chicago",
        "regionId": "America",
        "locale": "Chicago",
        "abbreviation": "CST",
        "observesDst": true,
        "offsetDst": 60,
        "offset": -360,
        "offsetDisplay": "-06:00",
        "inDaylightTime": true
    },
    "defaultCalibrationIntervalMonths": 12,
    "reCalibrationLeadTimeDays": 90,
    "cascadeCalibrationSettings": false
}

Response Status: 200 (OK)
Response Body:
{
    "id": ".1.",
    "accountName": "Test Account",
    "isEnabled": true,
    "language": "en",
    "level": 0,
    "timeZone": {
        "timeZoneId": "America/Chicago",
        "regionId": "America",
        "locale": "Chicago",
        "abbreviation": "CST",
        "observesDst": true,
        "offsetDst": 60,
        "offset": -360,
        "offsetDisplay": "-06:00",
        "inDaylightTime": true
    }
    "creationTime": 1474303074,
    "lastTreeChangedTime": 1474399472,
    "defaultCalibrationIntervalMonths": 12,
    "reCalibrationLeadTimeDays": 90
}
        
Collectors
Get All Collectors (GET)
Gets the metadata for all collectors in the account (and possibly all subaccounts).
Values for includeSubAccounts: true / false

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/collectorsAll?includeSubAccounts=false
Request Method: GET

Response Status: 200 (OK)
Response Body:
[
    {
        // read-only properties
        "id": 7,
        "accountId": ".1.",
        "guid": "480e90e4",
        "dashedGuid": "480e-90e4",
        "manufacturer": "SwiftSensors, Inc.",
        "model": "Standard 1010",
        "hardwareRevision": "1.0.0",
        "softwareRevision": "1.0",
        "firstContactTime": 1440774994,
        "lastContactTime": 1440774994,
        "connectionType": "Ethernet | WiFi | Cellular | USB",
        "network": "SwiftSensors 5GHz",         // 2G networks: GSM, GPRS, EDGE	3G: UMTS, HSDPA, HSUPA
        "friendlyNetwork": "2G | 3G",           // Only for Cellular connection type
        "signalStrength": 55,
        "serialNumber": " 000000001527dd2f",
        "isNew": false,
        "uploadedImageId": "https://s3-us-west-2.amazonaws.com/swift-images/non-guessable-unique-id.jpeg",
        "ethernetMacAddress": "B8:27:EB:87:5D:05",
        "wifiMacAddress": "B8:27:EB:D2:08:50",
        "ipAddress": "127.0.0.1",
        "features": {"wifi": true, "ble": true, "cell": true, "gps": true, "radio": true}
        "hardwareNotificationIds": [1, 2]       // (Deprecated on 2017.10.23) Only shows ids on same account as sensor
        "hardwareNotifications": [
            {
                "accountId": ".1.",
                "ids": [
                    {"id": 1, "name": "first notification"},
                    {"id": 2, "name": "second notification"}
                ]
            },
            {
                "accountId": ".1.2.3.",
                "ids": [
                    {"id": 3, "name": "third notification"}
                ]
            }
        ],

        // editable properties
        "parentGroupId": 2,                     // 0 or null means directly under the account
        "name": "SWH-WBE-01 (e726)",
        "description": "Hub plugged in next to the rear electrical box.",
        "latitude": 30.286859,
        "longitude": -97.814758,
        "connectionPref": "WiFi | Cellular",    // connectionType preference if both WiFi and Cellular are available
        "ethStaticIp": "12.34.123.234",         // optional ethernet static IPv4 address (sending "" clears value)
        "routerIp": "12.34.123.234",            // optional router IPv4 address          (sending "" clears value)
        "timeZone": {                           // null if using the account time zone
            "timeZoneId": "America/Chicago",
            "regionId": "America",
            "locale": "Chicago",
            "abbreviation": "CST",
            "observesDst": true,
            "offsetDst": 60,
            "offset": -360,
            "offsetDisplay": "-06:00",
            "inDaylightTime": true
        },
        "tagIds": [1, 2]
    }
]
        
Collector
Get Collector (GET)
Retrieves the metadata associated to the specified collector.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/collectors/{collectorId}
Request Method: GET
Response Status: 200 (OK)
Response Body:
{
    // read-only properties
    "id": 7,
    "accountId": ".1.",
    "guid": "480e-90e4-e726",
    "manufacturer": "SwiftSensors, Inc.",
    "model": "Standard 1010",
    "hardwareRevision": "1.0.0",
    "softwareRevision": "1.0",
    "firstContactTime": 1440774994,
    "lastContactTime": 1440774994,
    "connectionType": "Ethernet | WiFi | Cellular | USB",
    "network": "SwiftSensors 5GHz",         // 2G networks: GSM, GPRS, EDGE	3G: UMTS, HSDPA, HSUPA
    "friendlyNetwork": "2G | 3G",           // Only for Cellular connection type
    "signalStrength": 55,
    "serialNumber": " 000000001527dd2f",
    "isNew": false,
    "uploadedImageId": "https://s3-us-west-2.amazonaws.com/swift-images/non-guessable-unique-id.jpeg",
    "ethernetMacAddress": "B8:27:EB:87:5D:05",
    "wifiMacAddress": "B8:27:EB:D2:08:50",
    "ipAddress": "127.0.0.1",
    "features": { "wifi": true, "ble": true, "cell": true, "gps": true, "radio": true }
    "hardwareNotificationIds": [ 1, 2 ]     // (Deprecated on 2017.10.23) Only shows ids on same account as sensor
    "hardwareNotifications": [
        {
            "accountId": ".1.",
            "ids": [
                { "id": 1, "name": "first notification" },
                { "id": 2, "name": "second notification" }
            ]
        },
        {
            "accountId": ".1.2.3.",
            "ids": [
                { "id": 3, "name": "third notification" }
            ]
        }
    ],

    // editable properties
    "parentGroupId": 2,                     // 0 or null means directly under the account
    "name": "SWH-WBE-01 (e726)",
    "description": "Hub plugged in next to the rear electrical box.",
    "latitude": 30.286859,
    "longitude": -97.814758,
    "connectionPref": "WiFi | Cellular",    // connectionType preference if both WiFi and Cellular are available
    "ethStaticIp": "12.34.123.234",         // optional ethernet static IPv4 address (sending "" clears value)
    "routerIp": "12.34.123.234",            // optional router IPv4 address          (sending "" clears value)
    "timeZone": {                           // null if using the account time zone
        "timeZoneId": "America/Chicago",
        "regionId": "America",
        "locale": "Chicago",
        "abbreviation": "CST",
        "observesDst": true,
        "offsetDst": 60,
        "offset": -360,
        "offsetDisplay": "-06:00",
        "inDaylightTime": true
    },
    "tagIds": [ 1, 2 ]
}
        
Edit Collector (POST) - V2
Modifies the metadata for the specified collector.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/collectors/{collectorId}
Request Method: POST
Request Body:
{
    // editable properties
    "parentGroupId": 2,                     // 0 or null means directly under the account
    "name": "SWH-WBE-01 (e726)",
    "description": "Hub plugged in next to the rear electrical box.",
    "latitude": 30.286859,
    "longitude": -97.814758,
    "connectionPref": "WiFi | Cellular",    // connectionType preference if both WiFi and Cellular are available
    "ethStaticIp": "12.34.123.234",         // optional ethernet static IPv4 address (sending "" clears value)
    "routerIp": "12.34.123.234",            // optional router IPv4 address          (sending "" clears value)
    "timeZone": {                           // null if using the account time zone
        "timeZoneId": "America/Chicago",
        "regionId": "America",
        "locale": "Chicago",
        "abbreviation": "CST",
        "observesDst": true,
        "offsetDst": 60,
        "offset": -360,
        "offsetDisplay": "-06:00",
        "inDaylightTime": true
    },
    "tagIds": [ 1, 2 ]
}

Response Status: 200 (OK)
Response Body:
{
    // read-only properties
    "id": 7,
    "accountId": ".1.",
    "guid": "480e-90e4-e726",
    "manufacturer": "SwiftSensors, Inc.",
    "model": "Standard 1010",
    "hardwareRevision": "1.0.0",
    "softwareRevision": "1.0",
    "firstContactTime": 1440774994,
    "lastContactTime": 1440774994,
    "connectionType": "Ethernet | WiFi | Cellular | USB",
    "network": "SwiftSensors 5GHz",         // 2G networks: GSM, GPRS, EDGE	3G: UMTS, HSDPA, HSUPA
    "friendlyNetwork": "2G | 3G",           // Only for Cellular connection type
    "signalStrength": 55,
    "serialNumber": " 000000001527dd2f",
    "isNew": false,
    "uploadedImageId": "https://s3-us-west-2.amazonaws.com/swift-images/non-guessable-unique-id.jpeg",
    "ethernetMacAddress": "B8:27:EB:87:5D:05",
    "wifiMacAddress": "B8:27:EB:D2:08:50",
    "ipAddress": "127.0.0.1",
    "features": { "wifi": true, "ble": true, "cell": true, "gps": true, "radio": true }
    "hardwareNotificationIds": [ 1, 2 ]     // (Deprecated on 2017.10.23) Only shows ids on same account as sensor
    "hardwareNotifications": [
        {
            "accountId": ".1.",
            "ids": [
                { "id": 1, "name": "first notification" },
                { "id": 2, "name": "second notification" }
            ]
        },
        {
            "accountId": ".1.2.3.",
            "ids": [
                { "id": 3, "name": "third notification" }
            ]
        }
    ],
    "tagIds": [ 1, 2 ]

    // editable properties
    "parentGroupId": 2,                     // 0 or null means directly under the account
    "name": "SWH-WBE-01 (e726)",
    "description": "Hub plugged in next to the rear electrical box.",
    "latitude": 30.286859,
    "longitude": -97.814758,
    "connectionPref": "WiFi | Cellular",    // connectionType preference if both WiFi and Cellular are available
    "ethStaticIp": "12.34.123.234",         // optional ethernet static IPv4 address (sending "" clears value)
    "routerIp": "12.34.123.234",            // optional router IPv4 address          (sending "" clears value)
    "timeZone": {                           // null if using the account time zone
        "timeZoneId": "America/Chicago",
        "regionId": "America",
        "locale": "Chicago",
        "abbreviation": "CST",
        "observesDst": true,
        "offsetDst": 60,
        "offset": -360,
        "offsetDisplay": "-06:00",
        "inDaylightTime": true
    }
}
        
Delete Collector (DELETE)
Deletes a collector and the historical position data associated. The delete will fail if there are any devices still attached to the collector. WARNING: The historical data for the collector will be deleted and cannot be undone. If the collector is still on it will be available to be adopted shortly after it has been deleted.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/collectors/{collectorId}
Request Method: DELETE
Response Status: 200 (OK)
Response Body: None				            // lastTreeChangeTime will be updated notifying clients of change
        
Collector Provisioning
Collector provisioning is the process of registering orphaned collectors to an account. An orphaned collector is any collector that is currently not registered, such as a new collector that has not yet been added to an account, or an old collector that has been deleted from an account. Orphaned collectors can be adopted by an account if they are online so they can announce themselves to the Swift Sensors Cloud.
Adopt Collector (POST) - V2
Attaches a collector to the specified account.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/collectors/adopt
Request Method: POST
Request Body:
{
    "id": 0,                                // must be null or zero
    "accountId": ".1.",
    "parentGroupId": 2,
    "guid": "ABCD"                          // must be at least the last 4 characters, matches on "endsWith"
}

Response Status: 200 (OK)
Response Body:
{
    // read-only properties
    "id": 7,
    "accountId": ".1.",
    "guid": "480e-90e4-e726",
    "manufacturer": "SwiftSensors, Inc.",
    "model": "Standard 1010",
    "hardwareRevision": "1.0.0",
    "softwareRevision": "1.0",
    "firstContactTime": 1440774994,
    "lastContactTime": 1440774994,
    "connectionType": "Ethernet | WiFi | Cellular | USB",
    "network": "SwiftSensors 5GHz",         // 2G networks: GSM, GPRS, EDGE	3G: UMTS, HSDPA, HSUPA
    "friendlyNetwork": "2G | 3G",           // Only for Cellular connection type
    "signalStrength": 55,
    "serialNumber": " 000000001527dd2f",
    "isNew": false,
    "uploadedImageId": "https://s3-us-west-2.amazonaws.com/swift-images/non-guessable-unique-id.jpeg",
    "ethernetMacAddress": "B8:27:EB:87:5D:05",
    "wifiMacAddress": "B8:27:EB:D2:08:50",
    "ipAddress": "127.0.0.1",
    "features": { "wifi": true, "ble": true, "cell": true, "gps": true, "radio": true }
    "hardwareNotificationIds": [ 1, 2 ]     // (Deprecated on 2017.10.23) Only shows ids on same account as sensor
    "hardwareNotifications": [
        {
            "accountId": ".1.",
            "ids": [
                { "id": 1, "name": "first notification" },
                { "id": 2, "name": "second notification" }
            ]
        },
        {
            "accountId": ".1.2.3.",
            "ids": [
                { "id": 3, "name": "third notification" }
            ]
        }
    ],

    // editable properties
    "parentGroupId": 2,                     // 0 or null means directly under the account
    "name": "SWH-WBE-01 (e726)",
    "description": "Hub plugged in next to the rear electrical box.",
    "latitude": 30.286859,
    "longitude": -97.814758,
    "connectionPref": "WiFi | Cellular",    // connectionType preference if both WiFi and Cellular are available
    "ethStaticIp": "12.34.123.234",         // optional ethernet static IPv4 address (sending "" clears value)
    "routerIp": "12.34.123.234",            // optional router IPv4 address          (sending "" clears value)
    "timeZone": {                           // null if using the account time zone
        "timeZoneId": "America/Chicago",
        "regionId": "America",
        "locale": "Chicago",
        "abbreviation": "CST",
        "observesDst": true,
        "offsetDst": 60,
        "offset": -360,
        "offsetDisplay": "-06:00",
        "inDaylightTime": true
    },
    "tagIds": [ 1, 2 ]
}
        
Collector WiFi Networks
Update WiFi Networks (POST)
Sends a command to the collector to scan the available WiFi networks.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/collectors/{collectorId}/wifis/update
Request Method: POST
Request Body: None

Response Status: 200 (OK)
Response Body: None
        
Get Available WiFi Networks (GET)
Gets the last known available WiFi networks for the collector.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/collectors/{collectorId}/wifis
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    "lastUpdateTime": 1234556,      // nullable
    "lastRequestTime": 1234234,     // nullable
    "hubTime": 1234234,             // nullable
    "collectorGuid": "ABCDEFGH",
    "networks": [
        {
            "wifiSsidName": "swift",
            "wifiSignalStrength": 80,
            "wifiSignalQuality": 98,
            "wifiEncryptionType": "WPA2-EAP",
            "wifiMacAddress": "00:14:22:01:23:45"
        },
        {
            "wifiSsidName": "sensors",
            "wifiSignalStrength": 45,
            "wifiSignalQuality": 12,
            "wifiEncryptionType": "WEP",
            "wifiMacAddress": "00:14:22:01:23:41"
        },
        {
            "wifiSsidName": "swift guest",
            "wifiSignalStrength": 99,
            "wifiSignalQuality": 96,
            "wifiEncryptionType": "OPEN",
            "wifiMacAddress": "00:14:22:01:23:35"
        }
    ]
}
        
Set (Configure) New WiFi Network (POST)
Sends a command to the collector to connect to the specified network with the specified settings.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/collectors/{collectorId}/wifi
Request Method: POST
Request Body:
{
    "networkInfo": {
        "wifiSsidName": "SwiftSensors 5G",
        "wifiSignalStrength": 100,
        "wifiSignalQuality": 0,
        "wifiEncryptionType": "OPEN | WEP | WPA-PSK | WPA2-PSK | WPA-EAP | WPA2-EAP",
        "wifiMacAddress": "00:14:22:01:23:35"
    },
    "userName": "abc",
    "password": "123",
    "isFuture": true,       // Will be used only in case current network is not available
    "isAppliedToAll": true  // Applied to all hubs with the same current network in the same account
}

Response Status: 200 (OK)
Response Body: None
        
Devices
Get All Devices (GET)
Gets the metadata for all devices in the account (and possibly all subaccounts).
Values for includeSubAccounts: true / false

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/deviceAll?includeSubAccounts=false
Request Method: GET

Response Status: 200 (OK)
Response Body:
[
    {
        "id": 47,
        "accountId": ".1.",
        "collectorId": 29,
        "subModelId": 3,
        "manufacturer": "SwiftSensors, Inc.",
        "model": "SWS-THV-01",
        "hardwareRevision": "B",
        "firmwareRevision": "1.0.16",
        "isEventBased": false,
        "firstContactTime": 1441397578,
        "lastContactTime": 1441397578,
        "name": "Cooler 1",
        "description": "Sensor is attached inside the entrance on the right.",
        "hardwareId": "A002AX",
        "latitude": 0.0,
        "longitude": 0.0,
        "batteryLevel": 87,
        "isPowered": false,
        "signalStrength": -80,
        "isNew": false,
        "uploadedImageId": "https://s3-us-west-2.amazonaws.com/swift-images/non-guessable-unique-id.jpeg",
        "hardwareNotificationIds": [1, 2] 	// (Deprecated on 2017.10.23) Only shows ids on the same account as the device
        "hardwareNotifications": [
            {
                "accountId": ".1.",
                "ids": [
                    {
                        "id": 1,
                        "name": "first notification"
                    },
                    {
                        "id": 2,
                        "name": "second notification"
                    }
                ]
            },
            {
                "accountId": ".1.2.3.",
                "ids": [
                    {
                        "id": 3,
                        "name": "third notification"
                    }
                ]
            }
        ]
        "wirelessType": "BLE" | "RF",
        "tagIds": [1, 2],
        "sampleRate": 1,
        "errorCode": 12,                	// not sent if 0 (NONE) - see Device Error Codes in Device section
        "errorTime": 1516750359,        	// not sent if errorCode is not sent - time when error started
        "isArchived": false,
        "advancedSettings": {           	// advanced settings (gen 3+ devices only)
            rampOffset: 1,
            accBurstFrequency: 16000,
            accBurstDuration: 500,
            accSensitivity: 4,
            accThreshold: 8
        },
         "calibration": {
            "hardwareId": "A002AX",
            "deviceProfileId": 75,
            "calibrations": [
                [
                    71.0,
                    null,
                    null
                ],
                [
                    72.0,
                    -14.3,
                    1.0
                ]
            ],
            "time": 1753962855,
            "calibrationAccountId": ".1.2977.2984.",
            "calibrationPartnerName": "Custom Calibration",
            "isPostConversion": false,
            "isActive": true,
            "isCertified": true
        },
        "calibrationIntervalMonths": null  // if null, this means inherit from account setting
    }
]
        
Device
Get Device (GET)
Gets the device’s metadata for the specifed deviceId.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/devices/{deviceId}
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    "id": 47,
    "accountId": ".1.",
    "collectorId": 29,
    "subModelId": 3,
    "manufacturer": "SwiftSensors, Inc.",
    "model": "SWS-THV-01",
    "hardwareRevision": "B",
    "firmwareRevision": "1.0.16",
    "isEventBased": false,
    "firstContactTime": 1441397578,
    "lastContactTime": 1441397578,
    "name": "Cooler 1",
    "description": "Sensor is attached inside the entrance on the right.",
    "hardwareId": "A002AX",
    "latitude": 0.0,
    "longitude": 0.0,
    "batteryLevel": 87,
    "isPowered": false,
    "signalStrength": -80,
    "isNew": false,
    "uploadedImageId": "https://s3-us-west-2.amazonaws.com/swift-images/non-guessable-unique-id.jpeg",
    "hardwareNotificationIds": [ 1, 2 ] // (Deprecated on 2017.10.23) Only shows ids on the same account as the device
    "hardwareNotifications": [
        {
            "accountId": ".1.",
            "ids": [
                {
                    "id": 1,
                    "name": "first notification"
                },
                {
                    "id": 2,
                    "name": "second notification"
                }
            ]
        },
        {
            "accountId": ".1.2.3.",
            "ids": [
                {
                    "id": 3,
                    "name": "third notification"
                }
            ]
        }
    ]
    "wirelessType": "BLE"|"RF",
    "tagIds": [ 1, 2 ],
    "sampleRate": 1,
    "errorCode": 12,                // not sent if 0 (NONE) - see Device Error Codes in Device section
    "errorTime": 1516750359,        // not sent if errorCode is not sent - time when error started
    "isArchived": false,
    "advancedSettings": {           // advanced settings (gen 3+ devices only)
        "rampOffset": 1,
        "accBurstFrequency": 16000,
        "accBurstDuration": 500,
        "accSensitivity": 4,
        "accThreshold": 8
    },
     "calibration": {
        "hardwareId": "A002AX",
        "deviceProfileId": 75,
        "calibrations": [
            [
                71.0,
                null,
                null
            ],
            [
                72.0,
                -14.3,
                1.0
            ]
        ],
        "time": 1753962855,
        "calibrationAccountId": ".1.2977.2984.",
        "calibrationPartnerName": "Custom Calibration",
        "isPostConversion": false,
        "isActive": true,
        "isCertified": true
    },
    "calibrationIntervalMonths": null  // if null, this means inherit from account setting
}
        
Edit Device (POST)
Modifies the metadata associated to the specified device.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/devices/{deviceId}
Request Method: POST
Request Body:
{
    "id": 47,
    "accountId": ".1.",
    "collectorId": 29,
    "subModelId": 3,
    "manufacturer": "SwiftSensors, Inc.",
    "model": "SWS-THV-01",
    "hardwareRevision": "B",
    "firmwareRevision": "1.0.16",
    "isEventBased": false,
    "firstContactTime": 1441397578,
    "lastContactTime": 1441397578,
    "name": "Cooler 1",
    "description": "Sensor is attached inside the entrance on the right.",
    "hardwareId": "B0:B4:48:D9:C0:AC",
    "latitude": 0.0,
    "longitude": 0.0,
    "batteryLevel": 87,
    "isPowered": false,
    "signalStrength": -80,
    "isNew": false,
    "uploadedImageId": "https://s3-us-west-2.amazonaws.com/swift-images/non-guessable-unique-id.jpeg",
    "hardwareNotificationIds": [ 1, 2 ],
    "wirelessType": "BLE"|"RF",
    "tagIds": [ 1, 2 ],
    "sampleRate": 1,
    "errorCode": 12,                // not sent if 0 (NONE) - see Device Error Codes in Device section
    "errorTime": 1516750359,        // not sent if errorCode is not sent - time when error started
    "isArchived": false,
    "advancedSettings": {           // advanced settings (gen 3+ devices only)
        "rampOffset": 1,
        "accBurstFrequency": 16000,
        "accBurstDuration": 500,
        "accSensitivity": 4,
        "accThreshold": 8
    },
    "calibrationIntervalMonths": null  // if null, this means inherit from account setting.  CAN BE SET to NULL
}

Response Status: 200 (OK)
Response Body:
{
    "id": 47,
    "accountId": ".1.",
    "collectorId": 29,
    "subModelId": 3,
    "manufacturer": "SwiftSensors, Inc.",
    "model": "SWS-THV-01",
    "hardwareRevision": "B",
    "firmwareRevision": "1.0.16",
    "isEventBased": false,
    "firstContactTime": 1441397578,
    "lastContactTime": 1441397578,
    "name": "Cooler 1",
    "description": "Sensor is attached inside the entrance on the right.",
    "hardwareId": "A002AX",
    "latitude": 0.0,
    "longitude": 0.0,
    "batteryLevel": 87,
    "isPowered": false,
    "signalStrength": -80,
    "isNew": false,
    "uploadedImageId": "https://s3-us-west-2.amazonaws.com/swift-images/non-guessable-unique-id.jpeg",
    "hardwareNotificationIds": [ 1, 2 ] // (Deprecated on 2017.10.23) Only shows ids on the same account as the device
    "hardwareNotifications": [
        {
            "accountId": ".1.",
            "ids": [
                {
                    "id": 1,
                    "name": "first notification"
                },
                {
                    "id": 2,
                    "name": "second notification"
                }
            ]
        },
        {
            "accountId": ".1.2.3.",
            "ids": [
                {
                    "id": 3,
                    "name": "third notification"
                }
            ]
        }
    ]
    "wirelessType": "BLE"|"RF",
    "tagIds": [ 1, 2 ],
    "sampleRate": 1,
    "errorCode": 12,                // not sent if 0 (NONE) - see Device Error Codes in Device section
    "errorTime": 1516750359,        // not sent if errorCode is not sent - time when error started
    "isArchived": false,
    "advancedSettings": {           // advanced settings (gen 3+ devices only)
        "rampOffset": 1,
        "accBurstFrequency": 16000,
        "accBurstDuration": 500,
        "accSensitivity": 4,
        "accThreshold": 8
    },
     "calibration": {
        "hardwareId": "A002AX",
        "deviceProfileId": 75,
        "calibrations": [
            [
                71.0,
                null,
                null
            ],
            [
                72.0,
                -14.3,
                1.0
            ]
        ],
        "time": 1753962855,
        "calibrationAccountId": ".1.2977.2984.",
        "calibrationPartnerName": "Custom Calibration",
        "isPostConversion": false,
        "isActive": true,
        "isCertified": true
    },
    "calibrationIntervalMonths": null  // if null, this means inherit from account setting
}
        
Delete Device (DELETE)
Deletes a device and the sensors for that device. WARNING: The historical data for the sensor will be deleted as well. This cannot be undone. If the device is still on and within range it will be recreated when the collector connects to it.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/devices/{deviceId}
Request Method: DELETE

Response Status: 200 (OK)
Response Body: None				// lastTreeChangeTime will be updated notifying clients of change
        
Device Error Codes

 0 - NONE
 1 - UNKNOWN
11 - MISSING_SAMPLE
12 - OUT_OF_RANGE_INVALID
13 - OUT_OF_RANGE_HIGH
14 - OUT_OF_RANGE_LOW
20 - HARDWARE_ERROR
        
Device Provisioning
Device provisioning is the process of registering orphaned devices to an account. An orphaned device is any device that is currently not registered, such as a new device that has not yet been added to an account, or an old device that has been deleted from an account. Orphaned devices can be adopted by an account if any gateway on that account is in range of the device and is currently receiving a signal from the device.
Manual device provisioning is available starting with Series 3 devices. Earlier generation devices, such as Series 2, are automatically added to the account of the gateway that first detected them.
Get Orphan Devices (GET)
Get a list of orphaned Series 3 devices that can be added (adopted). The list includes all Series 3 devices not registered with any account that are currently detected by any online gateways on this account.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/devices/orphan
Request Method: GET

Response Status: 200 (OK)
Response Body:
[
    {
        "hardwareId": "A00123",
        "model": "SS3-102"
    },
    {
        "hardwareId": "A00234",
        "model": "SS3-102"
    }
]
        
Adopt Orphan Devices (POST)
Adds (adopts) the specified devices to an account. For each device, the result of the adoption attempt is provided. If adoption succeeded, the new device database id is provided. If the adoption failed, an error code explaining the reason for failure is provided. Error codes are explained below.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/devices/adopt
Request Method: POST
Request Body:
{
    "hardwareIds" : [
        "A00123",
        "A00234"
    ]
}

Response Status: 200 (OK)
Response Body:
{
    "A00123": {                 // device hardware id
        "id": 1079              // if adoption succeeds, the new device database id is provided
    },
    "A00234": {                 // device hardware id
        "error": 3              // if adoption fails, the adoption failure error code is provided
    }
}
        
Adoption Failure Error Codes

1 - DEVICE DOES NOT EXIST
2 - DEVICE IS OFFLINE
3 - DEVICE IS ALREADY ADOPTED
        
Disabled Device
Usage Flow
There are times when a device on the account is currently not used and the administrator would like to disable the device from the hardware list. At some later time, the administrator may want to use this device for a different purpose, and restore the device to the hardware list. The Disabled Device feature provides a way to do exactly that, so that unused devices do not clutter up the hardware list but still retain their membership with the account.
To disable a device, click the trash button on the edit device page and confirm your action. Removing a device is just like deleting a device (including the deletion of measurement history), except that the device remains attached to the account, and appears in a new Disabled Devices (Removed Sensors) panel on the account summary page.
To restore a device, click on the device in the Disabled Devices (Removed Sensors) panel to go to the disabled device (removed sensor) details page. Then select "Restore" on the status toggle switch and save. In the Disabled Devices (Removed Sensors) panel, the device will indicate that it is currently restoring until a collector on the same account detects it and it shows up in the hardware list as a new device. Please note that if a device was in sleep mode to conserve battery, it could take up to 4 hours for the device to restore.
To stop a device from restoring, click on the restoring device, select "Disable" on the status toggle switch and save. The device will stop trying to restore and will stay disabled.
In case the device needs to be deleted from the account permanently because it was destroyed or it will be used on another account, the disabled device details page has a delete button that deletes the device completely. If the device is in working order, it may appear as a new device under the nearest collector, possibly on a different account.
Command: Disable Device (POST) - V2
Disable device with the given device id. The device will be deleted from all relational and time-series tables, but some metadata (hardware id, account id, model, comma-delimited sensor profile names, isEnabled flag, disabled timestamp) will be saved in the disabled devices table to preserve this account's ownership of the device and allow the disabled device to re-enabled at a later date as a new device.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/devices/{deviceId}/command-disable
Request Method: POST
Request Body: none

Response Status: 200 (OK)
Response Body: none
        
Get Disabled Devices (GET) - V2
Get disabled devices on the given account.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/disabled-devices
Request Method: GET

Response Status: 200 (OK)
Response Body:
[
    {
        "id": "1:34:17:EB:89:00",				            // hardware id
        "name": "Sensor (89:00)",				            // default device name
        "model": "Sensor 101R",					            // null if model is unknown
        "sensorProfiles": "Temperature,Dew point,Humidity",	// null if sensor profile names are unknown (TODO: convert to sensor profile ids)
        "isEnabled": false,					                // false=disabled, true=enabled but waiting for re-discovery
        "disabledTime": 1507567003				            // UTC timestamp when the device was disabled
    }
]
        
Edit Disabled Device (POST) - V2
Editing a disabled device means simply editing the isEnabled flag. Enable: Enable a disabled device with the given hardware id. In the disabled devices table, the device's isEnabled flag will be set to true and the server will wait for the device to be re-discovered. Upon re-discovery, the device will be removed from the disabled deviced table and added to the account as a regular new device. If the isEnabled flag is already true, return success. Disable: Disable disabled device with the given hardware id. In the disabled devices table, the device's isEnabled flag will be set to false. If the isEnabled flag is already false, return success.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/disabled-devices/{hardwareId}
Request Method: POST
Request Body:
{
    "isEnabled": false,						                // false=disabled, true=enabled but waiting for re-discovery
}

Response Status: 200 (OK)
Response Body: none
        
Delete Disabled Device (DELETE) - V2
Delete a disabled device with the given hardware id. There are two use-cases for deletion: 1. the device was destroyed so account ownership is moot, or 2. the device was moved and needs to be re-discovered by gateways on a different account. The device is simply deleted from the disabled devices table. Since account ownership information is deleted, the device becomes eligible to be re-discovered by a gateway from any account if it is still functional.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/disabled-devices/{hardwareId}
Request Method: DELETE

Response Status: 200 (OK)
Response Body: none
        
Sensor
Get Sensor (GET) - V2
Retrieves the sensor’s metadata for the specified sensorId.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/sensors/{sensorId}
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    "id": 444,
    "accountId": ".1.",
    "name": "Kitchen Fryer Temperature",
    "description": "",
    "displayUnitTypeId": 3,
    "isHidden": false,
    "isNew": false,
    "propertyTypeId": 1,
    "thresholdId": 1,
    "thresholdStatus": 1,
    "shiftScheduleId": 1,
    "offset": 1.341,
    "value": 72.125,
    "time": 149392492743,
    "precision": 1,
    "conversionId": 1,          // not sent if null
    "prodConversionId": 2,      // not sent if null
    "parentSensorGroupId": 3,   // null means directly under the account
    "sensorProfile": {
        "id": 1,
        "name": "Oil Temperature",
        "description": ""
    },
    "tagIds": [ 1, 2 ],
    "eeCameraIds": [ "01234567", "89ABCDEF" ], // property is not sent if list is empty
    "rawCalibration": {
        "factor": 1,
        "offset": 0.246,
        "createdMs": 1758776400000,
        "isCertified": false,
        "calibrationPartnerAccountId": ".1.1234.5678.",
        "calibrationPartnerName": "Supercalifragilistic"
    },
    "convertedCalibration": {
        "factor": 1.00123,
        "offset": -0.789,
        "createdMs": 1758776400000,
        "isCertified": true,
        "calibrationPartnerAccountId": ".1.1234.5678.",
        "calibrationPartnerName": "Supercalifragilistic"
    }
}
        
Edit Sensor (POST) - V2
Modifies the sensor’s metadata for the specified sensorId.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/sensors/{sensorId}
Request Method: POST
Request Body:
{
    // required
    "id": 444,
    "accountId": ".1.",
    "displayUnitTypeId": 3,
    "propertyTypeId": 1,
    "thresholdId": 1,
    "offset": 1.341,
    "precision": 1,
    "parentSensorGroupId": 3, // null means ignore (dont change), 0 means directly under the account

    // optional (null means do not change)
    "name": "Kitchen Fryer Temperature",
    "description": "",
    "isHidden": false,
    "thresholdStatus": 1,
    "shiftScheduleId": 1,
    "sensorProfile": {
        "id": 1,
        "name": "Oil Temperature",
        "description": ""
    },
    "tagIds": [ 1, 2 ],
    "eeCameraIds": [ "01234567", "89ABCDEF" ], // property is not sent if list is empty

    // not used in request
    "isNew": false,
    "value": 72.125,
    "time": 149392492743,
    "conversionId": 1,
    "prodConversionId": 2
}

Response Status: 200 (OK)
Response Body:
{
    "id": 444,
    "accountId": ".1.",
    "name": "Kitchen Fryer Temperature",
    "description": "",
    "displayUnitTypeId": 3,
    "isHidden": false,
    "isNew": false,
    "propertyTypeId": 1,
    "thresholdId": 1,
    "thresholdStatus": 1,
    "shiftScheduleId": 1,
    "offset": 1.341,
    "value": 72.125,
    "time": 149392492743,
    "precision": 1,
    "conversionId": 1,          // not sent if null
    "prodConversionId": 2,      // not sent if null
    "parentSensorGroupId": 3,   // null means directly under the account
    "sensorProfile": {
        "id": 1,
        "name": "Oil Temperature",
        "description": ""
    },
    "tagIds": [ 1, 2 ],
    "eeCameraIds": [ "01234567", "89ABCDEF" ] // property is not sent if list is empty
}
        
Sensor Conversions
Get All Sensor Conversions (GET)
Get all sensor conversion details for this account.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/conversions
Request Method: GET

Response Status: 200 (OK)
Response Body:
[
    {
        "id": 1,
        "formulaId": 1,
        "name": "apples to oranges",
        "description": "apples to oranges",
        "defaultDisplayedUnitTypeId": 1,
        "inputUnitTypeId": 1,
        "outputUnitTypeId": 1,
        "constantVariables": [ 6250, -25 ],
        "sensorIds": [ 1, 3 ],
        "templateId": 1,
        "inputRange": [ 1.0, 3.0 ],
        "outputRange": [ 1.0, 3.0 ]
    },
    {
        "id": 2,
        "formulaId": 1,
        "name": "apples to oranges",
        "description": "apples to oranges",
        "defaultDisplayedUnitTypeId": 1,
        "inputUnitTypeId": 1,
        "outputUnitTypeId": 1,
        "constantVariables": [ 1.05, 2.5 ],
        "sensorIds": [ 1, 3 ],
        "templateId": 1,
        "inputRange": [ 1.0, 3.0 ],
        "outputRange": [ 1.0, 3.0 ]
    }
]
        
Get Sensor Conversion (GET)
Get all sensor conversion details for this account.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/conversions/{conversionId}
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    "id": 1,
    "formulaId": 1,
    "name": "apples to oranges",
    "description": "apples to oranges",
    "defaultDisplayedUnitTypeId": 1,
    "inputUnitTypeId": 1,
    "outputUnitTypeId": 1,
    "constantVariables": [ 6250, -25 ],
    "sensorIds": [ 1, 3 ],
    "templateId": 1,
    "inputRange": [ 1.0, 3.0 ],
    "outputRange": [ 1.0, 3.0 ]
}
        
Add Sensor Conversion (POST)
Add a sensor conversion for this account.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/conversions
Request Method: POST
Request Body:
{
    "id": 0,                            // or null
    "formulaId": 1,                     // mandatory. cannot be null
    "name": "apples to oranges",
    "description": "apples to oranges",
    "defaultDisplayedUnitTypeId": 1,    // mandatory. cannot be null
    "inputUnitTypeId": 1,               // mandatory. cannot be null
    "outputUnitTypeId": 1,              // mandatory. cannot be null
    "constantVariables": [ 6250, -25 ], // mandatory. cannot be null
    "sensorIds": [ 1, 3 ],
    "templateId": 1,
    "outputRange": [ 1.0, 3.0 ],        // legal values for both ranges are null, [] (for removing the range)
    "inputRange": [ 1.0, 3.0 ]          // or 2 not null values where the 2nd one is greater than the first one
}

Response Status: 200 (OK)
Response Body:					        // lastTreeChangeTime will be updated notifying clients of change
{
    "id": 1,
    "formulaId": 1,
    "name": "apples to oranges",
    "description": "apples to oranges",
    "defaultDisplayedUnitTypeId": 1,
    "inputUnitTypeId": 1,
    "outputUnitTypeId": 1,
    "constantVariables": [ 6250, -25 ],
    "sensorIds": [ 1, 3 ],
    "templateId": 1,
    "outputRange": [ 1.0, 3.0 ],
    "inputRange": [ 1.0, 3.0 ]
}
        
Edit Sensor Conversion (POST)
Edit a sensor conversion for this account.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/conversions/{conversionId}
Request Method: POST
Request Body:
{
    "id": 1,
    "formulaId": 1,
    "name": "apples to oranges",
    "description": "apples to oranges",
    "defaultDisplayedUnitTypeId": 1,
    "inputUnitTypeId": 1,
    "outputUnitTypeId": 1,
    "constantVariables": [ 6250, -25 ],
    "sensorIds": [ 1, 3 ],
    "templateId": 1,
    "outputRange": [ 1.0, 3.0 ],        // legal values for both ranges are null, [] (for removing the range)
    "inputRange": [ 1.0, 3.0 ]          // or 2 not null values where the 2nd one is greater than the first one
}

Response Status: 200 (OK)
Response Body:					        // lastTreeChangeTime will be updated notifying clients of change
{
    "id": 1,
    "formulaId": 1,
    "name": "apples to oranges",
    "description": "apples to oranges",
    "defaultDisplayedUnitTypeId": 1,
    "inputUnitTypeId": 1,
    "outputUnitTypeId": 1,
    "constantVariables": [ 6250, -25 ],
    "sensorIds": [ 1, 3 ],
    "templateId": 1,
    "outputRange": [ 1.0, 3.0 ],
    "inputRange": [ 1.0, 3.0 ]
}
        
Delete Sensor Conversion (DELETE)
Delete a sensor conversion for this account. Deletion is not allowed while sensors are attached to it.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/conversions/{conversionId}
Request Method: DELETE

Response Status: 200 (OK)
Response Body: None				        // lastTreeChangeTime will be updated notifying clients of change
        
Attach Conversion (POST) - V1
Attach conversion to a sensor.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/sensors/{sensorId}/conversion
Request Method: POST
Request Body:
{
    "conversionId": 5		// 0 means detach conversion
}

Response Status: 200 (OK)
Response Body: none
        
Sensor Thresholds
Get All Threshold (GET)
Gets the list of all thresholds for the specified account.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/thresholds
Request Method: GET

Response Status: 200 (OK)
Response Body:
[
    {
        "id": 1,
        "accountId": ".1.",
        "name": "thred1",
        "description": "thred1",
        "unitTypeId": 2,
        "maxCritical": 10.0,
        "minCritical": 2.0,
        "maxWarning": 8.0,
        "minWarning": 4.0,
        "sensorIds": [ 1, 2, 3 ]
    }
]
        
Get Threshold (GET)
Gets the metadata associated to the specified threshold.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/thresholds/{thresholdId}
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    "id": 1,
    "accountId": ".1.",
    "name": "thred1",
    "description": "thred1",
    "unitTypeId": 2,
    "maxCritical": 10.0,
    "minCritical": 2.0,
    "maxWarning": 8.0,
    "minWarning": 4.0,
    "sensorIds": [ 1, 2, 3 ]
}
        
Edit Threshold (POST)
Updates the metadata associated to the specified threshold.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/thresholds/{thresholdId}
Request Method: POST
Request Body:
{
    "id": 1,
    "accountId": ".1.",
    "name": "thred1",
    "description": "thred1",
    "unitTypeId": 2,
    "maxCritical": 10.0,
    "minCritical": 2.0,
    "maxWarning": 8.0,
    "minWarning": 4.0,
    "sensorIds": [ 1, 2, 3 ]
}

Response Status: 200 (OK)
Response Body:
{
    "id": 1,
    "accountId": ".1.",
    "name": "thred1",
    "description": "thred1",
    "unitTypeId": 2,
    "maxCritical": 10.0,
    "minCritical": 2.0,
    "maxWarning": 8.0,
    "minWarning": 4.0,
    "sensorIds": [ 1, 2, 3 ]
}
        
Add Threshold (POST)
Creates a new threshold for the specified account.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/thresholds
Request Method: POST
Request Body:
{
    "id": 0, // 0 or null
    "accountId": ".1.",
    "name": "thred1",
    "description": "thred1",
    "unitTypeId": 2,
    "maxCritical": 10.0,
    "minCritical": 2.0,
    "maxWarning": 8.0,
    "minWarning": 4.0,
    "sensorIds": [ 1, 2, 3 ]
}

Response Status: 200 (OK)
Response Body:
{
    "id": 1,
    "accountId": ".1.",
    "name": "thred1",
    "description": "thred1",
    "unitTypeId": 2,
    "maxCritical": 10.0,
    "minCritical": 2.0,
    "maxWarning": 8.0,
    "minWarning": 4.0,
    "sensorIds": [ 1, 2, 3 ]
}
        
Delete Threshold (DELETE)
Deletes the threshold from the account. If the threshold is assigned to any sensors, the request will fail. Returns the id of the threshold that was deleted.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/thresholds/{thresholdId}
Request Method: DELETE

Response Status: 200 (OK)
Response Body: None
        
Attach Threshold (POST) - V1
Attach threshold to a sensor.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/sensors/{sensorId}/threshold
Request Method: POST
Request Body:
{
    "thresholdId": 5		// 0 means detach threshold
}

Response Status: 200 (OK)
Response Body: none
        
Sensor Notifications
Get All Notifications (GET) - V2
Get summary metadata for all sensor notifications visible to the current user between the user's home account and the specified accountId. This metadata is used to present a list of all sensor notification options, grouped by accountId, when editing sensor notifications for a sensor in the specified accountId.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/notifications
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    // accountId: [ [ sensorNotificationId, name, usersCount, sensorsCount, isEnabled, category, webhookCount ] ]
    ".1.": [ [ 1, "Notification 1", 0, 0, true, 0, 1 ] ]
}
        
Get Notification (GET) - V2
Gets the metadata associated to the specified notification.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/notifications/{notificaitonId}
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    "id": 1,
    "accountId": ".1.",
    "name": "name 1",
    "description": "desc 1",
    "isEnabled": true,
    "notifyViaEmail": true,
    "notifyViaSms": true,
    "notifyViaPhone": true,
    "webhookId": 22,
    "userIds": [ 1, 2, 3 ],
    "isNotifyMaxWarning": true,
    "isNotifyMaxCritical": true,
    "isNotifyNormal": true,
    "isNotifyMinWarning": true,
    "isNotifyMinCritical": true,
    "minTimeNormal" : 0,
    "delay": 60,                    // in minutes. Notification will be sent only after {delay} minutes in abnormal state
    "noSpam": 60,                   // in minutes. Notification will not be sent for {noSpam} minutes after it has been sent
    "areBlackoutsInverted": false,
    "blackouts": [
        {
            "startTime": 60,        // minutes from beginning of day (60 = 01:00)
            "endTime": 120,         // minutes from beginning of day (120 = 02:00)
            "dayOfWeekMask": 64     // mask. 64 = 1000000 = Sunday (127 = 1111111 = All days)
        },
        {
            "startTime": 600,       // minutes from beginning of day (600 = 10:00)
            "endTime": 900,         // minutes from beginning of day (900 = 15:00)
            "dayOfWeekMask": 112    // mask. 112= 1110000 = Sunday, Monday, Tuesday
        }
    ]
}
        
Edit Notification (POST) - V2
Updates the metadata for the specified notification.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/notifications/{notificationId}
Request Method: POST
Request Body:
{
    "id": 1,
    "accountId": ".1.",
    "name": "name 1",
    "description": "desc 1",
    "isEnabled": true,
    "notifyViaEmail": true,
    "notifyViaSms": true,
    "notifyViaPhone": true,
    "webhookId": 22,
    "userIds": [ 1, 2, 3 ],
    "isNotifyMaxWarning": true,
    "isNotifyMaxCritical": true,
    "isNotifyNormal": true,
    "isNotifyMinWarning": true,
    "isNotifyMinCritical": true,
    "minTimeNormal" : 0,
    "delay": 60,                    // in minutes. Notification will be sent only after {delay} minutes in abnormal state
    "noSpam": 60,                   // in minutes. Notification will not be sent for {noSpam} minutes after it has been sent
    "areBlackoutsInverted": false,
    "blackouts": [
        {
            "startTime": 60,        // minutes from beginning of day (60 = 01:00)
            "endTime": 120,         // minutes from beginning of day (120 = 02:00)
            "dayOfWeekMask": 64     // mask. 64 = 1000000 = Sunday (127 = 1111111 = All days)
        },
        {
            "startTime": 600,       // minutes from beginning of day (600 = 10:00)
            "endTime": 900,         // minutes from beginning of day (900 = 15:00)
            "dayOfWeekMask": 112    // mask. 112= 1110000 = Sunday, Monday, Tuesday
        }
    ]
}

Response Status: 200 (OK)
Response Body:
{
    "id": 1,
    "accountId": ".1.",
    "name": "name 1",
    "description": "desc 1",
    "isEnabled": true,
    "notifyViaEmail": true,
    "notifyViaSms": true,
    "notifyViaPhone": true,
    "webhookId": 22,
    "userIds": [ 1, 2, 3 ],
    "isNotifyMaxWarning": true,
    "isNotifyMaxCritical": true,
    "isNotifyNormal": true,
    "minTimeNormal" : 0,
    "isNotifyMinWarning": true,
    "isNotifyMinCritical": true,
    "delay": 60,                    // in minutes. Notification will be sent only after {delay} minutes in abnormal state
    "noSpam": 60,                   // in minutes. Notification will not be sent for {noSpam} minutes after it has been sent
    "areBlackoutsInverted": false,
    "blackouts": [
        {
            "startTime": 60,        // minutes from beginning of day (60 = 01:00)
            "endTime": 120,         // minutes from beginning of day (120 = 02:00)
            "dayOfWeekMask": 64     // mask. 64 = 1000000 = Sunday (127 = 1111111 = All days)
        },
        {
            "startTime": 600,       // minutes from beginning of day (600 = 10:00)
            "endTime": 900,         // minutes from beginning of day (900 = 15:00)
            "dayOfWeekMask": 112    // mask. 112= 1110000 = Sunday, Monday, Tuesday
        }
    ]
}
        
Add Notification (POST) - V2
Creates a new notification for the specified account.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/notifications
Request Method: POST
Request Body:
{
    "id": 0, // 0 or null
    "accountId": ".1.",
    "name": "name 1",
    "description": "desc 1",
    "isEnabled": true,
    "notifyViaEmail": true,
    "notifyViaSms": true,
    "notifyViaPhone": true,
    "webhookId": 22,
    "userIds": [ 1, 2, 3 ],
    "isNotifyMaxWarning": true,
    "isNotifyMaxCritical": true,
    "isNotifyNormal": true,
    "isNotifyMinWarning": true,
    "isNotifyMinCritical": true,
    "minTimeNormal" : 0,
    "delay": 60,                    // in minutes. Notification will be sent only after {delay} minutes in abnormal state
    "noSpam": 60,                   // in minutes. Notification will not be sent for {noSpam} minutes after it has been sent
    "areBlackoutsInverted": false,
    "blackouts": [
        {
            "startTime": 60,        // minutes from beginning of day (60 = 01:00)
            "endTime": 120,         // minutes from beginning of day (120 = 02:00)
            "dayOfWeekMask": 64     // mask. 64 = 1000000 = Sunday (127 = 1111111 = All days)
        },
        {
            "startTime": 600,       // minutes from beginning of day (600 = 10:00)
            "endTime": 900,         // minutes from beginning of day (900 = 15:00)
            "dayOfWeekMask": 112    // mask. 112= 1110000 = Sunday, Monday, Tuesday
        }
    ]
}

Response Status: 200 (OK)
Response Body:
{
    "id": 1,
    "accountId": ".1.",
    "name": "name 1",
    "description": "desc 1",
    "isEnabled": true,
    "notifyViaEmail": true,
    "notifyViaSms": true,
    "notifyViaPhone": true,
    "webhookId": 22,
    "userIds": [ 1, 2, 3 ],
    "isNotifyMaxWarning": true,
    "isNotifyMaxCritical": true,
    "isNotifyNormal": true,
    "isNotifyMinWarning": true,
    "isNotifyMinCritical": true,
    "minTimeNormal" : 0,
    "delay": 60,                    // in minutes. Notification will be sent only after {delay} minutes in abnormal state
    "noSpam": 60,                   // in minutes. Notification will not be sent for {noSpam} minutes after it has been sent
    "areBlackoutsInverted": false,
    "blackouts": [
        {
            "startTime": 60,        // minutes from beginning of day (60 = 01:00)
            "endTime": 120,         // minutes from beginning of day (120 = 02:00)
            "dayOfWeekMask": 64     // mask. 64 = 1000000 = Sunday (127 = 1111111 = All days)
        },
        {
            "startTime": 600,       // minutes from beginning of day (600 = 10:00)
            "endTime": 900,         // minutes from beginning of day (900 = 15:00)
            "dayOfWeekMask": 112    // mask. 112= 1110000 = Sunday, Monday, Tuesday
        }
    ]
}
        
Delete Notification (DELETE)
Deletes the specified notification from the account and removes it from all assigned sensors. Returns the id of the deleted notification.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/notifications/{notificationId}
Request Method: DELETE

Response Status: 200 (OK)
Response Body: None
        
Complex Notifications
Usage Flow
In the Notifications section of the Swift Sensors Console, a new Complex (Composite) Notifications type is available. Complex (Composite) Notifications are useful when users want a combination of several sensors to act together to trigger a notification. A complex (composite) notification is sent only if the notification criteria is met for all attached sensors at the same time. To provide flexibility, notification criteria can be set to either abnormal or normal for each attached sensor, and up to four sensors can be attached to each complex (composite) notification.
For example, a user may wish to be notified if a cooler temperature is too high because the cooler door was left open. In this case, both cooler temperature and cooler door sensors would be attached to the complex (composite) notification with their notification criteria set to abnormal. In other scenarios, users may wish to be notified when some sensors are normal while others are abnormal.
Get All complex Notifications (GET) - V2
Get summary metadata for all complex notifications visible to the current user between the user's home account and the specified accountId. This metadata is used to present a list of all complex notification options, grouped by accountId, when editing complex notifications for a sensor in the specified accountId.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/complex-notifications
Request Method: GET

Response Status: 200 (OK)
Response Body: //Same as Get All Notifications
{
    // accountId: [ [ sensorNotificationId, name, usersCount, sensorsCount, isEnabled, category ] ]
    ".1.": [ [ 1, "Notification 1", 0, 0, true, 0 ] ]
}
        
Add complex Notification (POST) - V2
Creates a new complex notification for the specified account.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/complex-notifications
Request Method: POST
Request Body:
{
    "id": 0, // 0 or null
    "accountId": ".1.",
    "name": "name 1",
    "description": "desc 1",
    "isEnabled": true,
    "notifyViaEmail": true,
    "notifyViaSms": true,
    "notifyViaPhone": true,
    "webhookId": 22,
    "userIds": [ 1, 2, 3 ],
    "delay": 60,                    // in minutes. Notification will be sent only after {delay} minutes in abnormal state
    "count": 3,                     // number of sensors assigned to the notification
    "noSpam": 60,                   // in minutes. Notification will not be sent for {noSpam} minutes after it has been sent
    "areBlackoutsInverted": false,
    "blackouts": [
        {
            "startTime": 600,       // minutes from beginning of day (600 = 10:00)
            "endTime": 900,         // minutes from beginning of day (900 = 15:00)
            "dayOfWeekMask": 112    // mask. 112= 1110000 = Sunday, Monday, Tuesday (127 = 1111111 = All days)
        }
    ]
}

Response Status: 200 (OK)
Response Body: none
{
    "id": 0, // 0 or null
    "accountId": ".1.",
    "name": "name 1",
    "description": "desc 1",
    "isEnabled": true,
    "notifyViaEmail": true,
    "notifyViaSms": true,
    "notifyViaPhone": true,
    "webhookId": 22,
    "userIds": [ 1, 2, 3 ],
    "delay": 60,                    // in minutes. Notification will be sent only after {delay} minutes in abnormal state
    "count": 3,                     // number of sensors assigned to the notification
    "noSpam": 60,                   // in minutes. Notification will not be sent for {noSpam} minutes after it has been sent
    "areBlackoutsInverted": false,
    "blackouts": [
        {
            "startTime": 600,       // minutes from beginning of day (600 = 10:00)
            "endTime": 900,         // minutes from beginning of day (900 = 15:00)
            "dayOfWeekMask": 112    // mask. 112= 1110000 = Sunday, Monday, Tuesday (127 = 1111111 = All days)
        }
    ]
}
        
Get Complex Notification (POST) - V2
Gets the metadata associated to the specified complex notification.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/complex-notifications/{notificationId}
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    "id": 0, // 0 or null
    "accountId": ".1.",
    "name": "name 1",
    "description": "desc 1",
    "isEnabled": true,
    "notifyViaEmail": true,
    "notifyViaSms": true,
    "notifyViaPhone": true,
    "webhookId": 22,
    "userIds": [ 1, 2, 3 ],
    "delay": 60,                    // in minutes. Notification will be sent only after {delay} minutes in abnormal state
    "count": 3,                     // number of sensors assigned to the notification
    "noSpam": 60,                   // in minutes. Notification will not be sent for {noSpam} minutes after it has been sent
    "areBlackoutsInverted": false,
    "blackouts": [
        {
            "startTime": 600,       // minutes from beginning of day (600 = 10:00)
            "endTime": 900,         // minutes from beginning of day (900 = 15:00)
            "dayOfWeekMask": 112    // mask. 112= 1110000 = Sunday, Monday, Tuesday (127 = 1111111 = All days)
        }
    ]
}
        
Edit Complex Notification (POST) - V2
Updates the metadata for the specified complex notification.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/complex-notifications/{notificationId}
Request Method: POST
Request Body:
Request Body:
{
    "id": 0, // 0 or null
    "accountId": ".1.",
    "name": "name 1",
    "description": "desc 1",
    "isEnabled": true,
    "notifyViaEmail": true,
    "notifyViaSms": true,
    "notifyViaPhone": true,
    "webhookId": 22,
    "userIds": [ 1, 2, 3 ],
    "delay": 60,                    // in minutes. Notification will be sent only after {delay} minutes in abnormal state
    "count": 3,                     // number of sensors assigned to the notification
    "noSpam": 60,                   // in minutes. Notification will not be sent for {noSpam} minutes after it has been sent
    "areBlackoutsInverted": false,
    "blackouts": [
        {
            "startTime": 600,       // minutes from beginning of day (600 = 10:00)
            "endTime": 900,         // minutes from beginning of day (900 = 15:00)
            "dayOfWeekMask": 112    // mask. 112= 1110000 = Sunday, Monday, Tuesday (127 = 1111111 = All days)
        }
    ]
}

Response Status: 200 (OK)
Response Body:
{
    "id": 0, // 0 or null
    "accountId": ".1.",
    "name": "name 1",
    "description": "desc 1",
    "isEnabled": true,
    "notifyViaEmail": true,
    "notifyViaSms": true,
    "notifyViaPhone": true,
    "webhookId": 22,
    "userIds": [ 1, 2, 3 ],
    "delay": 60,                    // in minutes. Notification will be sent only after {delay} minutes in abnormal state
    "count": 3,                     // number of sensors assigned to the notification
    "noSpam": 60,                   // in minutes. Notification will not be sent for {noSpam} minutes after it has been sent
    "areBlackoutsInverted": false,
    "blackouts": [
        {
            "startTime": 600,       // minutes from beginning of day (600 = 10:00)
            "endTime": 900,         // minutes from beginning of day (900 = 15:00)
            "dayOfWeekMask": 112    // mask. 112= 1110000 = Sunday, Monday, Tuesday (127 = 1111111 = All days)
        }
    ]
}
        
Delete Complex Notification (DELETE) - V2
Deletes the specified notification from the account and removes it from all assigned sensors.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/complex-notifications/{notificationId}
Request Method: DELETE

Response Status: 200 (OK)
Response Body: none
        
Hardware Notifications
Get All Hardware Notifications (GET) - V2
Get summary metadata for all hardware notifications visible to the current user between the user's home account and the specified accountId. This metadata is used to present a list of all hardware notification options, grouped by accountId, when editing hardware notifications for a device/collector in the specified accountId.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/hardware-notifications
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    // accountId: [ [ hardwareNotificationId, name, usersCount, collectorsAndDevicesCount, isEnabled, category ] ]
    ".1.": [ [ 1, "Notification 1", 0, 0, true, 0 ] ]
}
        
Get Hardware Notification (GET) - V2
Gets the metadata for the specified hardware notification.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/hardware-notifications/{notificationId}
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    "id": 1,
    "accountId": ".1.",
    "name": "name 1",
    "description": "desc 1",
    "isEnabled": true,
    "notifyViaEmail": true,
    "notifyViaSms": true,
    "notifyViaPhone": true,
    "webhookId": 22,
    "userIds": [ 1, 2, 3 ],
    "isNotifyLostContact": true,        // offline
    "isNotifyOnline": false,            // online
    "isNotifyLowBattery": true,         // low battery     (devices only)
    "isNotifyNormalBattery": false,     // normal battery  (devices only)
    "isNotifyUnplugged": false          // unplugged probe (devices only)
}
        
Edit Hardware Notification (POST) - V2
Updates the metadata for the specified hardware notification.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/hardware-notifications/{notificationId}
Request Method: POST
Request Body:
{
    "id": 1,
    "accountId": ".1.",
    "name": "name 1",
    "description": "desc 1",
    "isEnabled": true,
    "notifyViaEmail": true,
    "notifyViaSms": true,
    "notifyViaPhone": true,
    "webhookId": 22,
    "userIds": [ 1, 2, 3 ],
    "isNotifyLostContact": true,        // offline
    "isNotifyOnline": false,            // online
    "isNotifyLowBattery": true,         // low battery     (devices only)
    "isNotifyNormalBattery": false,     // normal battery  (devices only)
    "isNotifyUnplugged": false          // unplugged probe (devices only)
}

Response Status: 200 (OK)
Response Body:
{
    "id": 1,
    "accountId": ".1.",
    "name": "name 1",
    "description": "desc 1",
    "isEnabled": true,
    "notifyViaEmail": true,
    "notifyViaSms": true,
    "notifyViaPhone": true,
    "webhookId": 22,
    "userIds": [ 1, 2, 3 ],
    "isNotifyLostContact": true,        // offline
    "isNotifyOnline": false,            // online
    "isNotifyLowBattery": true,         // low battery     (devices only)
    "isNotifyNormalBattery": false,     // normal battery  (devices only)
    "isNotifyUnplugged": false          // unplugged probe (devices only)
}
        
Add Hardware Notification (POST) - V2
Creates a new hardware notification for the specified account.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/hardware-notifications
Request Method: POST
Request Body:
{
    "id": 0, // 0 or null
    "accountId": ".1.",
    "name": "name 1",
    "description": "desc 1",
    "isEnabled": true,
    "notifyViaEmail": true,
    "notifyViaSms": true,
    "notifyViaPhone": true,
    "webhookId": 22,
    "userIds": [ 1, 2, 3 ],
    "isNotifyLostContact": true,        // offline
    "isNotifyOnline": false,            // online
    "isNotifyLowBattery": true,         // low battery     (devices only)
    "isNotifyNormalBattery": false,     // normal battery  (devices only)
    "isNotifyUnplugged": false          // unplugged probe (devices only)
}
Response Status: 200 (OK)
Response Body:
{
    "id": 1,
    "accountId": ".1.",
    "name": "name 1",
    "description": "desc 1",
    "isEnabled": true,
    "notifyViaEmail": true,
    "notifyViaSms": true,
    "notifyViaPhone": true,
    "webhookId": 22,
    "userIds": [ 1, 2, 3 ],
    "isNotifyLostContact": true,        // offline
    "isNotifyOnline": false,            // online
    "isNotifyLowBattery": true,         // low battery     (devices only)
    "isNotifyNormalBattery": false,     // normal battery  (devices only)
    "isNotifyUnplugged": false          // unplugged probe (devices only)
}
        
Delete Hardware Notification (DELETE)
Deletes the specified hardware notification from the account and removes it from all assigned sensors. Returns the id of the deleted notification.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/hardware-notifications/{notificationId}
Request Method: DELETE

Response Status: 200 (OK)
Response Body: None
        
Test Notification
Usage Flow
Users can easily test that a sensor, complex, or hardware notification is completely setup and that the notification system is working as expected. The Test Notification page first verifies that setup is complete, and, if necessary, informs the user about missing steps needed to complete setup. When the bell button is pressed, a test notification is immediately sent to all selected users using all selected delivery methods. Users can verify that emails from no-reply@swiftsensors.com are not intercepted by anti-spam filters, and that SMS and voice messages are delivered to their mobile device. The test can be accessed using the Test Notification button on any notification details page.
Send Test Sensor Notification (POST) - V1
Send a test notification to all users attached to the sensor notification.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/notifications/{notificationId}/test
Request Method: POST
Request Body: none

Response Status: 200 (OK)
Response Body: none
        
Send Test Complex Notification (POST) - V1
Send a test notification to all users attached to the complex notification.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/complex-notifications/{notificationId}/test
Request Method: POST
Request Body: none

Response Status: 200 (OK)
Response Body: none
        
Send Test Hardware Notification (POST) - V1
Send a test notification to all users attached to the hardware notification.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/hardware-notifications/{notificationId}/test
Request Method: POST
Request Body: none

Response Status: 200 (OK)
Response Body: none
        
Sensor --> Sensor Notifications
Rules of Association
This section focuses on managing associations from a sensor to one or more sensor notifications, according to the following rules:
A sensor notification must be from the sensor's account or an ancestor account.
A user can only see and manage sensor notifications between their home account and the current account. The Get All Notifications (GET) - V2 endpoint returns the complete set of sensor notifications that are both eligible to be associated with a sensor on the given account, and are also visible to the current user.
Get Sensor Notifications assigned to Sensor (GET) - V2
Get sensorNotificationIds, grouped by accountId, currently assigned to the specified sensorId that are visible to the current user between the user's home account and the specified accountId.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/sensors/{sensorId}/notifications
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    // accountId: [ sensorNotificationIds ]
    ".1.": [ 1, 2 ]
}
        
Edit Sensor Notifications assigned to Sensor (POST) - V2
Edit sensorNotificationIds currently assigned to the given sensorId that are visible to the current user between the user's home account and the specified accountId. The server will replace the visible subset of sensorNotificationIds with the specified sensorNotificationIds.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/sensors/{sensorId}/notifications
Request Method: POST
Request Body:
// [ sensorNotificationIds ]
[ 1, 2 ]

Response Status: 200 (OK)
Response Body:
{
    // accountId: [ sensorNotificationIds ]
    ".1.": [ 1, 2 ]
}
        
Sensor Notification --> Sensors
Rules of Association
This section focuses on managing associations from a sensor notification to one or more sensors, according to the following rules:
A sensor must be from the sensor notification's account or a descendant subaccount.
When editing sensor associations to a sensor notification, a user can see and select from sensors from the sensor notification's account or any descendant subaccount, one account at a time. The Get Visible Sensors (GET) - V2 endpoint returns all sensors for a given account, if the user has access to this account based on their multi-account role.
Get Sensors assigned to Sensor Notification (GET) - V2
Get sensors, grouped by accountId, currently assigned to the specified notificationId that are visible to the current user based on their multi-account role.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/notifications/{notificationId}/sensors
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    // accountId: [[sensorId, deviceName, profileName, unitId, time, sampleRate, value, thresholdStatus, precision, isHidden, conversionId]]
    ".1.": [
        [ 1, "Sensor (89:00)", "Humidity",    4, 1507567003, 60, 10, 0, 0, false, null ],
        [ 2, "Sensor (89:01)", "Temperature", 1, 1507567002, 60, 11, 0, 0, false, null ]
    ],
    ".1.2.": [
        [ 3, "Sensor (89:03)", "Humidity",    4, 1507567003, 60, 22, 0, 0, false, null ]
    ]
}
        
Edit Sensors assigned to Sensor Notification (POST) - V2
Edit sensor ids currently assigned to the given notificationId that are visible to the current user. The server will replace the visible subset of sensor ids owned by the sensor accountId with the specified sensor ids.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/notifications/{notificationId}/sensors
Request Method: POST
Request Body:
{
    "accountId": ".1.", // sensor accountId
    "ids": [ 1, 2, 3 ]  // sensor ids
}

Response Status: 200 (OK)
Response Body:
{
    // sensorsAccountId: [ sensorIds ]
    ".1.": [ 1, 2, 3 ]
}
        
Get Visible Sensors (GET) - V2
Get summary metadata for all sensors in an account. This metadata is used to present a list of sensor options for the specified accountId when associating sensors to a sensor notification, if the user has access to this account based on their multi-account role.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/sensors/visible
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    // accountId: [[sensorId, deviceName, profileName, unitId, time, sampleRate, value, thresholdStatus, precision, isHidden, conversionId]]
    ".1.": [
        [ 1, "Sensor (89:00)", "Humidity",    4, 1507567003, 60, 10, 0, 0, false, null ],
        [ 2, "Sensor (89:01)", "Temperature", 1, 1507567002, 60, 11, 0, 0, false, null ]
    ]
}
        
Sensor --> Complex Notifications
Get Complex Notifications assigned to Sensor (GET) - V2
Get all complex notifications assigned to the specified sensor organized by account.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/sensors/{sensorId}/complex-notifications
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    ".1.3.": { "1": false },			                    // "accountId": { "notificationId": isNotifyOnNormal }
    ".1.":   { "2": true }
}
        
Complex Notification --> Sensors
Get Sensors assigned to Complex Notification (GET) - V2
Get sensors, grouped by accountId, currently assigned to the specified complex notificationId that are visible to the current user based on their multi-account role. The webapp client may enforce that all sensors belong to the same account, a minimum of 2 sensors without a warning, and a maximum of 4 sensors.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/complex-notifications/{notificationId}/sensors
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    ".1.3.": [ // accountId
        // [sensorId,deviceName,profileName,unitId,time,sampleRate,value,thresholdStatus,precision,isHidden,conversionId,isNotifyOnNormal]
        [ 1, "Sensor (00:00)", "Temperature", 1, 1507567003, 60,  0.0, 0, 1, false, null, false ],
        [ 2, "Sensor (00:00)", "Humidity",    4, 1507567003, 60, 10.0, 0, 0, false, null, true  ]
    ]
}
        
Edit Sensors assigned to Complex Notification (POST) - V2
Edit sensor ids currently assigned to the given complex notificationId that are visible to the current user. The server will replace the visible subset of sensor ids owned by the sensor accountId with the specified sensor ids.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/complex-notifications/{notificationId}/sensors
Request Method: POST
Request Body:
{
    "accountId": ".1.3.",							        // accountId
    "map": { "10": false, "11": true, "12": false }			// "map": { "sensorId": isNotifyOnNormal }
}

Response Status: 200 (OK)
Response Body:
{
    ".1.3.": { "10": false, "11": true, "12": false }       // "accountId": { "sensorId": isNotifyOnNormal }
}
        
Hardware --> Hardware Notifications
Rules of Association
This section focuses on managing associations from a collector/device to one or more hardware notifications, according to the following rules:
An hardware notification must be from the collector/device's account or an ancestor account.
A user can only see and manage hardware notifications between their home account and the current account. The Get All Hardware Notifications (GET) - V2 endpoint returns the complete set of hardware notifications that are both eligible to be associated with a collector/device on the given account, and are also visible to the current user.
Get Hardware Notifications assigned to Collector (GET) - V2
Get hardwareNotificationIds, grouped by accountId, currently assigned to the specified collectorId that are visible to the current user between the user's home account and the specified accountId.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/collectors/{collectorId}/hardware-notifications
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    // accountId: [ hardwareNotificationIds ]
    ".1.": [ 1, 2 ]
}
        
Get Hardware Notifications assigned to Device (GET) - V2
Get hardwareNotificationIds, grouped by accountId, currently assigned to the specified deviceId that are visible to the current user between the user's home account and the specified accountId.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/devices/{deviceId}/hardware-notifications
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    // accountId: [ hardwareNotificationIds ]
    ".1.": [ 1, 2 ]
}
        
Edit Hardware Notifications assigned to Collector (POST) - V2
Edit hardwareNotificationIds currently assigned to the given collectorId that are visible to the current user between the user's home account and the specified accountId. The server will replace the visible subset of hardwareNotificationIds with the specified hardwareNotificationIds.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/collectors/{collectorId}/hardware-notifications
Request Method: POST
Request Body:
// [ hardwareNotificationIds ]
[ 1, 2 ]

Response Status: 200 (OK)
Response Body:
{
    // accountId: [ hardwareNotificationIds ]
    ".1.": [ 1, 2 ]
}
        
Edit Hardware Notifications assigned to Device (POST) - V2
Edit hardwareNotificationIds currently assigned to the given deviceId that are visible to the current user between the user's home account and the specified accountId. The server will replace the visible subset of hardwareNotificationIds with the specified hardwareNotificationIds.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/devices/{deviceId}/hardware-notifications
Request Method: POST
Request Body:
// [ hardwareNotificationIds ]
[ 1, 2 ]

Response Status: 200 (OK)
Response Body:
{
    // accountId: [ hardwareNotificationIds ]
    ".1.": [ 1, 2 ]
}
        
Hardware Notification --> Hardware
Rules of Association
This section focuses on managing associations from a hardware notification to one or more collectors/devices, according to the following rules:
A collector/device must be from the hardware notification's account or a descendant subaccount.
When editing collector/device associations to a hardware notification, a user can see and select from collectors/devices from the hardware notification's account or any descendant subaccount, one account at a time. The Get Visible Collectors (GET) - V2 and Get Visible Devices (GET) - V2 endpoints return all collectors/devices for a given account, if the user has access to this account based on their multi-account role.
Get Collectors assigned to Hardware Notification (GET) - V2
Get collectors, grouped by accountId, currently assigned to the specified hardwareNotificationId that are visible to the current user based on their multi-account role.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/hardware-notifications/{hardwareNotificationId}/collectors
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    // accountId: [[collectorId, collectorName, lastContactTime, batteryLevel]]

    ".1.": [
        [ 1, "Sensor (89:00)", 12345678, 100 ],
        [ 2, "Sensor (89:01)", 12345677, 93 ]
    ],
    ".1.2.": [
        [ 3, "Sensor (89:03)", 12345667, 40 ]
    ]
}
        
Get Devices assigned to Hardware Notification (GET) - V2
Get devices, grouped by accountId, currently assigned to the specified hardwareNotificationId that are visible to the current user based on their multi-account role.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/hardware-notifications/{hardwareNotificationId}/devices
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    // accountId: [[deviceId, deviceName, lastContactTime, batteryLevel]]

    ".1.": [
        [ 1, "Sensor (89:00)", 12345678, 100 ],
        [ 2, "Sensor (89:01)", 12345677, 93 ]
    ],
    ".1.2.": [
        [ 3, "Sensor (89:03)", 12345667, 40 ]
    ]
}
        
Edit Collectors assigned to Hardware Notification (POST) - V2
Edit collectorIds (owned by accountId) currently assigned to the given hardwareNotificationId that are visible to the current user. The server will replace the visible subset of collectorIds owned by the accountId with the specified collectorIds.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/hardware-notifications/{notificationId}/collectors
Request Method: POST
Request Body:
{
    "accountId": ".1.", // collectors accountId
    "ids": [ 1, 2, 3 ]  // collector ids
}

Response Status: 200 (OK)
Response Body:
{
    // collectorsAccountId: [ collectorIds ]
    ".1.": [ 1, 2, 3 ]
}
        
Edit Devices assigned to Hardware Notification (POST) - V2
Edit collectoeIs/deviceIds (owned by accountId) currently assigned to the given hardwareNotificationId that are visible to the current user. The server will replace the visible subset of collectorIds owned by the accountId with the specified collectorIds.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/hardware-notifications/{notificationId}/devices
Request Method: POST
Request Body:
{
    "accountId": ".1.", // devices accountId
    "ids": [ 1, 2, 3 ]  // device ids
}

Response Status: 200 (OK)
Response Body:
{
    // devicesAccountId: [ deviceIds ]
    ".1.": [ 1, 2, 3 ]
}
        
Get Visible Collectors (GET) - V2
Get summary metadata for all collectors in an account. This metadata is used to present a list of collectors options for the specified accountId when associating collectors to an hardware notification, if the user has access to this account based on their multi-account role.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/collectors/visible
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
     // accountId: [[collectorId, collectorName, lastContactTime, batteryLevel]]

    ".1.": [
        [ 1, "Sensor (89:00)", 12345678, 100 ],
        [ 2, "Sensor (89:01)", 12345677, 93 ]
    ]
}
        
Get Visible Devices (GET) - V2
Get summary metadata for all collectors in an account. This metadata is used to present a list of devices options for the specified accountId when associating devices to an hardware notification, if the user has access to this account based on their multi-account role.

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/devices/visible
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
     // accountId: [[deviceId, deviceName, lastContactTime, batteryLevel]]

    ".1.": [
        [ 1, "Sensor (89:00)", 12345678, 100 ],
        [ 2, "Sensor (89:01)", 12345677, 93 ]
    ]
}
        
Time Series Data
Get Sensor Time Series (POST)
Gets the historical sample and/or note data for the specified sensor(s).
Resolution vs. Perfomance
Managing the resolution of time series data is important to guarantee consistent rendering performance of your web or mobile app, especially when rendering multiple charts for longer time spans ranging from days to months or even years. As the user zooms out, it is useful to gradually decrease the resolution to keep the total number of points below a certain maximum limit, since some devices may struggle with rendering so many points, and there aren’t enough pixels on the screen to render that much detail. This maximum limit depends on many factors and is up to the judgement of the developer. Conversely, it is important to show all available data points at full resolution when zooming into small sections of the chart. Data resolution is controlled by the parameters influxFn and groupByMinutes.
Parameters
startTime The start of the requested time range in Unix epoch seconds by default, or milliseconds if the timeUnitDesignation parameter is "milliseconds" .
endTime The end of the requested time range in Unix epoch seconds by default, or milliseconds if the timeUnitDesignation parameter is "milliseconds" .
influxFn The function to be applied to the sample data. A null   value applies no function, therefore raw sample data at full resolution is returned. A "MEAN"   value applies the mathematical mean function, causing sample data to be averaged together based on discrete time segments of a duration set by the parameter groupByMinutes.
groupByMinutes Used if the parameter influxFn is set to "MEAN" . The value should be a positive integer specifying the duration, in minutes, of each averaged time segment. For example, to get hourly averages, set the value to 60 .
ids Specifies an array of one or more requested sensor ids.
type (optional)   Specifies the type of time-series data being requested:
"samples"   sample data only
"notes"   note data only
null   (default)   sample data and note data
timeUnitDesignation (optional)   Specifies the time unit format of the request and the response.
"seconds"   (default)   Unix epoch time is expressed in seconds.
"milliseconds"   Unix epoch time is expressed in milliseconds. Be sure to also specify startTime and endTime in milliseconds.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/time-series/sensor
Request Method: POST
Request Body:
{
    "startTime": 1718653104734,
    "endTime": 1718655739846,
    "influxFn": "MEAN",
    "groupByMinutes": 5,                    // required only if influxFn is not null
    "ids": [ 4, 6 ],
    "type": "samples",
    "timeUnitDesignation": "milliseconds"
}

Response Status: 200 (OK)
Response Body:
{
    "startTime": 1.718653104734E12,
    "endTime": 1.718655739846E12,
    "timeSeriesData": [
        {
            "id": 4,
            "samples": [
                [ 1.718653104734E12, 73.23 ],                                     // time, value
                [ 1.718654408236E12, 83.0  ],
                [ 1.718655738033E12, 333.1 ],
                [ 1.718655739846E12, 71.00 ]
            ],
            "notes": [
                [ 1.718654408236E12, 83.0,  "My note 1", 123, 1.718655787677E12], // time, value, noteText, noteUserId, noteEditTime
                [ 1.718655738033E12, 333.1, "My note 2", 234, 1.718656733734E12]
            ]
        }
    ]
}
        
Add/Edit/Delete Note (POST)
Add/Edit/Delete a note for the specified sensor value at the specified time. Each note supports two parts: the original note describing a problem or a call to action, and an optional resolution to the note which can be added by a different user at a later time. Each of these two note parts also contains auto-generated metadata including the author's user id and the time when that note part was added or edited.
Parameters
time The timestamp of the note in Unix epoch seconds by default, or milliseconds if the timeUnit parameter is "milliseconds" .
value The measurement value the note is referencing, or 0 if the note is referencing a gap in the data.
note The text of the note itself, up to 400 characters long. If the note value is null or empty, the note part specified by the noteIndex is deleted, including the auto-generated metadata.
timeUnit (optional)   Specifies the Unix epoch time unit in the request.
"seconds"   (default)   Unix epoch time is expressed in seconds.
"milliseconds"   Unix epoch time is expressed in milliseconds.
noteIndex (optional)   Specifies which part of the note is being added / modified / deleted. A note will exist as long as at least one of the two parts exists. To completely delete a note with two parts, each part must be deleted with a dedicated query. This parameter is optional to maintain backwards compatibility for legacy applications with notes that do not support two parts.
0   (default)   specifies the original note describing a problem or a call to action.
1   specifies an optional resolution to the note.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/time-series/sensor/{sensorId}/notes
Request Method: POST
Request Body:
{
    "time": 1718653104734,
    "value": 56.789,
    "note": "sensor was placed in the fridge",   // null if deleting the note
    "timeUnit": "milliseconds"
}

Response Status: 200 (OK)
Response Body: None
        
Get Device Battery Time Series (POST)
Gets the historical battery percent samples for the specified device(s). Time is sent in epoch format (seconds elapsed since January 1, 1970 GMT).

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/time-series/device-battery
Request Method: POST
Request Body:
{
    "startTime": 12345,
    "endTime": 56789,
    "influxFn": "MEAN",
    "groupByMinutes": 5,
    "ids": [ 4, 6 ]
}

Response Status: 200 (OK)
Response Body:
{
    "startTime": 12345,
    "endTime": 56789,
    "timeSeriesData": [
        {
            "id": 4,
            "samples": [
                [ 12345.0, 100 ],
                [ 12347.0, 99 ],
                [ 123525.0, 98 ],
                [ 123546.0, 97 ]
            ]
        }
    ]
}
        
Get Collector Position Time Series (POST)
Gets the historical latitude/longitude samples for the specified collectors(s). Time is sent in epoch format (seconds elapsed since January 1, 1970 GMT).

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/time-series/collector-position
Request Method: POST
Request Body:
{
    "startTime": 12345,
    "endTime": 56789,
    "influxFn": "MEAN",
    "groupByMinutes": 5,
    "ids": [ 4, 6 ]
}

Response Status: 200 (OK)
Response Body:
{
    "startTime": 12345,
    "endTime": 56789,
    "timeSeriesData": [
        {
            "id": 4,
            "samples": [
                [ 12345.0, 30.286675, -97.814845 ],
                [ 12347.0, 30.286675, -97.814845 ],
                [ 123525.0, 30.286675, -97.814845 ],
                [ 123546.0, 30.286675, -97.814845 ]
            ]
        }
    ]
}
        
Users
Get All Users (GET)
Gets the list of users for the specified account.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/users
Request Method: GET

Response Status: 200 (OK)
Response Body:
[
    {
        "id": 81,
        "accountId": ".1.",
        "roleId": 1,
        "firstName": "John",
        "middleName": "",
        "lastName": "Doe",
        "isEnabled": true,
        "notificationIds": [ 2, 3 ],
        "complexNotificationIds": [ 2, 3 ], // composite notifications
        "hardwareNotificationIds": [ 22, 23 ]
    }
]
        
Get User (GET)
Gets the metadata associated to the specified user.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/users/{userId}
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    "id": 81,
    "accountId": ".1.",
    "roleId": 1,
    "firstName": "John",
    "middleName": "",
    "lastName": "Doe",
    "isEnabled": true,
    "notificationIds": [ 2, 3 ],
    "complexNotificationIds": [ 2, 3 ], // composite notifications
    "hardwareNotificationIds": [ 22, 23 ],
    "roleName": "Administrator",
    "email": "user@domain.com",
    "isEmailValid": true,
    "timeZone": {
        "timeZoneId": "America/Chicago",
        "regionId": "America",
        "locale": "Chicago",
        "abbreviation": "CST",
        "observesDst": true,
        "offsetDst": 60,
        "Offset": -360,
        "offsetDisplay": "-06:00",
        "inDaylightTime": true
    },
    "language": "en",
    "phone": { "countryId": "US +1", "phoneNumber": "123.456.7890" },
    "pendingEmail": "john@example.com",
    "pendingPhone": { "countryId": "US +1", "phoneNumber": "1234567890" },
    "notificationPreferences": 0        // get monthly summary emails: 0=no, 1=yes
}
        
Get User Info (GET)
Gets the user’s profile info associated to the authorization header supplied on the request.

Request URL: https://api.swiftsensors.net/api/user-info/v1
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    "id": 81,
    "accountId": ".1.",
    "roleId": 1,
    "firstName": "John",
    "middleName": "",
    "lastName": "Doe",
    "isEnabled": true,
    "notificationIds": [ 2, 3 ],
    "complexNotificationIds": [ 2, 3 ], // composite notifications
    "hardwareNotificationIds": [ 22, 23 ],
    "roleName": "Administrator",
    "email": "user@domain.com",
    "isEmailValid": true,
    "timeZone": {
        "timeZoneId": "America/Chicago",
        "regionId": "America",
        "locale": "Chicago",
        "abbreviation": "CST",
        "observesDst": true,
        "offsetDst": 60,
        "Offset": -360,
        "offsetDisplay": "-06:00",
        "inDaylightTime": true
    },
    "language": "en",
    "phone": { "countryId": "US +1", "phoneNumber": "123.456.7890" },
    "pendingEmail": "john@example.com",
    "pendingPhone": { "countryId": "US +1", "phoneNumber": "1234567890" },
    "preferences": "{JSON String}",
    "notificationPreferences": 0        // get monthly summary emails: 0=no, 1=yes
}
        
Edit User (POST)
Updates the metadata for the specified user. Phone and email cannot be changed through the edit user flow. Updating preferences are only allowed for the currently authenticated user.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/users/{userId}
Request Method: POST
Request Body:
{
    "id": 81,
    "accountId": ".1.",
    "roleId": 1,
    "firstName": "John",
    "middleName": "",
    "lastName": "Doe",
    "isEnabled": true,
    "notificationIds": [ 2, 3 ],
    "complexNotificationIds": [ 2, 3 ], // composite notifications
    "hardwareNotificationIds": [ 22, 23 ],
    "roleName": "Administrator",
    "email": "user@domain.com",
    "isEmailValid": true,
    "timeZone": {
        "timeZoneId": "America/Chicago",
        "regionId": "America",
        "locale": "Chicago",
        "abbreviation": "CST",
        "observesDst": true,
        "offsetDst": 60,
        "Offset": -360,
        "offsetDisplay": "-06:00",
        "inDaylightTime": true
    },
    "language": "en",
    "phone": { "countryId": "US +1", "phoneNumber": "123.456.7890" },
    "pendingEmail": "john@example.com",
    "pendingPhone": { "countryId": "US +1", "phoneNumber": "1234567890" },
    "preferences": "{JSON String}",
    "notificationPreferences": 0        // get monthly summary emails: 0=no, 1=yes
}

Response Status: 200 (OK)
Response Body:
{
    "id": 81,
    "accountId": ".1.",
    "roleId": 1,
    "firstName": "John",
    "middleName": "",
    "lastName": "Doe",
    "isEnabled": true,
    "notificationIds": [ 2, 3 ],
    "complexNotificationIds": [ 2, 3 ], // composite notifications
    "hardwareNotificationIds": [ 22, 23 ],
    "roleName": "Administrator",
    "email": "user@domain.com",
    "isEmailValid": true,
    "timeZone": {
        "timeZoneId": "America/Chicago",
        "regionId": "America",
        "locale": "Chicago",
        "abbreviation": "CST",
        "observesDst": true,
        "offsetDst": 60,
        "Offset": -360,
        "offsetDisplay": "-06:00",
        "inDaylightTime": true
    },
    "language": 0,
    "phone": { "countryId": "US +1", "phoneNumber": "123.456.7890" },
    "pendingEmail": "john@example.com",
    "pendingPhone": { "countryId": "US +1", "phoneNumber": "1234567890" },
    "notificationPreferences": 0        // get monthly summary emails: 0=no, 1=yes
}
        
Add User (POST)
Creates a new user for the specified account. A password is required to create the new account.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/users
Request Method: POST
Request Body:
{
    "id": 0, // 0 or null
    "accountId": ".1.",
    "roleId": 1,
    "firstName": "John",
    "middleName": "",
    "lastName": "Doe",
    "isEnabled": true,
    "notificationIds": [ 2, 3 ],
    "complexNotificationIds": [ 2, 3 ], // composite notifications
    "hardwareNotificationIds": [ 22, 23 ],
    "roleName": "Administrator",
    "email": "user@domain.com",
    "timeZone": {
        "timeZoneId": "America/Chicago",
        "regionId": "America",
        "locale": "Chicago",
        "abbreviation": "CST",
        "observesDst": true,
        "offsetDst": 60,
        "Offset": -360,
        "offsetDisplay": "-06:00",
        "inDaylightTime": true
    },
    "language": "en",
    "phone": { "countryId": "US +1", "phoneNumber": "123.456.7890" },
    "password": "password",
    "notificationPreferences": 0        // get monthly summary emails: 0=no, 1=yes
}

Response Status: 200 (OK)
Response Body:
{
    "id": 81,
    "accountId": ".1.",
    "roleId": 1,
    "email": "user@domain.com",
    "isEmailValid": true,
    "firstName": "John",
    "middleName": "",
    "lastName": "Doe",
    "swiftId": 258,
    "roleName": "Administrator",
    "timeZone": {
        "timeZoneId": "America/Chicago",
        "regionId": "America",
        "locale": "Chicago",
        "abbreviation": "CST",
        "observesDst": true,
        "offsetDst": 60,
        "offset": -360,
        "offsetDisplay": "-06:00",
        "inDaylightTime": true
    },
    "language": "en",
    "isEnabled": true,
    "phone": { "countryId": "US +1", "phoneNumber": "1234567890" },
    "displayPhoneNumber": "123.456.7890",
    "notificationIds": [ ],
    "complexNotificationIds": [ 2, 3 ], // composite notifications
    "hardwareNotificationIds": [ ],
    "notificationPreferences": 0        // get monthly summary emails: 0=no, 1=yes
}
        
Delete User (DELETE)
Deletes the user from the specified account. The user will be removed from any assigned notifications.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/users/{userId}
Request Method: DELETE

Response Status: 200 (OK)
Response Body: None
        
User Profile
Reset Password Request (POST)
Sends an email to the specified email address with a link that will allow the users to input a new password. The recaptcha is populated via Google’s reCAPTChA service and control.

Request URL: https://api.swiftsensors.net/api/client/v1/request-reset-password
Request Method: POST
Content-Type: application/json
Request Body:
{
    "email": "email@clientapp.com",
    "recaptcha": "blank"
}

Response Status: 200 (OK)
Response Body: None
        
Reset Password (POST)
Changes the user’s password to the specified "newPassword" for the user with the same email address specified. The code match the code that was emailed to the email address.

Page    URL: https://api.swiftsensors.net/reset-password/{email}/{code}
Request URL: https://api.swiftsensors.net/api/client/v1/reset-password
Request Method: POST
Content-Type: application/json
Request Body:
{
    "email": "email@clientapp.com",
    "code": "ABCDE",
    "newPassword": "abc12345"
}

Response Status: 200 (OK)
Response Body: None
        
Change Password (POST)
Changes a user’s password to the new password. For a user to change their own password, they must supply the correct current password. This is not required for an administrator.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/users/{userId}/change-password
Request Method: POST
Content-Type: application/json
Request Body:
{
    "userId": 1,
    "currentPassword": "abc12345", // Optional for administrators to change password for other users
    "newPassword": "abc12345"
}

Response Status: 200 (OK)
Response Body: None
        
Edit User Email (POST)
Sends a verification email to the specified email address for the user. The user must follow the link and authenticate to verify the email address. Administrators can "skip" the verification process and immediately set the new email address by specifying "skipVerify" as true.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/users/{userId}/email
Request Method: POST
Content-Type: application/json
Request Body:
{
    "email": "email@swiftsensors.com"
}

Response Status: 200 (OK)
Response Body: None
        
Verify Email (POST)
"Authorization" header containing a valid bearer token is not required with this request.
Verifies the new email address for the user and changes the email address of the user to the new email address.

Page    URL: https://api.swiftsensors.net/verify-email/{oldEmail}/{newEmail}/{code}
Request URL: https://api.swiftsensors.net/api/client/v1/verify-email
Request Method: POST
Content-Type: application/json
Request Body:
{
    "oldEmail": "a@b.com",
    "password": "ABCDE",
    "code": "ABCDE"
}

Response Status: 200 (OK)
Response Body: None
        
Cancel Email Change (DELETE)
Cancels the new email verification process.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/users/{userId}/email/verify
Request Method: DELETE
Request Body: None

Response Status: 200 (OK)
Response Body: None
        
Edit User Phone Number (POST)
Sends a verification SMS to the specified phone number for the user. The user must verify the phone number with the code provided in the SMS message. Administrators can "skip" the verification process and immediately set the new phone number by specifying "skipVerify" as true.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/users/{userId}/phone
Request Method: POST
Content-Type: application/json
Request Body:
{
    "userId": 1,
    "countryId": "US +1",
    "phoneNumber": "1234567890",
    "skipVerify": false // Administrators only
}

Response Status: 200 (OK)
Response Body: None
        
Delete User Phone Number (DELETE)
Removes the phone number for the user.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/users/{userId}/phone
Request Method: DELETE
Request Body: None

Response Status: 200 (OK)
Response Body: None
        
Verify Phone Number (POST)
Verifies the new phone number for the user and changes the phone number of the user to the new phone number.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/users/{userId}/phone/verify
Request Method: POST
Content-Type: application/json
Request Body:
{
    "userId": 1,
    "code": "ABCDE"
}

Response Status: 200 (OK)
Response Body: None
        
Cancel Phone Number Verification (DELETE)
Cancels the new phone number verification process.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/users/{userId}/phone/verify
Request Method: DELETE
Request Body: None

Response Status: 200 (OK)
Response Body: None
        
Brand Info
Get Brand Info (GET)
"Authorization" header containing a valid bearer token is not required with this request.
Gets brand info for the specified brandId. BrandId is a non-guessable alpha-numeric string linked to an account. Brand info includes the labelName string for the Swift Sensors service provider used in email notifications and error messages, logoRectId rectangular logo used on the sign-in page and the navbar, and logoSquareId square logo used on the phone navbar. Each of the three items includes a corresponding isCustom flag which tells if each not-null item is customized on this account (true), or inherited from a parent account (false).

Request URL: https://api.swiftsensors.net/api/client/v1/brand/{brandId}
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    "brandId": "d3hJ22pzHsSe",      // non-guessable alpha-numeric string linked to an account
    "accountId": ".1.",             // account linked to by this brandId

    "labelName": "Sysco",           // null means brand label defaults to "Swift Sensors"
    "logoRectId": "1440774994",     // null means rectangular logo defeaults to the Swift Sensors logo
    "logoSquareId": "1440774994",   // null means square logo defaults to the Swift Sensors "signal" logo

    "isCustomLabel": true,
    "isCustomLogoRect": false,
    "isCustomLogoSquare": false
}
        
Edit Brand Info (POST)
Sets a brand string for an account. This string will be used in notification (email/sms) replacing Swift Sensors.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/brand
Request Method: POST
{
    "labelName": "Sysco"    // max length: 64 characters. Empty String indicates custom brand label should be deleted
}

Response Status: 200 (OK)
Response Body: None
        
Brand Logo
Upload Brand Logo (POST)
Uploads and replaces the binary image data for the specified logo type. Supported types: logo_rect, logo_square.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/logo/{type}
Request Method: POST
Request Body: Multipart form data containing a single image "file"

Response Status: 200 (OK)
Response Body: None
        
Delete Brand Logo (DELETE)
Deletes the binary image data for the specified logo type. Supported types: logo_rect, logo_square.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/logo/{type}
Request Method: DELETE

Response Status: 200 (OK)
Response Body: None
        
Photo Image
Upload Image (POST)
Uploads and replaces the binary image data for the specified type and id. Supported types include: account, group, sensorgroup, collector, device. The recordId is the id of the specified object.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/images/{type}/{recordId}
Request Method: POST
Request Body: Multipart form data containing a single image "file" and a boolean field "usePositionData" indicating
              whether or not to extract any GPS data encoded in the image

Response Status: 200 (OK)
Response Body: https://s3-us-west-2.amazonaws.com/swift-images/non-guessable-unique-id.jpeg // image URL
        
Delete Image (DELETE)
Deletes the binary image data for the specified type and id. Supported types include: account, group, sensorgroup, collector, device. The recordId is the id of the specified object.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/images/{type}/{recordId}
Request Method: DELETE

Response Status: 200 (OK)
Response Body: None
        
Export
Export Sensor Time Series to CSV (POST)
Exports the historical data for the specified sensors to a CSV file and either downloads the file or emails it to the specified email addresses.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/export/sensor/csv
Request Method: POST
Request Body:
{
    "start": { "year": 2016, "month": 1, "date": 1 }, // start date of time series data
    "end": { "year": 2016, "month": 1, "date": 31 },  // end date of time series data
    "ids": [ 4, 6 ],                                  // array of sensor ids to be exported
    "influxFn": "MEAN",                               // "MEAN" = averaging aggregation, null = no aggregation
    "groupByMinutes": 5,                              // minute duration of averaged time segments (not used when influxFn = null)
    "sendToEmail": "john@acme.com,jane@acme.com",     // empty email string means a download is requested
    "filename": "West Freezer 2016-01-01 2016-01-31", // desired name of the output file
    "zip": true,                                      // true = download as a zip file (email attachments will always be zipped)
    "formatData": true,                               // true = displayed units, false = international units
    "isSequential": true,                             // true = vertical layout, false = horizontal layout
    "isDeviceInfoInline": false,                      // true = sensor name and hardware id will appear in every row, false = in the header
    "isTimeSplit": false                              // true = date, time, and time zone are separated, false = combined
}

Response Status: 200 (OK)
Content-Type: application/zip or text/plain
Response Body:
{Binary Stream of Data}
        
Eagle Eye Networks
Get Eagle Eye Credentials (GET)
Get current Eagle Eye Networks credentials and success flag for this Swift Sensors account.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/eagleeye/creds
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    "username": "Dean",         // email of Eagle Eye Networks user (null if credentials do not exist)
    "success": true             // true if credentials entered using the Edit Eagle Eye Credentials (POST) endpoint are valid
}
        
Edit Eagle Eye Credentials (POST)
Edit Eagle Eye Networks credentials for this Swift Sensors account. Credentials will be verified (try to login).

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/eagleeye/creds
Request Method: POST
Request Body:
{
    "username": "Shawn",        // required: email of Eagle Eye Networks user
    "password": "password"      // required: password
}

Response Status: 200 (OK)
Response Body:
{
    "username": "Shawn",
    "success": true
}
        
Test Eagle Eye Credentials (POST)
Tests the Eagle Eye credentials will be verified (try to login).

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/eagleeye/creds/test
Request Method: POST

Response Status: 200 (OK)
Response Body:
{
    "username": "Shawn",
    "success": true
}
        
Get Eagle Eye Cameras (GET)
Get all cameras available with the provided Eagle Eye Networks credentials for this Swift Sensors account. The optional query parameter "refresh" forces the Eagle Eye token to be refreshed simulating a sign out / sign in flow.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/eagleeye/cameras?refresh=false
Request Method: GET

Response Status: 200 (OK)
Response Body:
[                               // null if no cameras are available with the provided Eagle Eye Networks credentials
    {
        "id": "camera-id",
        "name": "camera-name"
    },
    {
        "id": "camera-id",
        "name": "camera-name"
    }
]
        
Delete Eagle Eye Credentials (DELETE)
Delete the Eagle Eye Networks credentials for this account.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/eagleeye/creds
Request Method: DELETE

Response Status: 200 (OK)
Response Body: None
        
Get Image from Eagle Eye (GET)
Get an image from an Eagle Eye camera for a specific timestamp. The optional query parameter "refresh" forces the Eagle Eye token to be refreshed simulating a sign out / sign in flow.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/eagleeye/cameras/{cameraId}/image/{timestamp}?refresh=false
Request Method: GET

Response Status: 200 (OK)
Response Body: Binary image data
        
Dashboards
Get All Dashboards (GET)
Gets the list of all dashboards for the specified account.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/dashboards
Request Method: GET

Response Status: 200 (OK)
Response Body:
[
    {
        "id": 1,
        "name": "Dashboard A"
    }
]
        
Get Dashboard (GET)
Gets all info for the specified dashboard.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/dashboards/{dashboardId}
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    "id": 1,
    "name": "Dashboard A",
    "description": "",
    "usedAsDefaultCount": 2,    // if > 0, do not try to delete this dashboard
    "data": ""                  // dynamic data
}
        
Edit Dashboard (POST)
Updates info for the specified dashboard.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/dashboards/{dashboardId}
Request Method: POST
Request Body:
{
    "id": 1,                    // read-only
    "name": "Dashboard A",      // 40 chars max, supports unicode
    "data": ""                  // dynamic data
}

Response Status: 200 (OK)
Response Body:
{
    "id": 1,
    "name": "Dashboard A",
    "description": "",
    "data": ""                  // dynamic data
}
        
Add Dashboard (POST)
Creates a new dashboard for the specified account.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/dashboards
Request Method: POST
Request Body:
{
    "name": "Dashboard A",      // 40 chars max
    "description": "",          // 256 chars max
    "data": ""                  // dynamic data
}

Response Status: 200 (OK)
Response Body:
{
    "id": 1,
    "name": "Dashboard A",
    "data": ""                  // dynamic data
}
        
Delete Dashboard (DELETE)
Deletes the specified dashboard from the account.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/dashboards/{dashboardId}
Request Method: DELETE

Response Status: 200 (OK)
Response Body: None
        
Tags
Get Tags (GET)
Get all tag categories and their tag values for this account.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/tags
Request Method: GET

Response Status: 200 (OK)
Response Body:
[                           // send empty list if no tag categories exist
    {
        "id": 1,
        "name": "Room",
        "usageCount": 4
    },
    {
        "id": 2,
        "name": "Floor",
        "usageCount": 3
    }
]
        
Get Tag (GET)
Get all tag details for this account.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/tags/{tagId}
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    "id": 1,
    "name": "Room",
    "sensorIds": [ 1, 3 ],
    "collectorIds": [ 1, 3 ],
    "deviceIds": [ 1, 3 ]
}
        
Add Tag (POST)
Add a tag category with zero or more tag values for this account.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/tags
Request Method: POST
Request Body:
{
    "name": "City",
    "sensorIds": [ 1, 3 ],
    "collectorIds": [ 1, 3 ],
    "deviceIds": [ 1, 3 ]
}

Response Status: 200 (OK)
Response Body:					// lastTreeChangeTime will be updated notifying clients of change
{
    "id": 1,
    "name": "City",
    "sensorIds": [ 1, 3 ],
    "collectorIds": [ 1, 3 ],
    "deviceIds": [ 1, 3 ]
}
        
Edit Tag (POST)
Edit a tag category name for this account.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/tags/{tagId}
Request Method: POST
Request Body:
{
    "name": "City",
    "sensorIds": [ 1, 3 ],
    "collectorIds": [ 1, 3 ],
    "deviceIds": [ 1, 3 ]
}

Response Status: 200 (OK)
Response Body:					// lastTreeChangeTime will be updated notifying clients of change
{
    "id": 1,
    "name": "City",
    "sensorIds": [ 1, 3 ],
    "collectorIds": [ 1, 3 ],
    "deviceIds": [ 1, 3 ]
}
        
Delete Tag (DELETE)
Delete a tag category for this account. Any child tagIds will be removed from any objects using them. The optional query parameter "force" allows the deletion of the tag even when it is assigned to a sensor, device, or collector.

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/tags/{tagId}?force=false
Request Method: DELETE

Response Status: 200 (OK)
Response Body: None				// lastTreeChangeTime will be updated notifying clients of change
        
Error Codes
Server Error Codes
Http error codes will be returned when objects are not found or access is denied. For example, if the user provides incorrect sign-in credentials, the server will return a request status code 400 (Bad Request), and the response body will contain an object encoded in JSON format with the server error code "error" and a brief message "msg":

{
    "error": 1123,
    "msg": "Email and\/or password is invalid"
}
        
The following list describes the possible server error codes (in parentheses) and their meaning:

OTHER                                   (1100),
DELETION_FAILED_SENSORS_ATTACHED        (1101), // delete notification/sensors failure
ALREADY_ADOPTED_BY_OTHER_ACCOUNT        (1102), // Adoption failure
ALREADY_ADOPTED                         (1103), // Adoption failure
COLLECTOR_GUID_NOT_EXIST                (1104), // Adoption failure
INVALID_THRESHOLD_VALUES                (1105), // Editing threshold failure (values are not sorted)
DELETION_FAILED_NOT_EMPTY               (1106), // Delete group failure
USER_EMAIL_EXISTS                       (1107), // User with same email exists
SEND_INVITE_FAILED                      (1108), // Unable to send user invite
REGISTER_USER_FAILED                    (1109), // Unable to register user
COLLECTOR_GUID_MULTIPLES                (1110), // Adoption failure
USER_DISABLED                           (1112), // IsEnabled set to false for user
USER_INVALID_ACCOUNT_ACCESS             (1113), // User does not have permission to access the account
USER_PERMISSION_DENIED                  (1114), // User does not have permission to perform action
IMAGE_NOT_FOUND                         (1115), // No image found matching the request
IMAGE_CATEGORY_UNSUPPORTED              (1116), // Image category unsupported
IMAGE_TYPE_UNSUPPORTED                  (1117), // Image type unsupported
IMAGE_UPLOAD_FAILED                     (1118), // Image upload failed
SEND_EMAIL_FAILED_TOO_LARGE             (1119), // Sending the email failed because it is too large
INVALID_TIMEZONE                        (1120), // Invalid timezone id
NO_NOTIFICATION_METHODS                 (1121), // Notification with no delivery methods (notifyVia...)
USER_LOCKED_OUT                         (1122), // User's account locked out due to too many failed login attempts
USER_LOGIN_FAILED                       (1123), // User email/password is invalid
USER_REQUEST_INVALID_CODE               (1124), // User request code is invalid
INVALID_PHONE_NUMBER                    (1125), // Invalid phone number
THRESHOLD_WITH_DIFF_PROPERTY_ATTACHED   (1126), // Changing the property type of a sensor with a threshold (through sensor conversion)
USER_INVALID_EMAIL                      (1127), // IsEmailValid set to false for user
IMAGE_UNSUPPORTED_RATIO                 (1128), // Image ratio is above the max supported
PASSWORD_EXPIRED                        (1129), // Password has expired
CANNOT_USE_RECENT_PASSWORD              (1130), // Password has been used recently
PASSWORD_TOO_SHORT                      (1131), // Password does not meet length requirements
PASSWORD_MISSING_SPECIAL_CHAR           (1132), // Password does not meet strength requirements
PASSWORD_MISSING_MIXED_CASE             (1133), // Password does not contain upper and lower case
PASSWORD_MISSING_NUMBER                 (1134), // Password does not contain a number
NO_PUBLIC_IP_FOR_COLLECTOR              (1135), // Collector does not have a public ip address
UNABLE_TO_DETERMINE_IP_LOCATION         (1136), // Unable to get lat/long position from public IP address
LOCATE_IP_ADDRESS_FAILED                (1137), // An exception occurred trying to locate public IP address
NO_VIRTUAL_BRIDGE_CREDITS               (1138), // No virtual gateway credits, cannot adopt the virtual gateway
INFLUX_TIMEOUT                          (1139), // Influx time out. Try again?
REQUEST_PASSWORD_MISMATCH               (1140), // Incorrect password
GOALS_ATTACHED                          (1141), // Cannot change property type of a sensor with a goal
DEVICE_DATA_MIGRATE_FAILED              (1142), // Sensors property or count under the device does not match
        
Deprecated API Endpoints
Expiration Policy
Clients using the following deprecated API endpoints should be updated to use the specified new versions as soon as possible. Future maintenance and support of deprecated endpoints is guaranteed for six months after the deprecation date. After the support period expires, the expired endpoint may be removed at any time. If you need additional time to complete the transition, please contact Swift Sensors before the deprecated endpoint support period expires.
Hardware Tree (GET) - V2 (Deprecated on 2018.08.30)
This deprecated endpoint should be replaced with "Hardware Tree (GET)".
The hardware tree structure adheres to the following rules:
Account can contain zero-or-more groups, and zero or more collectors.
Group can contain zero-or-more collectors AND zero-or-more groups (enabling of nested groups).
Collector can contain zero-or-more devices.
Device can contain one-or-more sensors.
If (collector name==null) then isNew=true, name="SG3-1010N ({last 4 digits of guid})" example "SG3-1010N (51A8)".
If (device name==null) then isNew=true, name="SS3-105 ({last 5 digits of deviceMac})" example "SS3-105 (68:16)".
If (sensor description==null) then isNew=true.

For sensor tree nodes:
    unitId - displayUnitTypeId from the sensor table
    value - storedTypeId from property type retrieved from static types
    conversionId - specifies the conversion assigned to a sensor (property is absent if null)
    shiftScheduleId - specifies the shift schedule assigned to a sensor (property is absent if null)
        

Request URL: https://api.swiftsensors.net/api/client/v2/accounts/{accountId}/tree
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    "serverTime": 1492800929413,
    "lastTreeChangeTime": 1492800922,
    "lastSensorTreeChangeTime": 1234213434,
    "account": {
        "id": ".1.",
        "name": "USA",
        "subAccountsAllowed": false,
        "collectors": [ ],
        "groups": [
            {
                "id": 5, "name": "Untitled Group",
                "groups": [
                    {
                        "id": 6, "name": "Austin",
                        "groups": [ ],
                        "collectors": [
                            {
                                "id": 1, "name": "SG3-1010N (0000)", "isNew": true, "time": 1492800921, "tagIds": [ 2 ],
                                "devices": [
                                    {
                                        "id": 1, "name": "Sensor (00:00)", "isNew": false, "time": 1492800921,
                                        "sampleRate": 1, "tagIds": [ 2 ],
                                        "sensors": [
                                            {
                                                "id": 1, "profileName": "Temperature", "isNew": true, "unitId": 1,
                                                "value": 0, "time": 0, "thresholdStatus": 0, "thresholdId": 0,
                                                "precision": 1, "lastNormalTime": 0, "isHidden": false,
                                                "conversionId": null, "tagIds": [ 2, 1 ], "shiftScheduleId": 1
                                            },
                                            {
                                                "id": 2, "profileName": "Humidity", "isNew": true, "unitId": 4,
                                                "value": 10, "time": 100, "thresholdStatus": 0, "thresholdId": 0,
                                                "precision": 0, "lastNormalTime": 0, "isHidden": false, "tagIds": [ 2 ]
                                            }
                                        ]
                                    },
                                    {
                                        "id": 2, "name": "Sensor (11:11)", "isNew": false, "time": 1492800921,
                                        "sampleRate": 1, "tagIds": [ 2 ],
                                        "sensors": [
                                            {
                                                "id": 3, "profileName": "Temperature", "isNew": true, "unitId": 1,
                                                "value": 20, "time": 200, "thresholdStatus": 0, "thresholdId": 0,
                                                "precision": 1, "lastNormalTime": 0, "isHidden": false, "tagIds": [ 2 ]
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                "id": 2, "name": "SG3-1010N (1111)", "isNew": true, "time": 1492800921, "tagIds": [ 2 ],
                                "devices": [
                                    {
                                        "id": 3, "name": "Sensor (22:22)", "isNew": false, "time": 1492800921,
                                        "sampleRate": 1, "tagIds": [ 2 ],
                                        "sensors": [
                                            {
                                                "id": 5, "profileName": "Temperatur", "isNew": true, "unitId": 1,
                                                "value": 40, "time": 400, "thresholdStatus": 0, "thresholdId": 0,
                                                "precision": 1, "lastNormalTime": 0, "isHidden": false, "tagIds": [ ]
                                            }
                                        ]
                                    }
                                ]
                            },
                            {
                                "id": 3, "name": "SG3-1010N (2222)", "isNew": true, "time": 1492800921, "tagIds": [ 2 ],
                                "devices": [ ]
                            }
                        ]
                    },
                    {
                        "id": 8, "name": "EmptyGroup",
                        "groups": [ ],
                        "collectors": [ ]
                    }
                ],
                "collectors": [ ]
            },
            {
                "id": 9, "name": "New York",
                "groups": [ ],
                "collectors": [ ]
            }
        ]
    }
}
        
Sensor Tree (GET) - V1 (Deprecated on 2018.08.30)
The sensor tree structure adheres to the following rules:
Account contains zero or more sensor groups and zero or more sensorIds.
Sensor group can contain zero-or-more sensorIds AND zero-or-more sensor groups (enabling of nested groups)
        

Request URL: https://api.swiftsensors.net/api/client/v1/accounts/{accountId}/sensortree
Request Method: GET

Response Status: 200 (OK)
Response Body:
{
    "lastSensorTreeChangeTime": 1492800922,
    "sensorIds": [ 1, 2 ],
    "sensorGroups": [
        {
            "id": 5,
            "name": "Untitled Group",
            "sensorIds": [ ],
            "sensorGroups": [
                {
                    "id": 6,
                    "name": "Austin",
                    "sensorIds": [ 3, 4, 5 ],
                    "sensorGroups": [ ]
                },
                {
                    "id": 8,
                    "name": "EmptyGroup",
                    "sensorIds": [ ],
                    "sensorGroups": [ ]
                }
            ]
        },
        {
            "id": 9,
            "name": "New York",
            "sensorIds": [ ],
            "sensorGroups": [ ]
        }
    ]
}