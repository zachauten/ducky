package com.bandwidth.voice.models;


public record VoiceConfigurationPackage (
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
    AnalyticEngine analyticEngine
) {}
