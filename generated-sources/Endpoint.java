package com.bandwidth.voice.models;


public record Endpoint (
    String endpoint,
    EndpointTypeEnum type,
    Integer weight
) {}
