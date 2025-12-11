package com.bandwidth.voice.models;


public record QueryCriteria (
    String parameter,
    String operator,
    Object values
) {}
