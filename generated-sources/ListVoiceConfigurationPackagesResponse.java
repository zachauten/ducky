package com.bandwidth.voice.models;

import java.util.List;

public record ListVoiceConfigurationPackagesResponse (
    List<Link> links,
    List<VoiceConfigurationPackageWithPhoneNumberCount> data,
    List<Error> errors,
    PageMeta page
) {}
