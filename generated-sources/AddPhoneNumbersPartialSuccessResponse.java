package com.bandwidth.voice.models;

import java.util.List;

public record AddPhoneNumbersPartialSuccessResponse (
    List<Link> links,
    Object data,
    List<Error> errors
) {}
