/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
const { spawn } = require('child_process');

export interface GitBranch {

    readonly isHEAD: boolean;

    readonly localBranch: string;

    readonly upstreamBranch?: {
        remote: string,
        branch: string,
        remoteURL?: string
    };

    readonly aheadBehind?: {
        ahead?: number,
        behind?: number
    };

    /**
     * The hash string of the current HEAD.
     */
    readonly ref: string;

}

export async function getCurrentBranch(projectPath: string): Promise<GitBranch | undefined> {

    return new Promise<GitBranch | undefined>((resolve, reject) => {
        const gitBranchCmd = spawn('git', ['branch', '-vv'], { cwd: projectPath });
        const grep = spawn('grep', ['\*']);

        gitBranchCmd.stdout.pipe(grep.stdin);

        let output = '';
        grep.stdout.on('data', function(data: string) {
            output += data.toString();
        });
        grep.on('close', async function(code: any) {
            output = output.trim();
            const gitBranch: GitBranch | undefined = parseGitBranch(output);
            if (gitBranch && gitBranch.upstreamBranch) {
                gitBranch.upstreamBranch.remoteURL = await getRemoteURL(gitBranch.upstreamBranch.remote, projectPath);
            }

            resolve(gitBranch);
        });
        grep.on('error', function(err: any) { reject(err); });
    });
}

export function getRemoteURL(remote: string, projectPath: string): Promise<string | undefined> {
    return new Promise<string | undefined>((resolve, reject) => {

        const gitConfigUrl = spawn('git', ['config', '--get', `remote.${remote}.url`], { cwd: projectPath });
        let result = '';
        gitConfigUrl.stdout.on('data', function(data: string) {
            result += data.toString();
        });
        gitConfigUrl.on('close', function(code: any) {
            result = result.trim();
            resolve(result);
        });
        gitConfigUrl.on('error', function(err: any) { reject(err); });
    });
}

export function parseGitBranch(gitBranchvvOutput: string): GitBranch | undefined {

    const star = '[\*]?';
    const spaces = '[\\s]+';
    const nonWhiteSpaces = '[^\\s]+';
    const localBranch = nonWhiteSpaces;
    const ref = nonWhiteSpaces;
    const branchOrRemote = '[^\\s^/]+';

    const regexp = new RegExp(
        `^(${star})${spaces}(${localBranch})${spaces}(${ref})${spaces}` +
        `(\\[(${branchOrRemote})\\/(${branchOrRemote})(: behind ([0-9]+))?(: ahead ([0-9]+))?\\])?.*`);

    // for instance:
    // *  master     e619393 [origin/master: behind 4] call 'onTimeout' callback when notification closed on timeout
    // * vplugin-id 57f328a [sunix/vplugin-id] Moving openfile command args to the right command."

    const result: RegExpMatchArray | null = gitBranchvvOutput.match(regexp);

    if (!result) {
        return undefined;
    }

    let aheadBehind = undefined;

    if (result[8]) {
        aheadBehind = { behind: parseInt(result[8], 10) };
    }
    if (result[10]) {
        aheadBehind = { ahead: parseInt(result[10], 10) };
    }

    let upstreamBranch = undefined;
    if (result[4]) {
        upstreamBranch = {
            remote: result[5], branch: result[6]
        };
    }
    return {
        isHEAD: (result[1] === '*'),
        localBranch: result[2],
        upstreamBranch: upstreamBranch,
        aheadBehind: aheadBehind,
        ref: result[3]
    };

}

export function getGitRootFolder(uri: string): string {
    if (uri.endsWith('/.git/config')) {
        return uri.substring(0, uri.length - '.git/config'.length);
    }
    if (uri.endsWith('/.git/HEAD')) {
        return uri.substring(0, uri.length - '.git/HEAD'.length);
    }
    return uri;
}
