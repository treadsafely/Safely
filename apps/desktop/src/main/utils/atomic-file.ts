import fs from 'node:fs/promises';
import path from 'node:path';

/** temp file → fsync → atomic rename → fsync of the directory, so the rename survives too. */
export async function writeFileAtomic(filePath: string, payload: string): Promise<void> {
    const tempPath = `${filePath}.tmp`;

    await fs.mkdir(path.dirname(filePath), { recursive: true });

    const handle = await fs.open(tempPath, 'w', 0o600);

    try {
        await handle.writeFile(payload, 'utf8');
        await handle.sync();
    } finally {
        await handle.close();
    }

    await fs.rename(tempPath, filePath);
    await syncDirectory(path.dirname(filePath));
}

/** Windows does not allow opening a directory as a file; there the rename is journalled instead. */
async function syncDirectory(directory: string): Promise<void> {
    if (process.platform === 'win32') {
        return;
    }

    const handle = await fs.open(directory, 'r');

    try {
        await handle.sync();
    } finally {
        await handle.close();
    }
}
