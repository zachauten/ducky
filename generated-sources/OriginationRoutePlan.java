package com.bandwidth.voice.models;

import java.util.List;

public record OriginationRoutePlan (
    List<Route> routes
) {}
