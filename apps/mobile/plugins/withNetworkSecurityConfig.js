const fs = require('fs');
const path = require('path');
const {
    withAndroidManifest,
    withDangerousMod
} = require('@expo/config-plugins');

// Allowlist, not a denylist: an unknown or future profile must never trust user CAs.
const USER_CA_PROFILES = new Set(['staging-base', 'staging-cached']);

const USER_TRUST_ANCHORS = `
        <trust-anchors>
            <certificates src="system" />
            <certificates src="user" />
        </trust-anchors>`;

function buildXml(trustUserCa) {
    const baseConfig = trustUserCa
        ? `
    <base-config>${USER_TRUST_ANCHORS}
    </base-config>`
        : '';
    return `<?xml version="1.0" encoding="utf-8"?>
<network-security-config>${baseConfig}
    <debug-overrides>${USER_TRUST_ANCHORS}
    </debug-overrides>
</network-security-config>
`;
}

module.exports = function withNetworkSecurityConfig(config) {
    const trustUserCa = USER_CA_PROFILES.has(process.env.EAS_BUILD_PROFILE);

    config = withDangerousMod(config, [
        'android',
        async cfg => {
            const xmlDir = path.join(
                cfg.modRequest.platformProjectRoot,
                'app/src/main/res/xml'
            );
            await fs.promises.mkdir(xmlDir, { recursive: true });
            await fs.promises.writeFile(
                path.join(xmlDir, 'network_security_config.xml'),
                buildXml(trustUserCa)
            );
            return cfg;
        }
    ]);

    return withAndroidManifest(config, cfg => {
        const application = cfg.modResults.manifest.application?.[0];
        if (!application) {
            throw new Error(
                'withNetworkSecurityConfig: <application> not found in AndroidManifest.xml'
            );
        }
        application.$['android:networkSecurityConfig'] =
            '@xml/network_security_config';
        return cfg;
    });
};
