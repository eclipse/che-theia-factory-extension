/*********************************************************************
 * Copyright (c) 2018 Red Hat, Inc.
 *
 * This program and the accompanying materials are made
 * available under the terms of the Eclipse Public License 2.0
 * which is available at https://www.eclipse.org/legal/epl-2.0/
 *
 * SPDX-License-Identifier: EPL-2.0
 **********************************************************************/
import { TheiaCloneCommand, TheiaCommand } from './theia-commands';
import { CheFactoryApi, CheFactory } from './che-api';
import * as theia from '@theia/plugin';

export enum ActionId {
    OPEN_FILE = 'openFile',
    RUN_COMMAND = 'runCommand'
}

/**
 * Provides basic Eclipse Che factory features to be executed at startup of the Theia browser IDE:
 * - checking/retrieving factory-id from URL
 * - request che factory api to get the factory definition
 * - clone the projects defined in the factory definition
 * - checkout branch if needed
 */
export class FactoryTheiaClient {

    private readonly cheFactoryApi: CheFactoryApi;

    constructor() {
        this.cheFactoryApi = new CheFactoryApi();
    }

    async onStart() {

        const factory = await this.getFactoryFromCheMaster();
        if (!factory) {
            return;
        }

        console.info("Che Factory setup ...");

        const cloneCommandList = await this.extractCloneCommands(factory);
        const onProjectsImportedCommandList = this.extractOnProjectsImportedCommands(factory);
        // TODO const onAppLoadedCommandList = factory.getOnAppLoadedActions().map(action => new TheiaCommand(action.id, action.parameters));
        // TODO const onAppClosedCommandList = factory.getOnAppLoadedActions().map(action => new TheiaCommand(action.id, action.parameters));
        // TODO register trigger for on appClosed ... onStop method ?
        // - on web app closed

        // TODO await this.executeOnAppLoadedCommands(onAppLoadedCommandList)
        await this.executeCloneCommands(cloneCommandList);
        await this.executeOnProjectsImportedCommands(onProjectsImportedCommandList);

    }

    private async getFactoryFromCheMaster(): Promise<CheFactory | undefined> {
        const factoryId = theia.env.getQueryParameter('factory-id');
        if (!factoryId || typeof factoryId !== 'string') {
            return;
        }
        return await this.cheFactoryApi.retrieveFactoryDefinition(factoryId);
    }

    private async extractCloneCommands(factory: CheFactory) {
        let projectsRoot = '/projects';
        const projectsRootEnvVar = await theia.env.getEnvVariable('CHE_PROJECTS_ROOT');
        if (projectsRootEnvVar) {
            projectsRoot = projectsRootEnvVar;
        }

        const projects = factory.getProjects();
        return projects.map(
            project => new TheiaCloneCommand(
                project.getLocationURI(),
                projectsRoot + project.getPath(),
                project.getCheckoutBranch()
            )
        );
    }

    private extractOnProjectsImportedCommands(factory: CheFactory) {
        return factory
            .getOnProjectsImportedActions()
            .map(action => new TheiaCommand(
                action.getId(),
                action.getProperties()
            ));
    }

    private async executeCloneCommands(cloneCommandList: TheiaCloneCommand[]) {
        await Promise.all(
            cloneCommandList.map(cloneCommand => cloneCommand.execute())
        );
        theia.window.showInformationMessage("Che Factory: Finished clonning projects.");
    }

    private async executeOnProjectsImportedCommands(onProjectImportedCommandList: TheiaCommand[]) {
        await Promise.all(
            onProjectImportedCommandList.map(onProjectImportedCommand => onProjectImportedCommand.execute())
        );
        theia.window.showInformationMessage("Che Factory: Finished executing 'onProjectImported' command actions.");
    }

}
