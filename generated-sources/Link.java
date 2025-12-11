package com.bandwidth.voice.models;


public record Link (
    String href,
    String rel,
    String method
) {}
