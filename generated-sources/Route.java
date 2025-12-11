package com.bandwidth.voice.models;

import java.util.List;

public record Route (
    Double priority,
    String name,
    List<Endpoint> endpoints
) {}
