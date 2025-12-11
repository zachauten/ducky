package com.bandwidth.voice.models;


public record VoiceConfigurationPackageWithPhoneNumberCount (
    java.util.UUID voiceConfigurationPackageId,
    Integer accountId,
    String name,
    String description,
    Cnam cnam,
    PindropIntegration pindropIntegration,
    CallVerification callVerification,
    OriginationRoutePlan originationRoutePlan,
    StirShakenBehavior stirShakenBehavior,
    java.util.UUID httpVoiceV2ApplicationId,
    AnalyticEngine analyticEngine,
    Integer phoneNumberCount
) {}
