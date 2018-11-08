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
import { CheWorkspaceApi, CheWorkspace } from './che-api';
import * as theia from '@theia/plugin';
const fs = require('fs');

/**
 * Make synchronization between projects defined in Che workspace and theia projects.
 */
export class CheWorkspaceProjectManager {

    private readonly cheWorkspaceApi: CheWorkspaceApi;

    constructor() {
        this.cheWorkspaceApi = new CheWorkspaceApi();
    }

    async onStart() {
        const workspaceConfig = await this.getCurrentWorkspaceConfigFromCheMaster();
        if (!workspaceConfig) {
            theia.window.showErrorMessage('No Che workspace could be found');
            return;
        }

        const cloneCommandList = await this.selectProjectToCloneCommands(workspaceConfig);
        if (cloneCommandList.length === 0) {
            return;
        }
        await this.executeCloneCommands(cloneCommandList);

    }

    private async getCurrentWorkspaceConfigFromCheMaster(): Promise<CheWorkspace | undefined> {
        return await this.cheWorkspaceApi.retrieveWorkspaceDefinition();
    }

    async selectProjectToCloneCommands(workspaceConfig: CheWorkspace): Promise<TheiaCloneCommand[]> {
        let projectsRoot = '/projects';
        const projectsRootEnvVar = await theia.env.getEnvVariable('CHE_PROJECTS_ROOT');
        if (projectsRootEnvVar) {
            projectsRoot = projectsRootEnvVar;
        }

        const projects = workspaceConfig.getProjects();

        return projects
            .filter(
                project => !fs.existsSync(projectsRoot + project.getPath()))
            .map(
                project => new TheiaCloneCommand(
                    project.getLocationURI(),
                    projectsRoot + project.getPath(),
                    project.getCheckoutBranch()));
    }

    private async executeCloneCommands(cloneCommandList: TheiaCloneCommand[]) {
        theia.window.showInformationMessage("Che Workspace: Starting clonning projects.");
        await Promise.all(
            cloneCommandList.map(cloneCommand => cloneCommand.execute())
        );
        theia.window.showInformationMessage("Che Workspace: Finished clonning projects.");
    }

}
