package com.bandwidth.voice.models;

import java.util.List;

public record VoiceConfigurationPackageResponse (
    List<Link> links,
    VoiceConfigurationPackage data,
    List<Error> errors
) {}
