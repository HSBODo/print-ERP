package com.bviit.analytics.reservation.service;

final class ReservationStatsQuerySupport {

    private ReservationStatsQuerySupport() {
    }

    static String actor(String username) {
        return username == null || username.isBlank() ? "unknown" : username;
    }
}
