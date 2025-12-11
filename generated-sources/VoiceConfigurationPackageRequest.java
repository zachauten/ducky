package com.bandwidth.voice.models;


public record VoiceConfigurationPackageRequest (
    String name,
    String description,
    Cnam cnam,
    PindropIntegration pindropIntegration,
    CallVerification callVerification,
    OriginationRoutePlanRequest originationRoutePlan,
    StirShakenBehavior stirShakenBehavior,
    java.util.UUID httpVoiceV2ApplicationId,
    AnalyticEngine analyticEngine
) {}
