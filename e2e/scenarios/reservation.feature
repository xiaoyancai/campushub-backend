Feature: Campus resource reservations

  Scenario: Student successfully reserves an available study room
    Given a student is on the CampusHub home page
    And "Study Room 302" is available tomorrow from 10:00 AM to 11:00 AM
    When the student filters resources by "Study rooms"
    And submits a booking for "Study Room 302" for that time window
    Then the student should see a "Reservation confirmed" status
    And "My bookings" should show a confirmed reservation for "Study Room 302"

  Scenario: Student receives a conflict alert for an overlapping booking
    Given another student has booked "3D Printer A" tomorrow from 2:00 PM to 3:00 PM
    When a different student submits a booking for "3D Printer A" for that time window
    Then the student should see the alert "This resource is already reserved for the selected time window. Please choose a different time."
    And the booking form should remain open
    And the conflicting student should have no reservations
