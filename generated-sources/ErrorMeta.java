package com.bandwidth.voice.models;

import java.util.List;

public record ErrorMeta (
    String type,
    String description,
    List<String> meta
) {}
