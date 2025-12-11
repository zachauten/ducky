package com.bandwidth.voice.models;

import java.util.List;

public record VoiceConfigurationPackageResponseWithPhoneNumberCount (
    List<Link> links,
    VoiceConfigurationPackageWithPhoneNumberCount data,
    List<Error> errors
) {}
