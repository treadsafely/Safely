// Host-only JVM harness to unit-test the pure push-content core WITHOUT the Android
// SDK / Expo / RN — the Kotlin counterpart of the Swift Package.swift harness.
//
// It compiles only the pure `*Core.kt` files (JDK-only) and their `*Test.kt`,
// excluding SafelyPushContentModule.kt and SafelyNotificationsService.kt (which imports expo.modules.kotlin.*). New
// pure-core primitives + their tests are picked up automatically by the
// include patterns below — no extra setup needed.
//
// Run: `gradle test` (CI uses gradle/actions/setup-gradle; locally needs a
// `gradle` on PATH). The sources live one level up, in the real Android module.
plugins {
    kotlin("jvm") version "2.1.0"
}

repositories {
    mavenCentral()
}

dependencies {
    testImplementation("junit:junit:4.13.2")
}

sourceSets {
    main {
        kotlin {
            setSrcDirs(listOf("../src/main/java"))
            include("**/*Core.kt")
        }
    }
    test {
        kotlin {
            setSrcDirs(listOf("../src/test/java"))
            include("**/*Test.kt")
        }
    }
}

tasks.test {
    useJUnit()
    testLogging {
        events("passed", "failed", "skipped")
    }
}
