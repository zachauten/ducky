package com.bandwidth.voice.models;

import java.util.List;

public record BulkPhoneNumbersRequest (
    BulkTnActionEnum action,
    List<String> phoneNumbers
) {}
