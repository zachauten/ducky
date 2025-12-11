package com.bandwidth.voice.models;

import java.util.List;

public record OriginationRoutePlanRequest (
    List<Route> routes
) {}
