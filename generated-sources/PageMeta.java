package com.bandwidth.voice.models;


public record PageMeta (
    Integer pageSize,
    Integer totalElements,
    Integer totalPages,
    Integer pageNumber
) {}
