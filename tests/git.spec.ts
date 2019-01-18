/*
 * Copyright (c) 2019 Red Hat, Inc.
 * All rights reserved. This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * Contributors:
 *   Red Hat, Inc. - initial API and implementation
 */

import { getCurrentBranch, GitBranch, parseGitBranch, getGitRootFolder } from "../src/git"
const rimraf = require("rimraf");
const { spawn } = require('child_process');

jest.setTimeout(10000);

describe("Test workspace sync", () => {

    test("Get git root folder from git config or index file", async () => {
        expect(getGitRootFolder('/projects/test/.git/config')).toBe('/projects/test/');
        expect(getGitRootFolder('/projects/test/.git/HEAD')).toBe('/projects/test/');
    });

});


describe("Test git commands", () => {

    beforeAll(async () => {
        await removeFolder('/tmp/che-theia-samples');
        await gitClone('/tmp/', 'https://github.com/eclipse/che-theia-samples');
    });


    test("parse git branch -vv 1.", async () => {
        const gitBranchItem = "  master     e619393 [origin/master: behind 4] call 'onTimeout' callback when notification closed on timeout"
        const gitBranch: GitBranch | undefined = parseGitBranch(gitBranchItem);
        expect(gitBranch).toBeDefined();
        expect(gitBranch.isHEAD).toBeFalsy();
        expect(gitBranch.localBranch).toBe('master');
        expect(gitBranch.ref).toBe('e619393');
        expect(gitBranch.upstreamBranch.remote).toBe('origin');
        expect(gitBranch.upstreamBranch.branch).toBe('master');
        expect(gitBranch.aheadBehind.behind).toBe(4);
    });

    test("parse git branch -vv 2.", async () => {
        const gitBranchItem = "* vplugin-id 57f328a [sunix/master] Moving openfile command args to the right command."
        const gitBranch: GitBranch | undefined = parseGitBranch(gitBranchItem);
        expect(gitBranch).toBeDefined();
        expect(gitBranch.isHEAD).toBeTruthy();
        expect(gitBranch.localBranch).toBe('vplugin-id');
        expect(gitBranch.ref).toBe('57f328a');
        expect(gitBranch.upstreamBranch.remote).toBe('sunix');
        expect(gitBranch.upstreamBranch.branch).toBe('master');
        expect(gitBranch.aheadBehind).toBeUndefined();
    });


    test("get git current branch", async () => {
        const currentBranch = await getCurrentBranch('/tmp/che-theia-samples');
        expect(currentBranch.upstreamBranch.branch).toBe('master');
        expect(currentBranch.upstreamBranch.remoteURL).toBe('https://github.com/eclipse/che-theia-samples');
    });

    test("get git current branch after checkout", async () => {
        await gitCheckout('/tmp/che-theia-samples', 'hello-world-plugins');
        expect((await getCurrentBranch('/tmp/che-theia-samples')).upstreamBranch).toBeUndefined;
    });

    afterAll(async () => {
        await removeFolder('/tmp/che-theia-samples');
    });
});


async function removeFolder(folderPath: string): Promise<undefined> {
    return new Promise<undefined>((resolve, reject) => {
        rimraf(folderPath, () => { resolve() });
    });
}

async function gitCheckout(projectPath: string, branch: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const gitCheckoutCmd = spawn('git', ['checkout', '-b', branch], { cwd: projectPath });

        let result = '';
        gitCheckoutCmd.stdout.on('data', function(data: string) {
            result += data.toString();
        });
        gitCheckoutCmd.on('close', function(code: any) {
            resolve(result);
        });
        gitCheckoutCmd.on('error', function(err: any) { reject(err); });
    });
}

async function gitClone(targetFolderPath: string, gitRepo: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
        const gitClone = spawn('git', ['clone', gitRepo], { cwd: targetFolderPath });

        let result = '';
        gitClone.stdout.on('data', function(data: string) {
            result += data.toString();
        });
        gitClone.on('close', function(code: any) {
            resolve(result);
        });
        gitClone.on('error', function(err: any) { reject(err); });
    });
}
