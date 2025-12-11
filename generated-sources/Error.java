package com.bandwidth.voice.models;


public record Error (
    String code,
    String type,
    String description
) {}
