const {
    withDangerousMod,
    withEntitlementsPlist,
    withXcodeProject
} = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const TARGET_NAME = 'SafelyNotificationService';
const DEPLOYMENT_TARGET = '15.1';
const APP_GROUPS_KEY = 'com.apple.security.application-groups';
const MODULE_IOS_DIR = path.join(__dirname, '..', 'modules', 'safely-push-content', 'ios');
const SOURCE_FILES = [
    'NotificationService/NotificationService.swift',
    'PushContentCore/PushContentCore.swift'
];

function escapeXml(text) {
    return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function plistValue(value, indent) {
    if (Array.isArray(value)) {
        const items = value
            .map(item => `${indent}    ${plistValue(item, `${indent}    `)}`)
            .join('\n');
        return `<array>\n${items}\n${indent}</array>`;
    }
    if (typeof value === 'object' && value !== null) {
        const entries = Object.entries(value)
            .map(
                ([key, item]) =>
                    `${indent}    <key>${escapeXml(key)}</key>\n${indent}    ${plistValue(item, `${indent}    `)}`
            )
            .join('\n');
        return `<dict>\n${entries}\n${indent}</dict>`;
    }
    return `<string>${escapeXml(String(value))}</string>`;
}

function buildPlist(root) {
    return [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">',
        '<plist version="1.0">',
        plistValue(root, ''),
        '</plist>',
        ''
    ].join('\n');
}

function appGroupId(config) {
    return `group.${config.ios.bundleIdentifier}`;
}

function extensionBundleIdentifier(config) {
    return `${config.ios.bundleIdentifier}.NotificationService`;
}

function withAppGroupEntitlement(config) {
    return withEntitlementsPlist(config, cfg => {
        const groups = cfg.modResults[APP_GROUPS_KEY] ?? [];
        if (!groups.includes(appGroupId(cfg))) {
            cfg.modResults[APP_GROUPS_KEY] = [...groups, appGroupId(cfg)];
        }
        return cfg;
    });
}

function withExtensionFiles(config) {
    return withDangerousMod(config, [
        'ios',
        cfg => {
            const targetDir = path.join(cfg.modRequest.platformProjectRoot, TARGET_NAME);
            fs.mkdirSync(targetDir, { recursive: true });

            for (const file of SOURCE_FILES) {
                fs.copyFileSync(
                    path.join(MODULE_IOS_DIR, file),
                    path.join(targetDir, path.basename(file))
                );
            }

            fs.writeFileSync(
                path.join(targetDir, 'Info.plist'),
                buildPlist({
                    CFBundleDevelopmentRegion: '$(DEVELOPMENT_LANGUAGE)',
                    CFBundleDisplayName: TARGET_NAME,
                    CFBundleExecutable: '$(EXECUTABLE_NAME)',
                    CFBundleIdentifier: '$(PRODUCT_BUNDLE_IDENTIFIER)',
                    CFBundleInfoDictionaryVersion: '6.0',
                    CFBundleName: '$(PRODUCT_NAME)',
                    CFBundlePackageType: 'XPC!',
                    CFBundleShortVersionString: '$(MARKETING_VERSION)',
                    CFBundleVersion: '$(CURRENT_PROJECT_VERSION)',
                    NSExtension: {
                        NSExtensionPointIdentifier: 'com.apple.usernotifications.service',
                        NSExtensionPrincipalClass: '$(PRODUCT_MODULE_NAME).NotificationService'
                    }
                })
            );
            fs.writeFileSync(
                path.join(targetDir, `${TARGET_NAME}.entitlements`),
                buildPlist({ [APP_GROUPS_KEY]: [appGroupId(cfg)] })
            );
            return cfg;
        }
    ]);
}

function findOrCreateTarget(project, cfg) {
    const existing = Object.entries(project.pbxNativeTargetSection()).find(
        ([, target]) => typeof target === 'object' && target.name?.replace(/"/g, '') === TARGET_NAME
    );
    if (existing) {
        return { uuid: existing[0], pbxNativeTarget: existing[1], isNew: false };
    }

    const target = project.addTarget(
        TARGET_NAME,
        'app_extension',
        TARGET_NAME,
        extensionBundleIdentifier(cfg)
    );
    const sources = SOURCE_FILES.map(file => path.basename(file));
    project.addBuildPhase(sources, 'PBXSourcesBuildPhase', 'Sources', target.uuid);
    project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', target.uuid);
    project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', target.uuid);

    const group = project.addPbxGroup(
        [...sources, 'Info.plist', `${TARGET_NAME}.entitlements`],
        TARGET_NAME,
        TARGET_NAME
    );
    const groups = project.hash.project.objects.PBXGroup;
    Object.keys(groups).forEach(key => {
        if (typeof groups[key] === 'object' && !groups[key].name && !groups[key].path) {
            project.addToPbxGroup(group.uuid, key);
        }
    });
    return { ...target, isNew: true };
}

function readAppTargetBuildSettings(project) {
    const appTarget = project.getFirstTarget().firstTarget;
    const configurationList = project.pbxXCConfigurationList()[appTarget.buildConfigurationList];
    const configurations = project.pbxXCBuildConfigurationSection();
    const release = configurationList.buildConfigurations
        .map(({ value }) => configurations[value])
        .find(configuration => configuration.name === 'Release');

    return release?.buildSettings ?? {};
}

function withExtensionTarget(config) {
    return withXcodeProject(config, cfg => {
        const project = cfg.modResults;
        const target = findOrCreateTarget(project, cfg);

        const appSettings = readAppTargetBuildSettings(project);
        const settings = {
            INFOPLIST_FILE: `"${TARGET_NAME}/Info.plist"`,
            CODE_SIGN_ENTITLEMENTS: `"${TARGET_NAME}/${TARGET_NAME}.entitlements"`,
            CODE_SIGN_STYLE: 'Automatic',
            GENERATE_INFOPLIST_FILE: 'NO',
            IPHONEOS_DEPLOYMENT_TARGET: DEPLOYMENT_TARGET,
            TARGETED_DEVICE_FAMILY: '"1,2"',
            SWIFT_VERSION: '5.0',
            CURRENT_PROJECT_VERSION: appSettings.CURRENT_PROJECT_VERSION ?? '"1"',
            MARKETING_VERSION: appSettings.MARKETING_VERSION ?? `"${cfg.version ?? '1.0.0'}"`,
            PRODUCT_NAME: '"$(TARGET_NAME)"'
        };
        const configurationList =
            project.pbxXCConfigurationList()[target.pbxNativeTarget.buildConfigurationList];
        const configurations = project.pbxXCBuildConfigurationSection();
        for (const { value: uuid } of configurationList.buildConfigurations) {
            Object.assign(configurations[uuid].buildSettings, settings);
        }
        return cfg;
    });
}

module.exports = function withPushContentExtension(config) {
    if (!config.ios?.bundleIdentifier) {
        throw new Error('withPushContentExtension: ios.bundleIdentifier is required');
    }
    config = withAppGroupEntitlement(config);
    config = withExtensionFiles(config);
    return withExtensionTarget(config);
};
