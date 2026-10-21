import { syncCoverNoPaper, syncCoverProtect, syncCoverUseSync } from '../../shared';

export type SyncAboutStep = {
    id: 'protect' | 'noPaper' | 'useSync';
    cover: string;
    titleKey: string;
    subtitleKey: string;
};

export const SYNC_ABOUT_STEPS: readonly SyncAboutStep[] = [
    {
        id: 'protect',
        cover: syncCoverProtect,
        titleKey: 'safety.syncOnboarding.steps.protect.title',
        subtitleKey: 'safety.syncOnboarding.steps.protect.subtitle'
    },
    {
        id: 'noPaper',
        cover: syncCoverNoPaper,
        titleKey: 'safety.syncOnboarding.steps.noPaper.title',
        subtitleKey: 'safety.syncOnboarding.steps.noPaper.subtitle'
    },
    {
        id: 'useSync',
        cover: syncCoverUseSync,
        titleKey: 'safety.syncOnboarding.steps.useSync.title',
        subtitleKey: 'safety.syncOnboarding.steps.useSync.subtitle'
    }
];
