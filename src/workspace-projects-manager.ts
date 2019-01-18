/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/

import { TheiaCloneCommand } from './theia-commands';
import * as che from '@eclipse-che/plugin';
import * as theia from '@theia/plugin';
import * as git from './git';
import * as projectshelper from "./projects";
import * as fileuri from "./file-uri";
const fs = require('fs');

/**
 * Make synchronization between projects defined in Che workspace and theia projects.
 */
export class WorkspaceProjectsManager {

    watchers: theia.FileSystemWatcher[] = [];

    constructor(protected projectsRoot: string) {
    }

    async run() {
        await this.syncWorkspace();
        const workspace = await che.workspace.getCurrentWorkspace();

        const cloneCommandList = await this.selectProjectToCloneCommands(workspace);
        if (cloneCommandList.length === 0) {
            return;
        }

        await this.executeCloneCommands(cloneCommandList);
    }

    async selectProjectToCloneCommands(workspace: che.Workspace): Promise<TheiaCloneCommand[]> {
        const instance = this;

        const projects = workspace.config.projects;
        if (!projects) {
            return [];
        }

        return projects
            .filter(project => !fs.existsSync(instance.projectsRoot + project.path))
            .map(project => new TheiaCloneCommand(project, instance.projectsRoot));
    }

    private async executeCloneCommands(cloneCommandList: TheiaCloneCommand[]) {
        theia.window.showInformationMessage("Che Workspace: Starting cloning projects.");

        await Promise.all(
            cloneCommandList.map(cloneCommand => cloneCommand.execute())
        );

        theia.window.showInformationMessage("Che Workspace: Finished cloning projects.");
    }

    async syncWorkspace() {
        const gitConfigPattern = '**/.git/{HEAD,config}';
        const gitConfigWatcher = theia.workspace.createFileSystemWatcher(gitConfigPattern);
        gitConfigWatcher.onDidCreate(uri => this.updateOrCreateGitProjectInWorkspace(git.getGitRootFolder(uri.path)));
        gitConfigWatcher.onDidChange(uri => this.updateOrCreateGitProjectInWorkspace(git.getGitRootFolder(uri.path)));
        gitConfigWatcher.onDidDelete(uri => this.deleteGitProjectInWorkspace(git.getGitRootFolder(uri.path)));
        this.watchers.push(gitConfigWatcher);
    }

    async updateOrCreateGitProjectInWorkspace(projectFolderURI: string) {
        const currentWorkspace = await che.workspace.getCurrentWorkspace();
        if (!currentWorkspace.id) {
            console.error('Unexpected error: current workspace id is not defined');
            return;
        }

        const projectBranch: git.GitBranch | undefined = await git.getCurrentBranch(projectFolderURI);
        if (!projectBranch || !projectBranch.upstreamBranch || !projectBranch.upstreamBranch.remoteURL) {
            console.error(`Could not detect git project branch for ${projectFolderURI}`);
            return;
        }

        projectshelper.updateOrCreateGitProject(currentWorkspace.config.projects,
            fileuri.convertToCheProjectPath(projectFolderURI, this.projectsRoot),
            projectBranch.upstreamBranch.remoteURL,
            projectBranch.upstreamBranch.branch);

        await che.workspace.update(currentWorkspace.id, currentWorkspace);
    }

    async deleteGitProjectInWorkspace(projectFolderURI: string) {
        const currentWorkspace = await che.workspace.getCurrentWorkspace();
        if (!currentWorkspace.id) {
            console.error('Unexpected error: current workspace id is not defined');
            return;
        }

        projectshelper.deleteGitProject(currentWorkspace.config.projects,
            fileuri.convertToCheProjectPath(projectFolderURI, this.projectsRoot)
        );

        await che.workspace.update(currentWorkspace.id, currentWorkspace);
    }
}
