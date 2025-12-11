package com.bandwidth.voice.models;

import java.util.List;

public record SearchVoiceConfigurationPackagesResponse (
    List<Link> links,
    List<VoiceConfigurationPackage> data,
    List<Error> errors,
    PageMeta page
) {}
